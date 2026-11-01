/* dq_gate - data quality gate. Every rule is checked and written to audit.DQResult.
   Severity error   -> the task fails, publish is skipped and the watermark is NOT advanced
   DQ05 reconciles the warehouse against the live source system. */
SET NOCOUNT ON;

DECLARE @BatchID int = (SELECT BatchID FROM audit.BatchRun WHERE DagRunID = N'{{ run_id }}');
DECLARE @rules TABLE (RuleID varchar(10), RuleName nvarchar(200), Severity varchar(10), FailedRows bigint);

-- DQ05 inputs: in-scope online orders in the source vs the fact table
DECLARE @src_orders bigint, @src_total money, @dw_orders bigint, @dw_total money;
SELECT @src_orders = COUNT_BIG(*), @src_total = SUM(h.SubTotal)
FROM AdventureWorks2022.Sales.SalesOrderHeader AS h
WHERE h.OnlineOrderFlag = 1
  AND EXISTS (SELECT 1 FROM Dimension.Customer AS c WHERE c.CustomerAlternateKey = h.CustomerID);
SELECT @dw_orders = COUNT_BIG(*), @dw_total = SUM(OrderTotal) FROM Fact.Orders;

INSERT INTO @rules VALUES
 ('DQ01', N'Fact.Orders rows with the unknown customer (-1)', 'error',
     (SELECT COUNT_BIG(*) FROM Fact.Orders WHERE CustomerKey = -1)),
 ('DQ02', N'Customers without exactly one current version', 'error',
     (SELECT COUNT_BIG(*) FROM (SELECT CustomerAlternateKey FROM Dimension.Customer WHERE CustomerKey <> -1
                               GROUP BY CustomerAlternateKey HAVING SUM(CAST(IsCurrent AS int)) <> 1) AS x)),
 ('DQ03', N'Overlapping SCD2 versions', 'error',
     (SELECT COUNT_BIG(*) FROM Dimension.Customer AS a JOIN Dimension.Customer AS b
        ON a.CustomerAlternateKey = b.CustomerAlternateKey AND a.CustomerKey < b.CustomerKey
       AND a.ValidFrom < COALESCE(b.ValidTo, '9999-12-31') AND b.ValidFrom < COALESCE(a.ValidTo, '9999-12-31')
     WHERE a.CustomerKey <> -1)),
 ('DQ04', N'Orders with a zero or negative total', 'error',
     (SELECT COUNT_BIG(*) FROM Fact.Orders WHERE OrderTotal <= 0)),
 ('DQ05', CONCAT(N'Reconciliation with source: ', @src_orders, N' orders / ', @src_total,
                 N' vs warehouse ', @dw_orders, N' / ', @dw_total), 'error',
     ABS(@src_orders - @dw_orders) + CASE WHEN @src_total = @dw_total THEN 0 ELSE 1 END);

INSERT INTO audit.DQResult (BatchID, RuleID, RuleName, Severity, FailedRows, Passed)
SELECT @BatchID, RuleID, RuleName, Severity, FailedRows, CASE WHEN FailedRows = 0 THEN 1 ELSE 0 END FROM @rules;

SELECT RuleID, Severity, FailedRows,
       CASE WHEN FailedRows = 0 THEN N'pass' WHEN Severity = 'error' THEN N'FAIL' ELSE N'warn' END AS Result,
       RuleName
FROM @rules ORDER BY RuleID;

DECLARE @failed nvarchar(2000) =
    (SELECT STRING_AGG(CONCAT(RuleID, N' ', RuleName, N' (', FailedRows, N')'), N'; ')
     FROM @rules WHERE Severity = 'error' AND FailedRows > 0);
DECLARE @note nvarchar(400) = COALESCE(N'FAILED: ' + LEFT(@failed, 380), N'all error rules passed');
EXEC audit.usp_LogStep @DagRunID = N'{{ run_id }}', @TaskID = N'{{ ti.task_id }}', @Note = @note;

IF @failed IS NOT NULL
    THROW 50003, @failed, 1;

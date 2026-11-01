/* load_fact_orders - incremental, idempotent load of Fact.Orders from the staged order changes.
   Grain    : one row per sales order (header level)
   Scope    : online orders of customers in Dimension.Customer; other orders are counted and skipped
   Keys     : DateKey = yyyymmdd of OrderDate
              CustomerKey = the customer VERSION valid at OrderDate (SCD2 point-in-time lookup),
              -1 (unknown member) if no version covers the date
   Idempotent: MERGE on the business key SalesOrderNumber - re-running a batch updates, never duplicates. */
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @BatchID int = (SELECT BatchID FROM audit.BatchRun WHERE DagRunID = N'{{ run_id }}');
DECLARE @staged int = (SELECT COUNT(*) FROM stg.SalesOrderHeader);
DECLARE @actions TABLE (act nvarchar(10));

SELECT h.SalesOrderNumber,
       CONVERT(int, CONVERT(char(8), h.OrderDate, 112)) AS DateKey,
       COALESCE(v.CustomerKey, -1)                      AS CustomerKey,
       h.SubTotal                                       AS OrderTotal,
       h.ModifiedDate
INTO #orders
FROM stg.SalesOrderHeader AS h
OUTER APPLY (
    SELECT TOP (1) d.CustomerKey
    FROM Dimension.Customer AS d
    WHERE d.CustomerAlternateKey = h.CustomerID
      AND h.OrderDate >= d.ValidFrom
      AND (d.ValidTo IS NULL OR h.OrderDate < d.ValidTo)
    ORDER BY d.ValidFrom DESC
) AS v
WHERE h.OnlineOrderFlag = 1
  AND EXISTS (SELECT 1 FROM Dimension.Customer AS c WHERE c.CustomerAlternateKey = h.CustomerID);

DECLARE @in_scope int = @@ROWCOUNT;

MERGE Fact.Orders AS t
USING #orders AS s
   ON t.SalesOrderNumber = s.SalesOrderNumber
WHEN MATCHED AND (t.OrderTotal <> s.OrderTotal OR t.CustomerKey <> s.CustomerKey OR t.DateKey <> s.DateKey) THEN
    UPDATE SET t.OrderTotal = s.OrderTotal, t.CustomerKey = s.CustomerKey, t.DateKey = s.DateKey,
               t.SourceModifiedDate = s.ModifiedDate, t.LoadBatchID = @BatchID
WHEN NOT MATCHED BY TARGET THEN
    INSERT (DateKey, CustomerKey, OrderTotal, SalesOrderNumber, SourceModifiedDate, LoadBatchID)
    VALUES (s.DateKey, s.CustomerKey, s.OrderTotal, s.SalesOrderNumber, s.ModifiedDate, @BatchID)
OUTPUT $action INTO @actions;

DECLARE @ins int = (SELECT COUNT(*) FROM @actions WHERE act = N'INSERT');
DECLARE @upd int = (SELECT COUNT(*) FROM @actions WHERE act = N'UPDATE');
DECLARE @unknown int = (SELECT COUNT(*) FROM #orders WHERE CustomerKey = -1);
DECLARE @note nvarchar(400) = CONCAT(N'staged ', @staged, N', in scope ', @in_scope, N', out of scope ', @staged - @in_scope,
                                     N', unknown customer ', @unknown);
EXEC audit.usp_LogStep @DagRunID = N'{{ run_id }}', @TaskID = N'{{ ti.task_id }}',
     @RowsRead = @staged, @RowsInserted = @ins, @RowsUpdated = @upd, @Note = @note;

PRINT @note;
SELECT @staged AS staged_orders, @in_scope AS in_scope, @ins AS inserted, @upd AS updated,
       @in_scope - @ins - @upd AS unchanged, @unknown AS unknown_customer,
       (SELECT COUNT(*) FROM Fact.Orders) AS fact_rows, (SELECT SUM(OrderTotal) FROM Fact.Orders) AS fact_total;

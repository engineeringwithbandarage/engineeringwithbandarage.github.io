/* check_indexed_view - the indexed view dbo.OrdersByDate (course Chapter 2) is maintained by
   SQL Server on every insert/update of Fact.Orders. Prove it: the materialized rows must equal
   the base-table join. */
SET NOCOUNT ON;

DECLARE @view_rows bigint, @view_total money, @base_rows bigint, @base_total money;

SELECT @view_rows = COUNT_BIG(*), @view_total = SUM(OrderTotal) FROM dbo.OrdersByDate WITH (NOEXPAND);
SELECT @base_rows = COUNT_BIG(*), @base_total = SUM(o.OrderTotal)
FROM Fact.Orders AS o JOIN Dimension.Date AS d ON d.DateKey = o.DateKey;

SELECT @view_rows AS view_rows, @base_rows AS base_rows, @view_total AS view_total, @base_total AS base_total;

DECLARE @note nvarchar(400) = CONCAT(N'view rows ', @view_rows, N' = base rows ', @base_rows);
EXEC audit.usp_LogStep @DagRunID = N'{{ run_id }}', @TaskID = N'{{ ti.task_id }}', @RowsRead = @view_rows, @Note = @note;

IF @view_rows <> @base_rows OR @view_total <> @base_total
    THROW 50002, N'Indexed view dbo.OrdersByDate does not match Fact.Orders', 1;

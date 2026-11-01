/* extract_sales_orders - INCREMENTAL extract of Sales.SalesOrderHeader using a watermark.
   Only rows with ModifiedDate after etl.Watermark.LastValue are copied. The new high-water mark is
   kept as PendingValue and only committed by publish.advance_watermarks at the very end of a
   successful run - so a failed run never skips changes.
   Trigger with {"full_reload": true} to ignore the watermark and extract everything. */
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Source nvarchar(128) = N'AdventureWorks2022.Sales.SalesOrderHeader';
DECLARE @FullReload bit = {{ 1 if params.full_reload else 0 }};
DECLARE @From datetime2(3) =
    CASE WHEN @FullReload = 1 THEN '1900-01-01'
         ELSE (SELECT LastValue FROM etl.Watermark WHERE SourceObject = @Source) END;

TRUNCATE TABLE stg.SalesOrderHeader;

INSERT INTO stg.SalesOrderHeader (SalesOrderID, SalesOrderNumber, OrderDate, CustomerID, OnlineOrderFlag, SubTotal, ModifiedDate)
SELECT h.SalesOrderID, h.SalesOrderNumber, h.OrderDate, h.CustomerID, h.OnlineOrderFlag, h.SubTotal, h.ModifiedDate
FROM AdventureWorks2022.Sales.SalesOrderHeader AS h
WHERE h.ModifiedDate > @From;

DECLARE @rows int = @@ROWCOUNT;

UPDATE etl.Watermark
SET PendingValue = (SELECT MAX(ModifiedDate) FROM stg.SalesOrderHeader), UpdatedAt = SYSDATETIME()
WHERE SourceObject = @Source;

DECLARE @note nvarchar(400) = CONCAT(N'incremental: ModifiedDate > ', CONVERT(nvarchar(23), @From, 121),
                                     CASE WHEN @FullReload = 1 THEN N' (full reload)' ELSE N'' END);
EXEC audit.usp_LogStep @DagRunID = N'{{ run_id }}', @TaskID = N'{{ ti.task_id }}',
     @RowsRead = @rows, @RowsInserted = @rows, @Note = @note;

PRINT CONCAT(N'watermark from ', CONVERT(nvarchar(23), @From, 121), N' -> ', @rows, N' changed orders');
SELECT @From AS watermark_from, PendingValue AS watermark_pending, @rows AS orders_extracted
FROM etl.Watermark WHERE SourceObject = @Source;

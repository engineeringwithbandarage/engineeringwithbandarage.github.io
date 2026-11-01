/* fix_bad_order - the source team corrects the zero-value order. ModifiedDate moves forward, so the
   next pipeline run extracts the corrected row again (the failed run never advanced the watermark). */
SET NOCOUNT ON;
SET XACT_ABORT ON;

UPDATE Sales.SalesOrderHeader
SET SubTotal = 49.99, ModifiedDate = GETDATE()
WHERE Comment = N'SBEcoLTDDW DQ demo: zero-value order' AND SubTotal = 0;

PRINT CONCAT(@@ROWCOUNT, N' order(s) corrected');
SELECT SalesOrderID, SalesOrderNumber, SubTotal, ModifiedDate
FROM Sales.SalesOrderHeader
WHERE Comment = N'SBEcoLTDDW DQ demo: zero-value order';

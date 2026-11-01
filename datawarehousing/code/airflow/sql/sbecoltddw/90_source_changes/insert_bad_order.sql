/* insert_bad_order - a zero-value order: legal in the source (SubTotal >= 0) but against the
   warehouse business rule DQ04 "orders must have a positive total". The next pipeline run
   loads it, the data quality gate fails, and nothing is published. */
SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @CustomerID int = {{ params.customer_id }};
DECLARE @new TABLE (SalesOrderID int, SalesOrderNumber nvarchar(25), OrderDate datetime, SubTotal money);

INSERT INTO Sales.SalesOrderHeader
    (RevisionNumber, OrderDate, DueDate, ShipDate, Status, OnlineOrderFlag, AccountNumber, CustomerID,
     TerritoryID, BillToAddressID, ShipToAddressID, ShipMethodID, CreditCardID, CreditCardApprovalCode,
     SubTotal, TaxAmt, Freight, Comment, ModifiedDate)
OUTPUT inserted.SalesOrderID, inserted.SalesOrderNumber, inserted.OrderDate, inserted.SubTotal INTO @new
SELECT TOP (1) 1, GETDATE(), DATEADD(day, 12, GETDATE()), DATEADD(day, 7, GETDATE()), 5, 1, h.AccountNumber, h.CustomerID,
       h.TerritoryID, h.BillToAddressID, h.ShipToAddressID, h.ShipMethodID, h.CreditCardID, h.CreditCardApprovalCode,
       0.00, 0.00, 0.00, N'SBEcoLTDDW DQ demo: zero-value order', GETDATE()
FROM Sales.SalesOrderHeader AS h
WHERE h.CustomerID = @CustomerID
ORDER BY h.SalesOrderID DESC;

SELECT * FROM @new;

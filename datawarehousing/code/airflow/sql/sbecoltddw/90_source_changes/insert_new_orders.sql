/* insert_new_orders - the customer places new online orders (an incremental change).
   Copies their latest order with today's date; ModifiedDate = now, so the watermark picks them up. */
SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @CustomerID int = {{ params.customer_id }}, @n int = {{ params.new_orders }};
DECLARE @new TABLE (SalesOrderID int, SalesOrderNumber nvarchar(25), OrderDate datetime, SubTotal money);

INSERT INTO Sales.SalesOrderHeader
    (RevisionNumber, OrderDate, DueDate, ShipDate, Status, OnlineOrderFlag, AccountNumber, CustomerID,
     TerritoryID, BillToAddressID, ShipToAddressID, ShipMethodID, CreditCardID, CreditCardApprovalCode,
     SubTotal, TaxAmt, Freight, Comment, ModifiedDate)
OUTPUT inserted.SalesOrderID, inserted.SalesOrderNumber, inserted.OrderDate, inserted.SubTotal INTO @new
SELECT 1, GETDATE(), DATEADD(day, 12, GETDATE()), DATEADD(day, 7, GETDATE()), 5, 1, h.AccountNumber, h.CustomerID,
       h.TerritoryID, h.BillToAddressID, h.ShipToAddressID, h.ShipMethodID, h.CreditCardID, h.CreditCardApprovalCode,
       h.SubTotal + n.i, h.TaxAmt, h.Freight, N'SBEcoLTDDW demo: new order', GETDATE()
FROM (SELECT TOP (1) * FROM Sales.SalesOrderHeader WHERE CustomerID = @CustomerID ORDER BY SalesOrderID DESC) AS h
CROSS JOIN (SELECT TOP (@n) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS i FROM sys.all_objects) AS n;

PRINT CONCAT(@@ROWCOUNT, N' new orders for customer ', @CustomerID);
SELECT * FROM @new ORDER BY SalesOrderID;

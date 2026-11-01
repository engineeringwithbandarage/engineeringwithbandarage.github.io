/* show_customer - the demo customer in the SOURCE system: home address and latest orders */
SET NOCOUNT ON;
DECLARE @CustomerID int = {{ params.customer_id }};

SELECT c.CustomerID, p.FirstName, p.LastName, a.AddressID, a.City, sp.StateProvinceCode AS State, a.PostalCode,
       a.ModifiedDate AS address_modified
FROM Sales.Customer AS c
JOIN Person.Person AS p                 ON p.BusinessEntityID = c.PersonID
JOIN Person.BusinessEntityAddress AS bea ON bea.BusinessEntityID = p.BusinessEntityID
JOIN Person.AddressType AS at           ON at.AddressTypeID = bea.AddressTypeID AND at.Name = N'Home'
JOIN Person.Address AS a                ON a.AddressID = bea.AddressID
JOIN Person.StateProvince AS sp         ON sp.StateProvinceID = a.StateProvinceID
WHERE c.CustomerID = @CustomerID;

SELECT TOP (6) SalesOrderID, SalesOrderNumber, OrderDate, SubTotal, ModifiedDate, Comment
FROM Sales.SalesOrderHeader
WHERE CustomerID = @CustomerID
ORDER BY SalesOrderID DESC;

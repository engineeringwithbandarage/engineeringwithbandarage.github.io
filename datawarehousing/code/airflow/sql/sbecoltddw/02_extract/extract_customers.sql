/* extract_customers - FULL extract from AdventureWorks2022 into stg.Customer.
   Scope: individual customers (no store) with a US home address - 7,819 rows in the sample.
   Small, slowly changing data is cheapest to extract in full; the SCD2 load works out what changed. */
SET NOCOUNT ON;
SET XACT_ABORT ON;

TRUNCATE TABLE stg.Customer;

INSERT INTO stg.Customer (CustomerID, FirstName, LastName, City, StateCode, StateName, PostalCode, SourceModifiedDate)
SELECT c.CustomerID,
       p.FirstName,
       p.LastName,
       a.City,
       RTRIM(sp.StateProvinceCode),
       sp.Name,
       LEFT(a.PostalCode, 5),
       (SELECT MAX(m) FROM (VALUES (c.ModifiedDate), (p.ModifiedDate), (a.ModifiedDate)) AS x(m))
FROM AdventureWorks2022.Sales.Customer AS c
JOIN AdventureWorks2022.Person.Person AS p                 ON p.BusinessEntityID = c.PersonID
JOIN AdventureWorks2022.Person.BusinessEntityAddress AS bea ON bea.BusinessEntityID = p.BusinessEntityID
JOIN AdventureWorks2022.Person.AddressType AS at           ON at.AddressTypeID = bea.AddressTypeID AND at.Name = N'Home'
JOIN AdventureWorks2022.Person.Address AS a                ON a.AddressID = bea.AddressID
JOIN AdventureWorks2022.Person.StateProvince AS sp         ON sp.StateProvinceID = a.StateProvinceID
WHERE c.StoreID IS NULL
  AND sp.CountryRegionCode = N'US';

DECLARE @rows int = @@ROWCOUNT;
EXEC audit.usp_LogStep @DagRunID = N'{{ run_id }}', @TaskID = N'{{ ti.task_id }}',
     @RowsRead = @rows, @RowsInserted = @rows, @Note = N'full extract: US individual customers';

PRINT CONCAT(N'staged customers: ', @rows);
SELECT COUNT(*) AS staged_customers, MAX(SourceModifiedDate) AS latest_source_change FROM stg.Customer;

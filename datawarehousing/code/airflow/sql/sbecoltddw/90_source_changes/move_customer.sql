/* move_customer - the customer moves house (an SCD Type 2 change in the warehouse).
   Toggles between Seattle WA and Portland OR so the scenario can be repeated. */
SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @CustomerID int = {{ params.customer_id }};

DECLARE @AddressID int = (
    SELECT a.AddressID
    FROM Sales.Customer AS c
    JOIN Person.BusinessEntityAddress AS bea ON bea.BusinessEntityID = c.PersonID
    JOIN Person.AddressType AS at           ON at.AddressTypeID = bea.AddressTypeID AND at.Name = N'Home'
    JOIN Person.Address AS a                ON a.AddressID = bea.AddressID
    WHERE c.CustomerID = @CustomerID);

IF @AddressID IS NULL
    THROW 50010, N'The demo customer has no home address', 1;

DECLARE @City nvarchar(30), @State nchar(3), @Zip nvarchar(15), @Street nvarchar(60);
IF (SELECT City FROM Person.Address WHERE AddressID = @AddressID) = N'Seattle'
    SELECT @City = N'Portland', @State = N'OR', @Zip = N'97205', @Street = N'1120 SW 5th Ave';
ELSE
    SELECT @City = N'Seattle',  @State = N'WA', @Zip = N'98104', @Street = N'600 4th Ave';

SELECT N'before' AS stage, AddressLine1, City, PostalCode, ModifiedDate FROM Person.Address WHERE AddressID = @AddressID;

UPDATE Person.Address
SET AddressLine1    = @Street,
    City            = @City,
    StateProvinceID = (SELECT StateProvinceID FROM Person.StateProvince
                       WHERE StateProvinceCode = @State AND CountryRegionCode = N'US'),
    PostalCode      = @Zip,
    ModifiedDate    = GETDATE()
WHERE AddressID = @AddressID;

PRINT CONCAT(N'customer ', @CustomerID, N' moved to ', @City, N' ', RTRIM(@State));
SELECT N'after' AS stage, AddressLine1, City, PostalCode, ModifiedDate FROM Person.Address WHERE AddressID = @AddressID;

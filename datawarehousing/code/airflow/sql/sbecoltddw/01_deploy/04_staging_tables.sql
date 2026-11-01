/* deploy 04 - staging tables (idempotent). Staging holds the data of ONE run only. */
SET NOCOUNT ON;

IF OBJECT_ID(N'stg.Customer') IS NULL
CREATE TABLE stg.Customer (
    CustomerID         int NOT NULL,               -- AdventureWorks2022 Sales.Customer.CustomerID
    FirstName          nvarchar(50) NOT NULL,
    LastName           nvarchar(50) NOT NULL,
    City               nvarchar(30) NOT NULL,
    StateCode          char(2) NOT NULL,
    StateName          nvarchar(50) NOT NULL,
    PostalCode         char(5) NOT NULL,
    SourceModifiedDate datetime2(3) NOT NULL       -- latest change across Customer / Person / Address
);

IF OBJECT_ID(N'stg.SalesOrderHeader') IS NULL
CREATE TABLE stg.SalesOrderHeader (
    SalesOrderID     int NOT NULL,
    SalesOrderNumber nvarchar(25) NOT NULL,
    OrderDate        datetime NOT NULL,
    CustomerID       int NOT NULL,
    OnlineOrderFlag  bit NOT NULL,
    SubTotal         money NOT NULL,
    ModifiedDate     datetime NOT NULL
);

SELECT s.name + N'.' + t.name AS staging_table
FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name = N'stg' ORDER BY t.name;

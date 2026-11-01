/* deploy 05 - extend the course tables for the pipeline (idempotent)
   Dimension.Customer  + SCD Type 2 columns: ValidFrom, ValidTo, IsCurrent, RowHash, LoadBatchID
   Fact.Orders         + SalesOrderNumber (business key for idempotent MERGE), SourceModifiedDate, LoadBatchID
   Indexes that use the new columns are created with EXEC so this batch compiles before they exist. */
SET NOCOUNT ON;

IF COL_LENGTH(N'Dimension.Customer', N'ValidFrom') IS NULL
    ALTER TABLE Dimension.Customer ADD
        ValidFrom   datetime2(3) NOT NULL CONSTRAINT DF_Customer_ValidFrom DEFAULT ('1900-01-01'),
        ValidTo     datetime2(3) NULL,
        IsCurrent   bit NOT NULL CONSTRAINT DF_Customer_IsCurrent DEFAULT (1),
        RowHash     varbinary(32) NULL,
        LoadBatchID int NULL;

IF COL_LENGTH(N'Fact.Orders', N'SalesOrderNumber') IS NULL
    ALTER TABLE Fact.Orders ADD
        SalesOrderNumber   nvarchar(25) NULL,
        SourceModifiedDate datetime NULL,
        LoadBatchID        int NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Customer_AlternateKey')
    EXEC (N'CREATE NONCLUSTERED INDEX IX_Customer_AlternateKey
            ON Dimension.Customer (CustomerAlternateKey, ValidFrom)
            INCLUDE (ValidTo, IsCurrent, RowHash);');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Orders_SalesOrderNumber')
    EXEC (N'CREATE UNIQUE NONCLUSTERED INDEX UX_Orders_SalesOrderNumber
            ON Fact.Orders (SalesOrderNumber) WHERE SalesOrderNumber IS NOT NULL;');

SELECT OBJECT_SCHEMA_NAME(object_id) + N'.' + OBJECT_NAME(object_id) AS table_name, name AS column_name, TYPE_NAME(user_type_id) AS data_type
FROM sys.columns
WHERE object_id IN (OBJECT_ID(N'Dimension.Customer'), OBJECT_ID(N'Fact.Orders'))
  AND name IN (N'ValidFrom', N'ValidTo', N'IsCurrent', N'RowHash', N'LoadBatchID', N'SalesOrderNumber', N'SourceModifiedDate')
ORDER BY table_name, column_id;

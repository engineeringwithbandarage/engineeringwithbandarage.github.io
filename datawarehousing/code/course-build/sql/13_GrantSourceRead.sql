-- The Airflow pipeline runs as DataLoader (Resource Governor group DataLoads) and extracts from
-- AdventureWorks2022 (sales OLTP). Read-only access only.
USE AdventureWorks2022;
GO
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'DataLoader')
    CREATE USER DataLoader FOR LOGIN DataLoader;
ALTER ROLE db_datareader ADD MEMBER DataLoader;
GO
SELECT DB_NAME() AS source_db, IS_ROLEMEMBER('db_datareader', 'DataLoader') AS datareader;
GO


/* deploy 01 - pipeline schemas (idempotent)
   stg    landing copies of source data, emptied at the start of every load
   etl    pipeline control data (watermarks)
   audit  run, step and data-quality logs
   rpt    reporting views for consumers
   All are owned by dbo, like the course's Fact and Dimension schemas. One owner keeps the
   ownership chain unbroken, so readers granted SELECT on rpt need no rights on the tables.
   (A schema created without AUTHORIZATION is owned by whoever ran CREATE SCHEMA - here
   DataLoader - so existing schemas are handed to dbo as well.) */
SET NOCOUNT ON;
IF SCHEMA_ID(N'stg')   IS NULL EXEC (N'CREATE SCHEMA stg AUTHORIZATION dbo');
IF SCHEMA_ID(N'etl')   IS NULL EXEC (N'CREATE SCHEMA etl AUTHORIZATION dbo');
IF SCHEMA_ID(N'audit') IS NULL EXEC (N'CREATE SCHEMA audit AUTHORIZATION dbo');
IF SCHEMA_ID(N'rpt')   IS NULL EXEC (N'CREATE SCHEMA rpt AUTHORIZATION dbo');

DECLARE @s sysname, @sql nvarchar(200);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR
    SELECT name FROM sys.schemas
    WHERE name IN (N'stg', N'etl', N'audit', N'rpt') AND principal_id <> USER_ID(N'dbo');
OPEN c;
FETCH NEXT FROM c INTO @s;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = N'ALTER AUTHORIZATION ON SCHEMA::' + QUOTENAME(@s) + N' TO dbo';
    EXEC (@sql);
    PRINT CONCAT(N'schema ', @s, N' now owned by dbo');
    FETCH NEXT FROM c INTO @s;
END;
CLOSE c; DEALLOCATE c;

SELECT s.name AS schema_name, USER_NAME(s.principal_id) AS owner
FROM sys.schemas AS s
WHERE s.name IN (N'stg', N'etl', N'audit', N'rpt', N'Fact', N'Dimension')
ORDER BY s.name;

-- The course targets Azure Synapse, where a WORKLOAD CLASSIFIER routes the DataLoader user to a
-- workload group. Box SQL Server does the same job with Resource Governor:
--   Synapse workload group      ->  resource pool + workload group
--   Synapse workload classifier ->  classifier function (runs at login, returns the group name)
-- Changes: the password comes from the runner (DL_PASSWORD, stored in ~/sbecoltddw/.dataloader.env)
--          instead of 'MyStrongPassword1'; DataWarehouseName is SBEcoLTDDW.
--          No ADMINISTER BULK OPERATIONS: it isn't supported on Linux, so step 10 uses bcp.

-- Create a SQL Server authentication login in the master database
USE master;
GO

IF NOT EXISTS (SELECT * FROM sys.sql_logins WHERE name = 'DataLoader')
BEGIN
CREATE LOGIN DataLoader WITH PASSWORD = '$(DL_PASSWORD)', DEFAULT_DATABASE = SBEcoLTDDW, CHECK_POLICY = ON
END
;
ALTER LOGIN DataLoader WITH DEFAULT_DATABASE = SBEcoLTDDW;   -- also for a login created by an earlier build
REVOKE ADMINISTER BULK OPERATIONS FROM DataLoader;   -- removes the grant from the first build attempt
GO

-- Create the database user and link to the new login on the data warehouse database
USE SBEcoLTDDW;
GO

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'DataLoader')
BEGIN
CREATE USER DataLoader FOR LOGIN DataLoader
GRANT CONTROL ON DATABASE::SBEcoLTDDW TO DataLoader
END
;
GO

-- Resource Governor: a pool and workload group for data loads
USE master;
GO

IF NOT EXISTS (SELECT * FROM sys.resource_governor_resource_pools WHERE name = 'DataLoadPool')
    CREATE RESOURCE POOL DataLoadPool
        WITH (MIN_CPU_PERCENT = 0, MAX_CPU_PERCENT = 80, MIN_MEMORY_PERCENT = 0, MAX_MEMORY_PERCENT = 60);
GO

IF NOT EXISTS (SELECT * FROM sys.resource_governor_workload_groups WHERE name = 'DataLoads')
    CREATE WORKLOAD GROUP DataLoads
        WITH (IMPORTANCE = HIGH, REQUEST_MAX_MEMORY_GRANT_PERCENT = 50, MAX_DOP = 2)
        USING DataLoadPool;
GO

-- An active classifier function can't be altered, so detach it first on a re-run
IF EXISTS (SELECT * FROM sys.resource_governor_configuration
           WHERE classifier_function_id = OBJECT_ID('master.dbo.fn_SBEcoLTDClassifier'))
BEGIN
    ALTER RESOURCE GOVERNOR WITH (CLASSIFIER_FUNCTION = NULL);
    ALTER RESOURCE GOVERNOR RECONFIGURE;
END
GO

-- Classifier: sessions of the DataLoader login go to DataLoads, everything else to default
CREATE OR ALTER FUNCTION dbo.fn_SBEcoLTDClassifier()
RETURNS sysname
WITH SCHEMABINDING
AS
BEGIN
    DECLARE @group sysname = N'default';
    IF SUSER_SNAME() = N'DataLoader'
        SET @group = N'DataLoads';
    RETURN @group;
END;
GO

ALTER RESOURCE GOVERNOR WITH (CLASSIFIER_FUNCTION = dbo.fn_SBEcoLTDClassifier);
ALTER RESOURCE GOVERNOR RECONFIGURE;
GO

SELECT is_enabled, OBJECT_NAME(classifier_function_id) AS classifier_function
FROM sys.resource_governor_configuration;

SELECT g.name AS workload_group, p.name AS resource_pool, g.importance, g.request_max_memory_grant_percent, g.max_dop
FROM sys.resource_governor_workload_groups AS g
JOIN sys.resource_governor_resource_pools AS p ON p.pool_id = g.pool_id
WHERE g.name IN ('DataLoads', 'default');
GO

-- Not in the course files (the course creates the database in SSMS before Chapter 2).
-- Set REBUILD=1 in the runner to drop and recreate an existing SBEcoLTDDW.
USE master;
GO

IF DB_ID('SBEcoLTDDW') IS NOT NULL AND '$(REBUILD)' = '1'
BEGIN
    ALTER DATABASE SBEcoLTDDW SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE SBEcoLTDDW;
    PRINT 'Dropped existing SBEcoLTDDW (REBUILD=1)';
END
GO

IF DB_ID('SBEcoLTDDW') IS NOT NULL
    RAISERROR('SBEcoLTDDW already exists - run with REBUILD=1 to recreate it', 16, 1);
GO

CREATE DATABASE SBEcoLTDDW;
GO
ALTER DATABASE SBEcoLTDDW SET RECOVERY SIMPLE;
GO

SELECT name, recovery_model_desc, create_date FROM sys.databases WHERE name = 'SBEcoLTDDW';
GO

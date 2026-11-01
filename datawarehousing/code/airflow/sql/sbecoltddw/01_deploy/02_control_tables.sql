/* deploy 02 - control and audit tables (idempotent) */
SET NOCOUNT ON;

IF OBJECT_ID(N'audit.BatchRun') IS NULL
CREATE TABLE audit.BatchRun (
    BatchID     int IDENTITY(1,1) NOT NULL CONSTRAINT PK_BatchRun PRIMARY KEY,
    DagID       nvarchar(250) NOT NULL,
    DagRunID    nvarchar(250) NOT NULL CONSTRAINT UQ_BatchRun_DagRunID UNIQUE,
    LogicalDate datetimeoffset(0) NULL,
    FullReload  bit NOT NULL CONSTRAINT DF_BatchRun_FullReload DEFAULT 0,
    Status      nvarchar(20) NOT NULL,              -- Running / Succeeded / Failed
    Attempts    int NOT NULL CONSTRAINT DF_BatchRun_Attempts DEFAULT 1,
    StartedAt   datetime2(3) NOT NULL,
    EndedAt     datetime2(3) NULL
);

IF OBJECT_ID(N'audit.StepLog') IS NULL
CREATE TABLE audit.StepLog (
    StepID          int IDENTITY(1,1) NOT NULL CONSTRAINT PK_StepLog PRIMARY KEY,
    BatchID         int NULL,
    TaskID          nvarchar(250) NOT NULL,
    RowsRead        int NULL,
    RowsInserted    int NULL,
    RowsUpdated     int NULL,
    RowsDeleted     int NULL,
    Note            nvarchar(400) NULL,
    LoginName       sysname NOT NULL,
    WorkloadGroupID int NULL,                      -- Resource Governor group of the session
    LoggedAt        datetime2(3) NOT NULL CONSTRAINT DF_StepLog_LoggedAt DEFAULT SYSDATETIME()
);

IF OBJECT_ID(N'audit.DQResult') IS NULL
CREATE TABLE audit.DQResult (
    DQResultID int IDENTITY(1,1) NOT NULL CONSTRAINT PK_DQResult PRIMARY KEY,
    BatchID    int NULL,
    RuleID     varchar(10) NOT NULL,
    RuleName   nvarchar(200) NOT NULL,
    Severity   varchar(10) NOT NULL,               -- error = stops the pipeline, warning = reported
    FailedRows bigint NOT NULL,
    Passed     bit NOT NULL,
    CheckedAt  datetime2(3) NOT NULL CONSTRAINT DF_DQResult_CheckedAt DEFAULT SYSDATETIME()
);

IF OBJECT_ID(N'etl.Watermark') IS NULL
CREATE TABLE etl.Watermark (
    SourceObject    nvarchar(128) NOT NULL CONSTRAINT PK_Watermark PRIMARY KEY,
    WatermarkColumn sysname NOT NULL,
    LastValue       datetime2(3) NOT NULL,         -- rows changed after this were not loaded yet
    PendingValue    datetime2(3) NULL,             -- high-water mark of the current run, committed at the end
    UpdatedAt       datetime2(3) NOT NULL CONSTRAINT DF_Watermark_UpdatedAt DEFAULT SYSDATETIME()
);

IF NOT EXISTS (SELECT 1 FROM etl.Watermark WHERE SourceObject = N'AdventureWorks2022.Sales.SalesOrderHeader')
    INSERT INTO etl.Watermark (SourceObject, WatermarkColumn, LastValue)
    VALUES (N'AdventureWorks2022.Sales.SalesOrderHeader', N'ModifiedDate', '1900-01-01');

SELECT SourceObject, WatermarkColumn, LastValue, PendingValue FROM etl.Watermark;

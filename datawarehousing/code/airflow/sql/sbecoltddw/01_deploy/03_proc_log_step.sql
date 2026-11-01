/* deploy 03 - audit.usp_LogStep: every load step records what it did */
CREATE OR ALTER PROCEDURE audit.usp_LogStep
    @DagRunID     nvarchar(250),
    @TaskID       nvarchar(250),
    @RowsRead     int = NULL,
    @RowsInserted int = NULL,
    @RowsUpdated  int = NULL,
    @RowsDeleted  int = NULL,
    @Note         nvarchar(400) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO audit.StepLog (BatchID, TaskID, RowsRead, RowsInserted, RowsUpdated, RowsDeleted, Note, LoginName, WorkloadGroupID)
    SELECT (SELECT BatchID FROM audit.BatchRun WHERE DagRunID = @DagRunID),
           @TaskID, @RowsRead, @RowsInserted, @RowsUpdated, @RowsDeleted, @Note,
           ORIGINAL_LOGIN(),
           (SELECT group_id FROM sys.dm_exec_sessions WHERE session_id = @@SPID);
END;

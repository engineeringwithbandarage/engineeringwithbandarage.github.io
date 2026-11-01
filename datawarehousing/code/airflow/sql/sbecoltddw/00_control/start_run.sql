/* start_run - register this Airflow run in audit.BatchRun.
   Airflow fills in {{ '{{ run_id }}' }} etc. when it renders this file; clearing and re-running
   the same DAG run reuses its row and counts the attempt. */
SET NOCOUNT ON;
DECLARE @DagRunID nvarchar(250) = N'{{ run_id }}';

IF EXISTS (SELECT 1 FROM audit.BatchRun WHERE DagRunID = @DagRunID)
    UPDATE audit.BatchRun
    SET Status = N'Running', StartedAt = SYSDATETIME(), EndedAt = NULL, Attempts = Attempts + 1
    WHERE DagRunID = @DagRunID;
ELSE
    INSERT INTO audit.BatchRun (DagID, DagRunID, LogicalDate, FullReload, Status, StartedAt)
    VALUES (N'{{ dag.dag_id }}', @DagRunID, N'{{ ts }}', {{ 1 if params.full_reload else 0 }}, N'Running', SYSDATETIME());

PRINT CONCAT(N'batch registered for run ', @DagRunID);
SELECT BatchID, DagID, DagRunID, FullReload, Status, Attempts, StartedAt
FROM audit.BatchRun WHERE DagRunID = @DagRunID;

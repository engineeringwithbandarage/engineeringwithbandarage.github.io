/* end_run - close the batch as Succeeded and show its step log */
SET NOCOUNT ON;
DECLARE @DagRunID nvarchar(250) = N'{{ run_id }}';

UPDATE audit.BatchRun SET Status = N'Succeeded', EndedAt = SYSDATETIME() WHERE DagRunID = @DagRunID;

SELECT BatchID, Status, StartedAt, EndedAt, DATEDIFF(second, StartedAt, EndedAt) AS seconds
FROM audit.BatchRun WHERE DagRunID = @DagRunID;

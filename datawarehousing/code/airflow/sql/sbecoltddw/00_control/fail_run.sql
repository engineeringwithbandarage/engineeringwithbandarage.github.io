/* fail_run - runs only when a task upstream failed: mark the batch Failed.
   Watermarks were not advanced, so the next run picks up the same changes again. */
SET NOCOUNT ON;
DECLARE @DagRunID nvarchar(250) = N'{{ run_id }}';

UPDATE audit.BatchRun SET Status = N'Failed', EndedAt = SYSDATETIME() WHERE DagRunID = @DagRunID;

SELECT BatchID, Status, StartedAt, EndedAt FROM audit.BatchRun WHERE DagRunID = @DagRunID;
SELECT SourceObject, LastValue AS watermark_kept, PendingValue AS not_committed FROM etl.Watermark;

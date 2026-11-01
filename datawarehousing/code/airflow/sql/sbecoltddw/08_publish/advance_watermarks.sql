/* advance_watermarks - the run passed every gate: commit the pending high-water marks.
   Only now will the next run start after this run's changes. */
SET NOCOUNT ON;

SELECT SourceObject, LastValue AS old_watermark, PendingValue AS new_watermark FROM etl.Watermark;

UPDATE etl.Watermark
SET LastValue = PendingValue, PendingValue = NULL, UpdatedAt = SYSDATETIME()
WHERE PendingValue IS NOT NULL AND PendingValue > LastValue;
DECLARE @moved int = @@ROWCOUNT;

UPDATE etl.Watermark SET PendingValue = NULL WHERE PendingValue IS NOT NULL;   -- nothing new this run

EXEC audit.usp_LogStep @DagRunID = N'{{ run_id }}', @TaskID = N'{{ ti.task_id }}', @RowsUpdated = @moved;

SELECT SourceObject, LastValue AS watermark_now FROM etl.Watermark;

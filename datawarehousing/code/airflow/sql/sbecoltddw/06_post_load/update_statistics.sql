/* update_statistics - fresh statistics after the load so the optimizer sees the new row counts */
SET NOCOUNT ON;

UPDATE STATISTICS Fact.Orders;
UPDATE STATISTICS Dimension.Customer;
UPDATE STATISTICS Dimension.Date;

EXEC audit.usp_LogStep @DagRunID = N'{{ run_id }}', @TaskID = N'{{ ti.task_id }}', @Note = N'Fact.Orders, Dimension.Customer, Dimension.Date';

SELECT OBJECT_SCHEMA_NAME(s.object_id) + N'.' + OBJECT_NAME(s.object_id) AS table_name,
       COUNT(*) AS stats_objects, MAX(sp.last_updated) AS last_updated, MAX(sp.rows) AS rows
FROM sys.stats AS s
CROSS APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) AS sp
WHERE s.object_id IN (OBJECT_ID(N'Fact.Orders'), OBJECT_ID(N'Dimension.Customer'), OBJECT_ID(N'Dimension.Date'))
GROUP BY s.object_id;

/* maintain_columnstore - compress open delta row groups of IX_CS_FactOrders (course Chapter 3).
   New rows land in an uncompressed delta row group (OPEN) when a load has fewer than
   102,400 rows per thread - e.g. the 9,567 orders of the first load, or 3 new orders later.
   REORGANIZE with COMPRESS_ALL_ROW_GROUPS turns them into compressed column segments, online;
   the old delta stores become TOMBSTONEs that are cleaned up later. */
SET NOCOUNT ON;

SELECT N'before' AS stage, state_desc, COUNT(*) AS row_groups, SUM(total_rows) AS total_rows, SUM(size_in_bytes) / 1024 AS size_kb
FROM sys.dm_db_column_store_row_group_physical_stats
WHERE object_id = OBJECT_ID(N'Fact.Orders') AND index_id = (SELECT index_id FROM sys.indexes WHERE name = N'IX_CS_FactOrders')
GROUP BY state_desc;

ALTER INDEX IX_CS_FactOrders ON Fact.Orders REORGANIZE WITH (COMPRESS_ALL_ROW_GROUPS = ON);

SELECT N'after' AS stage, state_desc, COUNT(*) AS row_groups, SUM(total_rows) AS total_rows, SUM(size_in_bytes) / 1024 AS size_kb
FROM sys.dm_db_column_store_row_group_physical_stats
WHERE object_id = OBJECT_ID(N'Fact.Orders') AND index_id = (SELECT index_id FROM sys.indexes WHERE name = N'IX_CS_FactOrders')
GROUP BY state_desc;

EXEC audit.usp_LogStep @DagRunID = N'{{ run_id }}', @TaskID = N'{{ ti.task_id }}', @Note = N'REORGANIZE COMPRESS_ALL_ROW_GROUPS: IX_CS_FactOrders';
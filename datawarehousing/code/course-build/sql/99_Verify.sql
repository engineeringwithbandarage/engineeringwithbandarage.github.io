USE SBEcoLTDDW;
GO
SET NOCOUNT ON;
GO

PRINT '--- tables and row counts';
SELECT s.name AS schema_name, t.name AS table_name, t.is_memory_optimized,
       SUM(CASE WHEN p.index_id IN (0, 1) THEN p.rows END) AS row_count
FROM sys.tables AS t
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
LEFT JOIN sys.partitions AS p ON p.object_id = t.object_id
GROUP BY s.name, t.name, t.is_memory_optimized
ORDER BY s.name, t.name;

PRINT '--- indexes';
SELECT OBJECT_SCHEMA_NAME(i.object_id) + '.' + OBJECT_NAME(i.object_id) AS object_name,
       i.name AS index_name, i.type_desc, i.is_unique
FROM sys.indexes AS i
WHERE OBJECT_SCHEMA_NAME(i.object_id) IN ('Fact', 'Dimension', 'dbo') AND i.name IS NOT NULL
ORDER BY object_name, i.index_id;

PRINT '--- foreign keys';
SELECT name, OBJECT_NAME(parent_object_id) AS child_table, OBJECT_NAME(referenced_object_id) AS parent_table, is_not_trusted
FROM sys.foreign_keys;

PRINT '--- orphan check (should be 0 and 0)';
SELECT (SELECT COUNT(*) FROM Fact.Orders o WHERE NOT EXISTS (SELECT 1 FROM Dimension.Date d WHERE d.DateKey = o.DateKey))         AS orphan_dates,
       (SELECT COUNT(*) FROM Fact.Orders o WHERE NOT EXISTS (SELECT 1 FROM Dimension.Customer c WHERE c.CustomerKey = o.CustomerKey)) AS orphan_customers;

PRINT '--- star query: sales by year (uses the indexed view)';
SELECT v.Year, COUNT(*) AS orders, SUM(v.OrderTotal) AS sales
FROM dbo.OrdersByDate AS v WITH (NOEXPAND)
GROUP BY v.Year
ORDER BY v.Year;

PRINT '--- star query: top 5 states by sales (uses the columnstore)';
SELECT TOP (5) c.Statename, COUNT(*) AS orders, SUM(o.OrderTotal) AS sales
FROM Fact.Orders AS o
JOIN Dimension.Customer AS c ON c.CustomerKey = o.CustomerKey
GROUP BY c.Statename
ORDER BY sales DESC;
GO

PRINT '--- Resource Governor: requests handled by each workload group since the last reconfigure';
SELECT name AS workload_group, total_request_count, total_cpu_usage_ms
FROM sys.dm_resource_governor_workload_groups
WHERE name IN ('DataLoads', 'default');

SELECT name, group_id FROM sys.resource_governor_workload_groups WHERE name = 'DataLoads';
GO

PRINT '--- database files';
SELECT name, type_desc, physical_name, size * 8 / 1024 AS size_mb FROM sys.database_files;
GO

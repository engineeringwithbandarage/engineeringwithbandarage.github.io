USE SBEcoLTDDW;
GO

ALTER INDEX IX_CS_FactOrders
   ON Fact.Orders
   REBUILD WITH (ONLINE = ON);
GO

SELECT i.name AS index_name, i.type_desc, rg.state_desc, COUNT(*) AS row_groups, SUM(rg.total_rows) AS total_rows
FROM sys.indexes AS i
JOIN sys.dm_db_column_store_row_group_physical_stats AS rg
     ON rg.object_id = i.object_id AND rg.index_id = i.index_id
WHERE i.name = 'IX_CS_FactOrders'
GROUP BY i.name, i.type_desc, rg.state_desc;
GO

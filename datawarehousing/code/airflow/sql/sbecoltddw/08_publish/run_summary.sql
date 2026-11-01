/* run_summary - what this run did, step by step, and the headline numbers consumers will see */
SET NOCOUNT ON;

SELECT TaskID, RowsRead, RowsInserted, RowsUpdated, RowsDeleted, LoginName, WorkloadGroupID, Note
FROM rpt.vLoadHistory
WHERE DagRunID = N'{{ run_id }}'
ORDER BY LoggedAt;

SELECT TOP (5) Year, MonthName, Orders, Sales FROM rpt.vSalesByMonth ORDER BY Sales DESC;

SELECT (SELECT COUNT(*) FROM Fact.Orders)                                        AS fact_orders,
       (SELECT SUM(OrderTotal) FROM Fact.Orders)                                 AS fact_total,
       (SELECT COUNT(*) FROM Dimension.Customer WHERE CustomerKey <> -1)         AS customer_versions,
       (SELECT COUNT(*) FROM Dimension.Customer WHERE CustomerKey <> -1 AND IsCurrent = 1) AS customers;

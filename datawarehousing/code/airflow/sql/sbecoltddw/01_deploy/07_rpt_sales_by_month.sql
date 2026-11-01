/* deploy 07 - rpt.vSalesByMonth: monthly sales, read from the indexed view dbo.OrdersByDate */
CREATE OR ALTER VIEW rpt.vSalesByMonth
AS
SELECT v.Year,
       v.MonthNumber,
       v.MonthName,
       COUNT_BIG(*)      AS Orders,
       SUM(v.OrderTotal) AS Sales
FROM dbo.OrdersByDate AS v WITH (NOEXPAND)
GROUP BY v.Year, v.MonthNumber, v.MonthName;

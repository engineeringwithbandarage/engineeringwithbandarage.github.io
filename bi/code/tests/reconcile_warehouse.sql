-- The same question as reconcile_model.dax, answered from the warehouse tables.
-- The cal CTE is a copy of the model's FiscalCalendarSql expression.
WITH days AS (
    SELECT DateKey,
           FullDateAlternateKey AS [Date],
           EnglishDayNameOfWeek AS DayName,
           CalendarYear
    FROM dbo.DimDate
    WHERE FullDateAlternateKey BETWEEN '2010-06-27' AND '2014-06-28'
),
-- A fiscal year ends on the last Saturday of June and is named after that year.
-- DATEDIFF(day, '19000106', d) % 7 is the number of days since the last Saturday (6 Jan 1900 was a Saturday).
years AS (
    SELECT days.*,
           CASE WHEN days.[Date] > e.YearEnd THEN days.CalendarYear + 1 ELSE days.CalendarYear END AS FiscalYear
    FROM days
    CROSS APPLY (SELECT DATEADD(day, -(DATEDIFF(day, '19000106', DATEFROMPARTS(days.CalendarYear, 6, 30)) % 7),
                                DATEFROMPARTS(days.CalendarYear, 6, 30)) AS YearEnd) e
),
weeks AS (
    SELECT years.*,
           DATEDIFF(day, s.YearStart, years.[Date]) / 7 + 1 AS FiscalWeek
    FROM years
    CROSS APPLY (SELECT DATEADD(day, 1 - (DATEDIFF(day, '19000106', DATEFROMPARTS(years.FiscalYear - 1, 6, 30)) % 7),
                                DATEFROMPARTS(years.FiscalYear - 1, 6, 30)) AS YearStart) s
),
-- 4-4-5: each quarter is 13 weeks split 4, 4 and 5; a 53rd week belongs to period 12.
cal AS (
    SELECT weeks.*,
           q.FiscalQuarter,
           (q.FiscalQuarter - 1) * 3 + CASE WHEN q.WeekOfQuarter <= 4 THEN 1 WHEN q.WeekOfQuarter <= 8 THEN 2 ELSE 3 END AS FiscalPeriod
    FROM weeks
    CROSS APPLY (SELECT CASE WHEN weeks.FiscalWeek = 53 THEN 4  ELSE (weeks.FiscalWeek - 1) / 13 + 1 END AS FiscalQuarter,
                        CASE WHEN weeks.FiscalWeek = 53 THEN 13 ELSE (weeks.FiscalWeek - 1) % 13 + 1 END AS WeekOfQuarter) q
)
SELECT c.FiscalYear * 100 + c.FiscalPeriod                                      AS FiscalPeriodID,
       s.SalesTerritoryKey,
       SUM(s.ExtendedAmount)                                                     AS GrossSales,
       SUM(CAST(s.DiscountAmount AS decimal(19, 4)))                            AS Discounts,
       SUM(s.ExtendedAmount - CAST(s.DiscountAmount AS decimal(19, 4)))         AS NetSales,
       SUM(s.TotalProductCost)                                                   AS ProductCost,
       SUM(s.ExtendedAmount - CAST(s.DiscountAmount AS decimal(19, 4)) - s.TotalProductCost) AS GrossProfit
FROM (SELECT OrderDateKey, SalesTerritoryKey, ExtendedAmount, DiscountAmount, TotalProductCost FROM dbo.FactInternetSales
      UNION ALL
      SELECT OrderDateKey, SalesTerritoryKey, ExtendedAmount, DiscountAmount, TotalProductCost FROM dbo.FactResellerSales) AS s
JOIN cal AS c ON c.DateKey = s.OrderDateKey
GROUP BY c.FiscalYear * 100 + c.FiscalPeriod, s.SalesTerritoryKey
ORDER BY 1, 2;
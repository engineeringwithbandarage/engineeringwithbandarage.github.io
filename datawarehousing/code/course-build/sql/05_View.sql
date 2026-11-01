-- Indexed view: needs QUOTED_IDENTIFIER ON (the runner calls sqlcmd with -I).
USE SBEcoLTDDW;
GO

CREATE VIEW dbo.OrdersByDate
    WITH SCHEMABINDING
    AS
        SELECT Orders.OrderID, Orders.CustomerKey, Orders.OrderTotal,
            Date.FullDate, Date.DayName, Date.DayNumber,
            Date.MonthName, Date.MonthNumber, Date.QuarterNumber, Date.Year
        FROM Fact.Orders JOIN Dimension.Date ON Orders.DateKey = Date.DateKey
;
GO

CREATE UNIQUE CLUSTERED INDEX IDX_OrdersByDate
   ON dbo.OrdersByDate (OrderID);
GO

-- course runs SELECT * (all rows); show a sample and the count instead
SELECT TOP (10) * FROM dbo.OrdersByDate ORDER BY OrderID;
SELECT COUNT(*) AS view_rows FROM dbo.OrdersByDate;
GO

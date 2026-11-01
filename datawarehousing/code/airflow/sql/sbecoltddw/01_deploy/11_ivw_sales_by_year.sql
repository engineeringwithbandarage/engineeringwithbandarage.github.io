/* deploy 11 - dbo.SalesByYear: an AGGREGATED indexed view (idempotent).
   The course's dbo.OrdersByDate stores one row per order (a pre-join), so reading it costs
   about the same as the fact table. This view stores one row per year: SQL Server keeps the
   totals up to date on every change to Fact.Orders, and a yearly report reads a single page.
   Rules: SCHEMABINDING, two-part names, COUNT_BIG(*) with GROUP BY, SUM over a non-null value.
   CREATE VIEW must be alone in its batch, so it runs through EXEC. */
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.SalesByYear') IS NULL
    EXEC (N'CREATE VIEW dbo.SalesByYear
            WITH SCHEMABINDING
            AS
            SELECT d.Year,
                   COUNT_BIG(*)                 AS Orders,
                   SUM(ISNULL(o.OrderTotal, 0)) AS Sales
            FROM Fact.Orders AS o
            JOIN Dimension.Date AS d ON d.DateKey = o.DateKey
            GROUP BY d.Year;');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SalesByYear')
    EXEC (N'CREATE UNIQUE CLUSTERED INDEX IX_SalesByYear ON dbo.SalesByYear (Year);');

SELECT Year, Orders, Sales FROM dbo.SalesByYear WITH (NOEXPAND) ORDER BY Year;

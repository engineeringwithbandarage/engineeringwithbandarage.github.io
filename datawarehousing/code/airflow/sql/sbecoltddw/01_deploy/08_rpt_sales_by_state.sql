/* deploy 08 - rpt.vSalesByState: sales by the state the customer lived in WHEN they ordered.
   Because Fact.Orders points at the customer version valid at order time (SCD Type 2),
   a customer who moves keeps their old orders in the old state. */
CREATE OR ALTER VIEW rpt.vSalesByState
AS
SELECT c.State,
       c.Statename,
       d.Year,
       COUNT_BIG(*)      AS Orders,
       SUM(o.OrderTotal) AS Sales
FROM Fact.Orders AS o
JOIN Dimension.Customer AS c ON c.CustomerKey = o.CustomerKey
JOIN Dimension.Date AS d     ON d.DateKey = o.DateKey
GROUP BY c.State, c.Statename, d.Year;

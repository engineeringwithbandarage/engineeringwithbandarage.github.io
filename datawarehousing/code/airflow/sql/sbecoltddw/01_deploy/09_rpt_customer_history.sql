/* deploy 09 - rpt.vCustomerHistory: every SCD Type 2 version of every customer */
CREATE OR ALTER VIEW rpt.vCustomerHistory
AS
SELECT c.CustomerAlternateKey AS CustomerID,
       c.CustomerKey,
       c.FullName,
       c.City,
       c.State,
       c.Zip,
       c.ValidFrom,
       c.ValidTo,
       c.IsCurrent,
       COUNT(c.CustomerKey) OVER (PARTITION BY c.CustomerAlternateKey) AS Versions,
       (SELECT COUNT(*) FROM Fact.Orders AS o WHERE o.CustomerKey = c.CustomerKey) AS OrdersOnThisVersion
FROM Dimension.Customer AS c
WHERE c.CustomerKey <> -1;

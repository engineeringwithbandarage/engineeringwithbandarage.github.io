USE SBEcoLTDDW;
GO

CREATE COLUMNSTORE INDEX IX_CS_FactOrders
ON Fact.Orders (OrderID, DateKey, CustomerKey, OrderTotal);
GO

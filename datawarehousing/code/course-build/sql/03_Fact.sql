USE SBEcoLTDDW;
GO

CREATE TABLE Fact.Orders (
    OrderID int IDENTITY (1,1) NOT NULL,
    DateKey int NOT NULL,
    CustomerKey int NOT NULL,
    OrderTotal money NOT NULL

    CONSTRAINT PK_Orders PRIMARY KEY CLUSTERED (
        OrderID ASC
    )

);
GO


ALTER TABLE Fact.Orders WITH CHECK ADD CONSTRAINT FK_Fact_Orders_DateKey_Dimension_Date FOREIGN KEY(DateKey)
REFERENCES Dimension.Date (DateKey);
GO

ALTER TABLE Fact.Orders CHECK CONSTRAINT FK_Fact_Orders_DateKey_Dimension_Date;
GO

ALTER TABLE Fact.Orders WITH CHECK ADD CONSTRAINT FK_Fact_Orders_CustomerKey_Dimension_Customer FOREIGN KEY(CustomerKey)
REFERENCES Dimension.Customer (CustomerKey);
GO

ALTER TABLE Fact.Orders CHECK CONSTRAINT FK_Fact_Orders_CustomerKey_Dimension_Customer;
GO

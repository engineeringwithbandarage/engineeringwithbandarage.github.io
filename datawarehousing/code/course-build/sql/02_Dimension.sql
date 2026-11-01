-- Change: Dimension.Date.Year is smallint instead of tinyint (tinyint stops at 255, so real years fail).
USE SBEcoLTDDW;
GO

CREATE TABLE Dimension.Date (
    DateKey int NOT NULL,
    FullDate date NOT NULL,
    DayName nvarchar(9) NOT NULL,
    DayNumber tinyint NOT NULL,
    MonthName varchar(9) NOT NULL,
    MonthNumber tinyint NOT NULL,
    QuarterNumber tinyint NOT NULL,
    Year smallint NOT NULL      -- course: tinyint

    CONSTRAINT PK_Date PRIMARY KEY CLUSTERED (
        DateKey ASC
    )
);
GO

CREATE TABLE Dimension.Customer (
    CustomerKey int IDENTITY (1,1) NOT NULL,
    CustomerAlternateKey int NOT NULL,
    FirstName nvarchar(50) NOT NULL,
    LastName nvarchar(50) NOT NULL,
    FullName nvarchar(100) NOT NULL,
    City nvarchar(50) NOT NULL,
    State char(2) NOT NULL,
    Statename nvarchar(20) NOT NULL,
    Zip char(5) NOT NULL

    CONSTRAINT PK_Customer PRIMARY KEY CLUSTERED (
        CustomerKey ASC
    )
);
GO

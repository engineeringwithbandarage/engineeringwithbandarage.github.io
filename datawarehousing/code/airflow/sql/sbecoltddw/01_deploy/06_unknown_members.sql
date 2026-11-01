/* deploy 06 - "unknown" dimension member (idempotent)
   A fact row whose customer cannot be found points at CustomerKey -1 instead of failing the
   foreign key. The data quality gate counts these rows. */
SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM Dimension.Customer WHERE CustomerKey = -1)
BEGIN
    SET IDENTITY_INSERT Dimension.Customer ON;
    INSERT INTO Dimension.Customer
        (CustomerKey, CustomerAlternateKey, FirstName, LastName, FullName, City, State, Statename, Zip,
         ValidFrom, ValidTo, IsCurrent, RowHash, LoadBatchID)
    VALUES
        (-1, -1, N'Unknown', N'Unknown', N'Unknown', N'Unknown', 'NA', N'Unknown', '00000',
         '1900-01-01', NULL, 1, NULL, NULL);
    SET IDENTITY_INSERT Dimension.Customer OFF;
END;

SELECT CustomerKey, CustomerAlternateKey, FullName, City, State FROM Dimension.Customer WHERE CustomerKey = -1;

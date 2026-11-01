#!/bin/bash
# so the tutorial scenarios can be replayed from the original source data:
#   * delete the simulator's orders (Comment 'SBEcoLTDDW demo: …') and reseed the order identity
#   * move customer 11090 back to 5781 Sharon Dr., Los Angeles, CA 90012
# Runs sqlcmd inside the SQL Server Linux container (-I: the source tables need QUOTED_IDENTIFIER ON).
set -euo pipefail
docker exec -i labenv_mssql_1 bash -c '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -d AdventureWorks2022 -I -b -W -s " | "' <<'SQL'
SET NOCOUNT ON;
DELETE FROM Sales.SalesOrderHeader
WHERE Comment IN (N'SBEcoLTDDW demo: new order', N'SBEcoLTDDW DQ demo: zero-value order');
PRINT CONCAT(@@ROWCOUNT, N' simulator orders removed');

UPDATE Person.Address
SET AddressLine1 = N'5781 Sharon Dr.', City = N'Los Angeles', PostalCode = N'90012', ModifiedDate = '2012-01-07',
    StateProvinceID = (SELECT StateProvinceID FROM Person.StateProvince WHERE StateProvinceCode = N'CA' AND CountryRegionCode = N'US')
WHERE AddressID = 21916;                     -- home address of customer 11090
PRINT CONCAT(@@ROWCOUNT, N' address restored');

DECLARE @max int = (SELECT MAX(SalesOrderID) FROM Sales.SalesOrderHeader);
DBCC CHECKIDENT ('Sales.SalesOrderHeader', RESEED, @max) WITH NO_INFOMSGS;

SELECT COUNT(*) AS orders, MAX(SalesOrderID) AS max_id, SUM(SubTotal) AS subtotal, MAX(ModifiedDate) AS max_mod
FROM Sales.SalesOrderHeader;
SQL

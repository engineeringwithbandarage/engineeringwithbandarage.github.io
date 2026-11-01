/* load_dim_customer_scd2 - Dimension.Customer as a Slowly Changing Dimension.
   Type 1 (overwrite) : FirstName, LastName, FullName  - corrections, no history kept
   Type 2 (history)   : City, State, Statename, Zip     - a move creates a new version
   RowHash = SHA2_256 of the Type 2 columns, so one comparison finds every changed customer.
   A new version starts at the time the change happened in the SOURCE (SourceModifiedDate),
   not at load time, so orders placed after a move find the new version. */
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @BatchID int = (SELECT BatchID FROM audit.BatchRun WHERE DagRunID = N'{{ run_id }}');
DECLARE @type1 int, @expired int, @inserted int, @new_customers int;

SELECT s.CustomerID, s.FirstName, s.LastName,
       CONCAT(s.FirstName, N' ', s.LastName) AS FullName,
       s.City, s.StateCode, LEFT(s.StateName, 20) AS StateName, s.PostalCode, s.SourceModifiedDate,
       HASHBYTES('SHA2_256', CONCAT_WS(N'|', s.City, s.StateCode, s.StateName, s.PostalCode)) AS RowHash
INTO #src
FROM stg.Customer AS s;

SELECT @new_customers = COUNT(*) FROM #src AS s
WHERE NOT EXISTS (SELECT 1 FROM Dimension.Customer AS d WHERE d.CustomerAlternateKey = s.CustomerID);

BEGIN TRANSACTION;

    -- 1. Type 1: overwrite names on every version of the customer
    UPDATE d
    SET d.FirstName = s.FirstName, d.LastName = s.LastName, d.FullName = s.FullName
    FROM Dimension.Customer AS d
    JOIN #src AS s ON s.CustomerID = d.CustomerAlternateKey
    WHERE d.FirstName <> s.FirstName OR d.LastName <> s.LastName;
    SET @type1 = @@ROWCOUNT;

    -- 2. Type 2, step 1: close the current version when a tracked column changed
    UPDATE d
    SET d.ValidTo = s.SourceModifiedDate, d.IsCurrent = 0
    FROM Dimension.Customer AS d
    JOIN #src AS s ON s.CustomerID = d.CustomerAlternateKey
    WHERE d.IsCurrent = 1 AND d.RowHash <> s.RowHash;
    SET @expired = @@ROWCOUNT;

    -- 3. Type 2, step 2: open a new current version for changed AND brand-new customers
    INSERT INTO Dimension.Customer
        (CustomerAlternateKey, FirstName, LastName, FullName, City, State, Statename, Zip,
         ValidFrom, ValidTo, IsCurrent, RowHash, LoadBatchID)
    SELECT s.CustomerID, s.FirstName, s.LastName, s.FullName, s.City, s.StateCode, s.StateName, s.PostalCode,
           CASE WHEN EXISTS (SELECT 1 FROM Dimension.Customer AS d WHERE d.CustomerAlternateKey = s.CustomerID)
                THEN s.SourceModifiedDate      -- a new version of a known customer
                ELSE '1900-01-01' END,         -- first version covers all history
           NULL, 1, s.RowHash, @BatchID
    FROM #src AS s
    WHERE NOT EXISTS (SELECT 1 FROM Dimension.Customer AS d
                      WHERE d.CustomerAlternateKey = s.CustomerID AND d.IsCurrent = 1);
    SET @inserted = @@ROWCOUNT;

COMMIT TRANSACTION;

DECLARE @read int = (SELECT COUNT(*) FROM #src), @updated int = @expired + @type1;
DECLARE @note nvarchar(400) = CONCAT(N'new customers ', @new_customers, N', new versions ', @inserted - @new_customers,
                                     N', expired ', @expired, N', type 1 updates ', @type1);
EXEC audit.usp_LogStep @DagRunID = N'{{ run_id }}', @TaskID = N'{{ ti.task_id }}',
     @RowsRead = @read, @RowsInserted = @inserted, @RowsUpdated = @updated, @Note = @note;

PRINT @note;
SELECT @new_customers AS new_customers, @inserted - @new_customers AS new_versions, @expired AS expired_versions,
       @type1 AS type1_updates,
       (SELECT COUNT(*) FROM Dimension.Customer WHERE CustomerKey <> -1) AS customer_rows,
       (SELECT COUNT(*) FROM Dimension.Customer WHERE CustomerKey <> -1 AND IsCurrent = 1) AS current_rows;

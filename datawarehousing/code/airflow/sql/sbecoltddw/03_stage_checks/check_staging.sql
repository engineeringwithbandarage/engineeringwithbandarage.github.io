/* check_staging - stop BEFORE touching the warehouse if the staged data is unusable.
   Every rule that fails is listed; THROW makes the Airflow task (and everything after it) fail. */
SET NOCOUNT ON;

DECLARE @checks TABLE (CheckName nvarchar(100), Problems bigint);

INSERT INTO @checks VALUES
 (N'stg.Customer is not empty',          CASE WHEN EXISTS (SELECT 1 FROM stg.Customer) THEN 0 ELSE 1 END),
 (N'stg.Customer has unique CustomerID', (SELECT COUNT(*) FROM (SELECT CustomerID FROM stg.Customer GROUP BY CustomerID HAVING COUNT(*) > 1) AS d)),
 (N'stg.Customer state and zip present', (SELECT COUNT(*) FROM stg.Customer WHERE LEN(StateCode) <> 2 OR LEN(PostalCode) <> 5)),
 (N'stg.SalesOrderHeader unique order',  (SELECT COUNT(*) FROM (SELECT SalesOrderID FROM stg.SalesOrderHeader GROUP BY SalesOrderID HAVING COUNT(*) > 1) AS d)),
 (N'stg.SalesOrderHeader no NULL dates', (SELECT COUNT(*) FROM stg.SalesOrderHeader WHERE OrderDate IS NULL));

SELECT CheckName, Problems, CASE WHEN Problems = 0 THEN N'ok' ELSE N'FAILED' END AS Result FROM @checks;

DECLARE @failed nvarchar(2000) =
    (SELECT STRING_AGG(CheckName, N'; ') FROM @checks WHERE Problems > 0);
DECLARE @n int = (SELECT COUNT(*) FROM @checks);
DECLARE @note nvarchar(400) = COALESCE(N'FAILED: ' + LEFT(@failed, 380), CONCAT(@n, N' checks passed'));

EXEC audit.usp_LogStep @DagRunID = N'{{ run_id }}', @TaskID = N'{{ ti.task_id }}', @Note = @note;

IF @failed IS NOT NULL
    THROW 50001, @failed, 1;

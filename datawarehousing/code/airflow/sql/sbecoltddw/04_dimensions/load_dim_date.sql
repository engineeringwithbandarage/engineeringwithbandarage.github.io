/* load_dim_date - generate the calendar 2010-01-01 .. 2030-12-31 (idempotent: only missing days are added).
   A date dimension is generated, not extracted. DateKey is the smart key yyyymmdd. */
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @From date = '2010-01-01', @To date = '2030-12-31';

WITH n AS (
    SELECT TOP (DATEDIFF(day, @From, @To) + 1)
           ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1 AS i
    FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b
),
d AS (
    SELECT DATEADD(day, i, @From) AS FullDate FROM n
)
INSERT INTO Dimension.Date (DateKey, FullDate, DayName, DayNumber, MonthName, MonthNumber, QuarterNumber, Year)
SELECT CONVERT(int, CONVERT(char(8), d.FullDate, 112)),
       d.FullDate,
       DATENAME(weekday, d.FullDate),
       DAY(d.FullDate),
       DATENAME(month, d.FullDate),
       MONTH(d.FullDate),
       DATEPART(quarter, d.FullDate),
       YEAR(d.FullDate)
FROM d
WHERE NOT EXISTS (SELECT 1 FROM Dimension.Date AS x WHERE x.FullDate = d.FullDate);

DECLARE @rows int = @@ROWCOUNT;
EXEC audit.usp_LogStep @DagRunID = N'{{ run_id }}', @TaskID = N'{{ ti.task_id }}',
     @RowsInserted = @rows, @Note = N'calendar 2010-2030';

SELECT COUNT(*) AS date_rows, MIN(FullDate) AS first_day, MAX(FullDate) AS last_day, @rows AS added_now
FROM Dimension.Date;

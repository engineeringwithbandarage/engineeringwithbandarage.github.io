/* deploy 10 - rpt.vLoadHistory: one row per pipeline step per run (from the audit tables) */
CREATE OR ALTER VIEW rpt.vLoadHistory
AS
SELECT b.BatchID,
       b.DagRunID,
       b.Status       AS RunStatus,
       b.StartedAt    AS RunStartedAt,
       b.EndedAt      AS RunEndedAt,
       s.TaskID,
       s.RowsRead,
       s.RowsInserted,
       s.RowsUpdated,
       s.RowsDeleted,
       s.LoginName,
       s.WorkloadGroupID,
       s.Note,
       s.LoggedAt
FROM audit.BatchRun AS b
LEFT JOIN audit.StepLog AS s ON s.BatchID = b.BatchID;

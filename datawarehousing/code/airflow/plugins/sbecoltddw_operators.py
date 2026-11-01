"""
Reusable Airflow building blocks for the SBEcoLTDDW pipeline.

Orchestration plumbing only - no business SQL lives here. Every task points at a .sql file
under /opt/airflow/sql (mounted from ~/airflow/sql), so the SQL can be read, reviewed and
run on its own.

MsSqlFileOperator   runs one T-SQL batch (a .sql file, rendered by Jinja) on SQL Server,
                    writes every PRINT message and result set to the task log, and fails
                    the task if any statement in the batch raises an error.
"""
import datetime as dt
import decimal

import pyodbc
from airflow.exceptions import AirflowException
from airflow.hooks.base import BaseHook
from airflow.models import BaseOperator


def mssql_connect(conn_id):
    """Open a pyodbc connection from an Airflow connection (host, port, schema = database, login)."""
    c = BaseHook.get_connection(conn_id)
    pwd = "{" + (c.password or "").replace("}", "}}") + "}"
    return pyodbc.connect(
        "DRIVER={ODBC Driver 18 for SQL Server};"
        f"SERVER={c.host},{c.port or 1433};DATABASE={c.schema};UID={c.login};PWD={pwd};"
        "Encrypt=yes;TrustServerCertificate=yes;",
        autocommit=True,
    )


def _plain(value):
    """Make a result value JSON-friendly for XCom."""
    if isinstance(value, (dt.date, dt.datetime, dt.time, decimal.Decimal)):
        return str(value)
    if isinstance(value, (bytes, bytearray)):
        return "0x" + value.hex()
    return value


def _format_table(columns, rows, limit=50):
    shown = [[("NULL" if v is None else str(_plain(v))) for v in r] for r in rows[:limit]]
    widths = [max([len(c)] + [len(r[i]) for r in shown]) for i, c in enumerate(columns)]
    line = "+".join("-" * (w + 2) for w in widths)
    out = [" | ".join(c.ljust(w) for c, w in zip(columns, widths)), line]
    out += [" | ".join(v.ljust(w) for v, w in zip(r, widths)) for r in shown]
    if len(rows) > limit:
        out.append(f"... {len(rows) - limit} more rows")
    return "\n".join(out)


def run_batch(conn_id, sql, log):
    """Execute one batch and walk every result; returns the last result set as a list of dicts."""
    conn = mssql_connect(conn_id)
    cur = conn.cursor()
    last = []
    try:
        cur.execute(sql)
        n = 0
        while True:
            for _, msg in getattr(cur, "messages", None) or []:
                log.info("SQL> %s", msg.split("[SQL Server]")[-1])
            if cur.description:
                n += 1
                cols = [d[0] for d in cur.description]
                rows = cur.fetchall()
                log.info("result set %d (%d rows):\n%s", n, len(rows), _format_table(cols, rows))
                last = [{c: _plain(v) for c, v in zip(cols, r)} for r in rows[:50]]
            # nextset() raises if a later statement in the batch failed (e.g. THROW in a check)
            if not cur.nextset():
                break
    except pyodbc.Error as exc:
        raise AirflowException(f"SQL batch failed: {exc}") from exc
    finally:
        conn.close()
    return last


class MsSqlFileOperator(BaseOperator):
    """Run a .sql file (one T-SQL batch, no GO) on SQL Server."""

    template_fields = ("sql",)
    template_ext = (".sql",)
    template_fields_renderers = {"sql": "sql"}
    ui_color = "#dbeafe"

    def __init__(self, *, sql, conn_id, **kwargs):
        super().__init__(**kwargs)
        self.sql = sql
        self.conn_id = conn_id

    def execute(self, context):
        self.log.info("connection: %s", self.conn_id)
        return run_batch(self.conn_id, self.sql, self.log)


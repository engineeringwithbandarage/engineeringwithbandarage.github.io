"""
### SBEcoLTDDW end-to-end pipeline

Loads the **SBEcoLTDDW** data warehouse (SQL Server 2022 for Linux, in a Docker container) from
its source system, AdventureWorks2022 (sales OLTP):

| Source table(s) | Warehouse table | How |
|---|---|---|
| Sales.Customer + Person.* | `Dimension.Customer` | full extract, SCD Type 1 + 2 |
| Sales.SalesOrderHeader | `Fact.Orders` | incremental watermark, idempotent MERGE |
| (generated) | `Dimension.Date` | calendar 2010-2030 |

**This file only orchestrates.** Every task runs one `.sql` file from `/opt/airflow/sql/sbecoltddw`
(mounted from `~/airflow/sql` on the Linux host). Open a task and look at *Rendered Template* to see
the exact SQL.

Steps: `deploy` → `start_run` → `extract` → `stage_checks` → `dimensions` → `facts` → `post_load`
→ `dq_gate` → `publish` → `end_run` (or `fail_run` when anything failed).

Trigger with `{"full_reload": true}` to ignore the watermark and reload all orders.
"""
from pathlib import Path

import pendulum
from airflow import DAG
from airflow.models.param import Param
from airflow.utils.task_group import TaskGroup
from airflow.utils.trigger_rule import TriggerRule

from sbecoltddw_operators import MsSqlFileOperator

SQL_ROOT = "/opt/airflow/sql/sbecoltddw"
ETL = "mssql_sbecoltddw_etl"      # login DataLoader -> Resource Governor group DataLoads


def sql_task(task_id, sql, conn_id=ETL, **kwargs):
    """One task = one SQL file."""
    return MsSqlFileOperator(task_id=task_id, sql=sql, conn_id=conn_id, **kwargs)


with DAG(
    dag_id="sbecoltddw_e2e_pipeline",
    description="SBEcoLTDDW: source -> staging -> dimensions -> facts -> DQ gate -> reporting",
    start_date=pendulum.datetime(2026, 10, 1, tz="UTC"),
    schedule=None,
    catchup=False,
    max_active_runs=1,
    template_searchpath=[SQL_ROOT],
    params={"full_reload": Param(False, type="boolean", description="Ignore the order watermark and reload everything")},
    default_args={"owner": "sbecoltddw", "retries": 0},
    doc_md=__doc__,
    tags=["sbecoltddw", "sqlserver", "data-warehouse"],
) as dag:

    # 1. deploy: create / upgrade every pipeline object - one task per file, in file order
    with TaskGroup("deploy", tooltip="Idempotent DDL: schemas, control tables, staging, DW changes, views") as deploy:
        files = sorted(Path(SQL_ROOT, "01_deploy").glob("*.sql"))
        previous = None
        for f in files:
            t = sql_task(f.stem, f"01_deploy/{f.name}")
            if previous:
                previous >> t
            previous = t

    # 2. register the run in audit.BatchRun
    start_run = sql_task("start_run", "00_control/start_run.sql")

    # 3. extract: source -> stg (independent, so they run in parallel)
    with TaskGroup("extract", tooltip="Copy source data into the stg schema") as extract:
        extract_customers = sql_task("extract_customers", "02_extract/extract_customers.sql")
        extract_sales_orders = sql_task("extract_sales_orders", "02_extract/extract_sales_orders.sql")

    # 4. stop early if staging is unusable
    stage_checks = sql_task("stage_checks", "03_stage_checks/check_staging.sql")

    # 5. dimensions before facts (facts look up dimension keys)
    with TaskGroup("dimensions", tooltip="Date (generated), Customer (SCD Type 1 + 2)") as dimensions:
        load_dim_date = sql_task("load_dim_date", "04_dimensions/load_dim_date.sql")
        load_dim_customer = sql_task("load_dim_customer_scd2", "04_dimensions/load_dim_customer_scd2.sql")

    # 6. facts
    with TaskGroup("facts", tooltip="Fact.Orders (incremental, idempotent MERGE)") as facts:
        load_fact_orders = sql_task("load_fact_orders", "05_facts/load_fact_orders.sql")

    # 7. post-load maintenance
    with TaskGroup("post_load", tooltip="Columnstore, statistics, indexed view") as post_load:
        maintain_columnstore = sql_task("maintain_columnstore", "06_post_load/maintain_columnstore.sql")
        update_statistics = sql_task("update_statistics", "06_post_load/update_statistics.sql")
        check_indexed_view = sql_task("check_indexed_view", "06_post_load/check_indexed_view.sql")
        maintain_columnstore >> update_statistics >> check_indexed_view

    # 8. the data quality gate
    dq_gate = sql_task("dq_gate", "07_dq/dq_gate.sql")

    # 9. publish: commit the watermark only after everything passed
    with TaskGroup("publish", tooltip="Advance watermarks, summarise the run") as publish:
        advance_watermarks = sql_task("advance_watermarks", "08_publish/advance_watermarks.sql")
        run_summary = sql_task("run_summary", "08_publish/run_summary.sql")
        advance_watermarks >> run_summary

    # 10. close the batch
    end_run = sql_task("end_run", "00_control/end_run.sql")
    fail_run = sql_task("fail_run", "00_control/fail_run.sql", trigger_rule=TriggerRule.ONE_FAILED)

    deploy >> start_run >> extract >> stage_checks >> dimensions >> facts >> post_load >> dq_gate >> publish
    publish >> [end_run, fail_run]

"""
### SBEcoLTDDW source-system simulator

Makes changes in **AdventureWorks2022** (the sales OLTP) so the next run of
`sbecoltddw_e2e_pipeline` has something to do. Pick a scenario when you trigger it:

| scenario | what happens in the source | what the warehouse should show |
|---|---|---|
| `move_and_order` | the demo customer moves house, then places new online orders | a new SCD2 customer version; new orders on the new version |
| `bad_order` | a zero-value order is inserted | the DQ gate fails (DQ04), nothing is published |
| `fix_bad_order` | the zero-value order is corrected | the next run loads the fix and passes |

Orchestration only - the SQL is in `/opt/airflow/sql/sbecoltddw/90_source_changes`.
"""
import pendulum
from airflow import DAG
from airflow.models.param import Param
from airflow.operators.python import BranchPythonOperator
from airflow.utils.trigger_rule import TriggerRule

from sbecoltddw_operators import MsSqlFileOperator

SQL_ROOT = "/opt/airflow/sql/sbecoltddw"
SOURCE = "mssql_adventureworks"   # the source system's own connection


def choose_scenario(**context):
    return {
        "move_and_order": "move_customer",
        "bad_order": "insert_bad_order",
        "fix_bad_order": "fix_bad_order",
    }[context["params"]["scenario"]]


with DAG(
    dag_id="sbecoltddw_source_changes",
    description="Simulate source changes in AdventureWorks2022 for the SBEcoLTDDW pipeline",
    start_date=pendulum.datetime(2026, 10, 1, tz="UTC"),
    schedule=None,
    catchup=False,
    max_active_runs=1,
    template_searchpath=[SQL_ROOT],
    params={
        "scenario": Param("move_and_order", enum=["move_and_order", "bad_order", "fix_bad_order"]),
        "customer_id": Param(11090, type="integer", description="AdventureWorks2022 CustomerID (US individual; 11090 = Trevor Bryant, Los Angeles)"),
        "new_orders": Param(3, type="integer", minimum=1, maximum=20),
    },
    default_args={"owner": "sbecoltddw", "retries": 0},
    doc_md=__doc__,
    tags=["sbecoltddw", "sqlserver", "source-simulator"],
) as dag:

    show_before = MsSqlFileOperator(task_id="show_before", sql="90_source_changes/show_customer.sql", conn_id=SOURCE)
    scenario = BranchPythonOperator(task_id="choose_scenario", python_callable=choose_scenario)

    move_customer = MsSqlFileOperator(task_id="move_customer", sql="90_source_changes/move_customer.sql", conn_id=SOURCE)
    insert_new_orders = MsSqlFileOperator(task_id="insert_new_orders", sql="90_source_changes/insert_new_orders.sql", conn_id=SOURCE)
    insert_bad_order = MsSqlFileOperator(task_id="insert_bad_order", sql="90_source_changes/insert_bad_order.sql", conn_id=SOURCE)
    fix_bad_order = MsSqlFileOperator(task_id="fix_bad_order", sql="90_source_changes/fix_bad_order.sql", conn_id=SOURCE)

    show_after = MsSqlFileOperator(
        task_id="show_after", sql="90_source_changes/show_customer.sql", conn_id=SOURCE,
        trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
    )

    show_before >> scenario >> [move_customer, insert_bad_order, fix_bad_order]
    move_customer >> insert_new_orders
    [insert_new_orders, insert_bad_order, fix_bad_order] >> show_after

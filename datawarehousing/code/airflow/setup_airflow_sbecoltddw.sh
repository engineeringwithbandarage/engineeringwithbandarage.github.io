#!/bin/bash
#   1. compose Version11: mounts ~/airflow/sql (added in Version10); the file in use is backed up first
#      as docker-compose_Version_<n>.yaml
#   2. copy the SQL folder, plugin and DAGs from ~/sbecoltddw/airflow (uploaded from the PC)
#   3. recreate the Airflow containers so they see the new volume
#   4. create the Airflow connection mssql_sbecoltddw_etl (DataLoader)
#   5. check the DAGs import cleanly
set -euo pipefail
AF="$HOME/airflow"
SRC="$HOME/sbecoltddw/airflow"
cd "$AF"

echo ">> 1. compose Version11"
if ! grep -q '# Version11' docker-compose.yaml; then
  if grep -q '# Version10' docker-compose.yaml; then prev=10; else prev=9; fi
  [ -f "docker-compose_Version_$prev.yaml" ] || cp -p docker-compose.yaml "docker-compose_Version_$prev.yaml"
  cp "$SRC/docker-compose_Version11.yaml" docker-compose.yaml
fi
grep -n 'Version1[01]\|/opt/airflow/sql' docker-compose.yaml

echo ">> 2. SQL folder, plugin, DAGs"
mkdir -p "$AF/sql"
rm -rf "$AF/sql/sbecoltddw"
cp -r "$SRC/sql/sbecoltddw" "$AF/sql/"
cp "$SRC/plugins/sbecoltddw_operators.py" "$AF/plugins/"
cp "$SRC/dags/sbecoltddw_e2e_pipeline.py" "$SRC/dags/sbecoltddw_source_changes.py" "$AF/dags/"
find "$AF/sql/sbecoltddw" -type f | sort | sed "s#$AF/##"

echo ">> 3. recreate Airflow containers (docker-compose v1: rm -sf, then up -d)"
SERVICES="airflow-webserver airflow-scheduler airflow-worker airflow-triggerer"
docker-compose rm -sf $SERVICES
docker-compose up -d $SERVICES
echo "waiting for the scheduler..."
for i in $(seq 1 30); do
  if docker exec airflow_airflow-scheduler_1 test -d /opt/airflow/sql/sbecoltddw 2>/dev/null &&
     docker exec airflow_airflow-scheduler_1 airflow version >/dev/null 2>&1; then break; fi
  sleep 5
done
docker ps --format '{{.Names}}  {{.Status}}' | grep airflow_

echo ">> 4. connections (passwords are read from files/connections, never printed)"
set -a; source "$HOME/sbecoltddw/.dataloader.env"; set +a
docker exec -i -e DL_PASSWORD airflow_airflow-scheduler_1 python - <<'PY'
import os
from airflow.hooks.base import BaseHook
from airflow.models import Connection
from airflow.settings import Session

wanted = [
    Connection(conn_id="mssql_sbecoltddw_etl", conn_type="odbc", host="mssql", port=1433,
               schema="SBEcoLTDDW", login="DataLoader", password=os.environ["DL_PASSWORD"],
               description="SBEcoLTDDW pipeline steps (Resource Governor group DataLoads)"),
]
s = Session()
for c in wanted:
    s.query(Connection).filter(Connection.conn_id == c.conn_id).delete()
    s.add(c)
    print(f"connection {c.conn_id}: {c.conn_type}://{c.login}@{c.host}:{c.port}/{c.schema}")
s.commit()
PY

echo ">> 5. DAG import check"
docker exec airflow_airflow-scheduler_1 bash -c 'airflow dags reserialize >/dev/null 2>&1; airflow dags list-import-errors; airflow dags list 2>/dev/null | grep -E "dag_id|sbecoltddw"'

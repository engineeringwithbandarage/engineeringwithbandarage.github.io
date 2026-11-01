#!/bin/bash
# Usage: ~/sbecoltddw/airflow/sbdw_run.sh <dag_id> [conf-json] [run_id]
#   e.g. sbdw_run.sh sbecoltddw_e2e_pipeline '{"full_reload": false}' sbdw_run_01
# Task logs: ~/airflow/logs/dag_id=<dag>/run_id=<run_id>/task_id=<task>/attempt=<n>.log
set -euo pipefail
DAG="$1"; CONF="${2:-}"; RUN_ID="${3:-manual_$(date +%Y%m%dT%H%M%S)}"
[ -n "$CONF" ] || CONF='{}'
S=airflow_airflow-scheduler_1
af() { docker exec "$S" airflow "$@" 2>/dev/null; }

af dags unpause "$DAG" >/dev/null
af dags trigger "$DAG" -r "$RUN_ID" -c "$CONF" >/dev/null
echo "triggered $DAG run_id=$RUN_ID conf=$CONF"

start=$(date +%s)
while true; do
  state=$(af dags list-runs -d "$DAG" -o plain | awk -v r="$RUN_ID" '$2==r {print $3}')
  case "$state" in success|failed) break ;; esac
  if [ $(( $(date +%s) - start )) -gt 1500 ]; then echo "timeout waiting for $RUN_ID"; break; fi
  sleep 10
done
echo "run $RUN_ID finished: $state after $(( $(date +%s) - start ))s"
af tasks states-for-dag-run "$DAG" "$RUN_ID" -o plain | awk '{printf "%-48s %-16s %s %s\n", $3, $4, $5, $6}'

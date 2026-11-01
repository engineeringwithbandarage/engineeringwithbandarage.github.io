#!/bin/bash
# Usage: ~/sbecoltddw/airflow/sbdw_clear.sh <dag_id> <run_id> <task_regex>
set -euo pipefail
DAG="$1"; RUN_ID="$2"; TASK="$3"
S=airflow_airflow-scheduler_1
af() { docker exec "$S" airflow "$@" 2>/dev/null; }

LD=$(af dags list-runs -d "$DAG" -o plain | awk -v r="$RUN_ID" '$2==r {print $4}')
echo "clearing $TASK (+downstream) in $RUN_ID (logical date $LD)"
af tasks clear "$DAG" -t "$TASK" --downstream --yes -s "$LD" -e "$LD" | tail -3

start=$(date +%s); sleep 5
while true; do
  state=$(af dags list-runs -d "$DAG" -o plain | awk -v r="$RUN_ID" '$2==r {print $3}')
  case "$state" in success|failed) break ;; esac
  if [ $(( $(date +%s) - start )) -gt 1500 ]; then echo "timeout"; break; fi
  sleep 10
done
echo "run $RUN_ID finished: $state after $(( $(date +%s) - start ))s"
af tasks states-for-dag-run "$DAG" "$RUN_ID" -o plain | awk '{printf "%-48s %-16s\n", $3, $4}'

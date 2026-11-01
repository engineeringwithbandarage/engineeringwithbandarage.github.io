#!/bin/bash
# out of the Airflow task logs, in execution order, into ~/sbecoltddw/captures/<run_id>.txt
# Usage: ~/sbecoltddw/airflow/sbdw_capture.sh <dag_id> <run_id>
set -euo pipefail
DAG="$1"; RUN_ID="$2"
OUT="$HOME/sbecoltddw/captures"; mkdir -p "$OUT"
DIR="$HOME/airflow/logs/dag_id=$DAG/run_id=$RUN_ID"
{
  echo "##### $DAG  $RUN_ID"
  # latest attempt of each task, ordered by when it ran
  for d in "$DIR"/task_id=*; do
    f=$(ls -1 "$d"/attempt=*.log | sort -V | tail -1)
    echo "$(head -1 "$f" | cut -c2-24) $f"
  done | sort | while read -r _ f; do
    task=$(basename "$(dirname "$f")"); task=${task#task_id=}
    echo; echo "===== $task  ($(basename "$f"))"
    awk '
      /SQL> |result set [0-9]+ \(|sensor value:|SQL batch failed/ { sub(/^.*INFO - /, ""); sub(/^.*ERROR - /, ""); print; grab = /result set/; next }
      grab && /^\[20[0-9][0-9]-/ { grab = 0 }
      grab { print }
    ' "$f"
  done
} > "$OUT/$RUN_ID.txt"
echo "wrote $OUT/$RUN_ID.txt ($(wc -l < "$OUT/$RUN_ID.txt") lines)"

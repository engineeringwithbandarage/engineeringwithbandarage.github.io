#!/bin/bash
# its SQL output to ~/sbecoltddw/captures/<run_id>.txt
# Usage: ~/sbecoltddw/airflow/sbdw_scenarios.sh <step>
#   move    : source change "customer moves + 3 new orders", then pipeline run 03
#   bad     : source change "zero-value order",              then pipeline run 04 (DQ gate fails)
#   fix     : source change "fix the order",                  then pipeline run 05 (passes)
#   reload  : pipeline run 06 with full_reload = true (idempotency check)
set -uo pipefail
cd "$(dirname "$0")"
step="$1"

src() {   # $1 scenario, $2 run_id
  ./sbdw_run.sh sbecoltddw_source_changes "{\"scenario\": \"$1\"}" "$2" | grep -v '^task_id'
  ./sbdw_capture.sh sbecoltddw_source_changes "$2"
}
pipe() {  # $1 run_id, $2 conf
  ./sbdw_run.sh sbecoltddw_e2e_pipeline "${2:-}" "$1" | grep -v -E 'success\s+[0-9]|skipped|^task_id'
  ./sbdw_capture.sh sbecoltddw_e2e_pipeline "$1"
}

case "$step" in
  move)   src move_and_order src_01_move_and_order;   pipe sbdw_run_03_customer_moved ;;
  bad)    src bad_order      src_02_bad_order;        pipe sbdw_run_04_bad_order ;;
  fix)    src fix_bad_order  src_03_fix_bad_order;    pipe sbdw_run_05_order_fixed ;;
  reload) pipe sbdw_run_06_full_reload '{"full_reload": true}' ;;
  *) echo "unknown step $step"; exit 2 ;;
esac

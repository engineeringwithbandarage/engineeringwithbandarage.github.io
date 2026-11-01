#!/bin/bash
# Usage:  bash ~/sbecoltddw/run_sbecoltddw.sh            (first build)
#         REBUILD=1 bash ~/sbecoltddw/run_sbecoltddw.sh  (drop SBEcoLTDDW and build again)
#         REBUILD=1 COURSE_ONLY=1 bash ...               (course objects only, empty tables -
#                                                         the Airflow pipeline sbecoltddw_e2e_pipeline loads them)
# Output is logged to ~/sbecoltddw/logs/build_<timestamp>.log
set -euo pipefail
BASE="$HOME/sbecoltddw"
C=labenv_mssql_1
export REBUILD="${REBUILD:-0}"
COURSE_ONLY="${COURSE_ONLY:-0}"
cd "$BASE"
mkdir -p logs
LOG="logs/build_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

# Password for the DataLoader login (Chapter 5), generated once and kept only on the server
if [ ! -f .dataloader.env ]; then
  ( umask 077; echo "DL_PASSWORD=Kd$(openssl rand -hex 12)!x9" > .dataloader.env )
  echo ">> generated $BASE/.dataloader.env"
fi
set -a; source .dataloader.env; set +a

# sqlcmd -I = QUOTED_IDENTIFIER ON (indexed view), -b = stop on error.
# Environment variables passed with -e become sqlcmd scripting variables: $(REBUILD), $(DL_PASSWORD)
run_sa() {
  echo; echo "########## $1  (as sa)"
  docker exec -i -e REBUILD -e DL_PASSWORD "$C" bash -c \
    '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -I -b -W -s " | "' < "sql/$1"
}
run_dataloader() {
  echo; echo "########## $1  (as DataLoader)"
  docker exec -i -e DL_PASSWORD "$C" bash -c \
    '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U DataLoader -P "$DL_PASSWORD" -d SBEcoLTDDW -I -b -W -s " | "' < "sql/$1"
}

echo "SBEcoLTDDW build started $(date)  REBUILD=$REBUILD  COURSE_ONLY=$COURSE_ONLY"
for f in 00_CreateDatabase.sql 01_CreateDW.sql 02_Dimension.sql 03_Fact.sql \
         05_View.sql 06_Columnstore.sql 08_Rebuild.sql \
         09_ClassifyWorkloads.sql 13_GrantSourceRead.sql; do
  run_sa "$f"
done

run_sa 99_Verify.sql

echo; echo "SBEcoLTDDW build finished $(date)  log: $BASE/$LOG"

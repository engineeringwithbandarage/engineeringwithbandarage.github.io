#!/usr/bin/env bash
# Run the reference analysis (analysis.py) against the energystats database; writes out/results.json.
set -e
PG=labenv_postgres-15_1
PGUSER=$(docker exec $PG printenv POSTGRES_USER)
PGPASSWORD=$(docker exec $PG printenv POSTGRES_PASSWORD)
docker run --rm --network container:$PG \
  -e PGHOST=localhost -e PGPORT=5432 -e PGUSER="$PGUSER" -e PGPASSWORD="$PGPASSWORD" -e PGDATABASE=energystats \
  -v ~/energy_stats:/work energy-stats-py:1 python scripts/analysis.py

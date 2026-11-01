#!/usr/bin/env bash
# Create database energystats (if missing) and run etl.py inside the energy-stats-py container.
set -e
PG=labenv_postgres-15_1
PGUSER=$(docker exec $PG printenv POSTGRES_USER)
PGPASSWORD=$(docker exec $PG printenv POSTGRES_PASSWORD)     # read, never printed
exists=$(docker exec $PG psql -U "$PGUSER" -d postgres -tAc "select 1 from pg_database where datname='energystats'")
if [ "$exists" != "1" ]; then
  docker exec $PG psql -U "$PGUSER" -d postgres -c "create database energystats"
else
  echo "database energystats already exists"
fi
docker run --rm --network container:$PG \
  -e PGHOST=localhost -e PGPORT=5432 -e PGUSER="$PGUSER" -e PGPASSWORD="$PGPASSWORD" -e PGDATABASE=energystats \
  -v ~/energy_stats:/work energy-stats-py:1 python scripts/etl.py
ls -la ~/energy_stats/out

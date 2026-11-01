#!/usr/bin/env bash
# Weekly refinery utilisation for each PADD region (EIA, public domain).
cd ~/energy_stats/raw || exit 1
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
for p in 1 2 3 4 5; do
  f="eia_refinery_util_padd${p}_w.xls"
  code=$(curl -sL -A "$UA" -m 120 -o "$f" -w '%{http_code}' "https://www.eia.gov/dnav/pet/hist_xls/W_NA_YUP_R${p}0_PERw.xls")
  echo "$f  HTTP $code  $(stat -c %s "$f") bytes  $(file -b --mime-type "$f")"
done
du -sh ~/energy_stats/raw

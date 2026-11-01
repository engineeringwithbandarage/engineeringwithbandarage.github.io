#!/usr/bin/env bash
# Download the open energy datasets used by the "Statistics for Daily Use" track into ~/energy_stats/raw.
# All sources are public domain or openly licensed (see sources page on the site).
set -u
RAW=~/energy_stats/raw
mkdir -p "$RAW"
cd "$RAW" || exit 1
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'

get() {  # get <file> <url>
  printf '%-34s ' "$1"
  code=$(curl -sL -A "$UA" -m 300 -o "$1" -w '%{http_code}' "$2")
  size=$(stat -c %s "$1" 2>/dev/null || echo 0)
  echo "HTTP $code  ${size} bytes"
}

SODIR='https://factpages.sodir.no/public?/Factpages/external/tableview'
SODIR_Q='&rs:Command=Render&rc:Toolbar=false&rc:Parameters=f&IpAddress=not_used&CultureCode=en&rs:Format=CSV&Top100=false'

# --- U.S. EIA (public domain) ---
get eia_brent_daily.xls     'https://www.eia.gov/dnav/pet/hist_xls/RBRTEd.xls'
get eia_wti_daily.xls       'https://www.eia.gov/dnav/pet/hist_xls/RWTCd.xls'
get eia_crude_stocks_w.xls  'https://www.eia.gov/dnav/pet/hist_xls/WCESTUS1w.xls'
get eia_refinery_util_w.xls 'https://www.eia.gov/dnav/pet/xls/PET_PNP_WIUP_DCU_NUS_W.xls'
get eia_gasoline_w.xls      'https://www.eia.gov/dnav/pet/hist_xls/EMM_EPMR_PTE_NUS_DPGw.xls'

# --- Our World in Data energy dataset (CC BY 4.0) ---
get owid_energy.csv         'https://owid-public.owid.io/data/energy/owid-energy-data.csv'
[ "$(stat -c %s owid_energy.csv)" -gt 100000 ] || get owid_energy.csv 'https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv'

# --- Norwegian Offshore Directorate FactPages (NLOD) ---
get sodir_field_reserves.csv       "${SODIR}/field_reserves${SODIR_Q}"
get sodir_wellbore_exploration.csv "${SODIR}/wellbore_exploration_all${SODIR_Q}"
get sodir_field_prod_monthly.csv   "${SODIR}/field_production_monthly${SODIR_Q}"

# --- World Bank commodity prices "Pink Sheet" (CC BY 4.0) ---
get wb_pinksheet_monthly.xlsx 'https://thedocs.worldbank.org/en/doc/5d903e848db1d1b83e0ec8f744e55570-0350012021/related/CMO-Historical-Data-Monthly.xlsx'

# --- U.S. PHMSA pipeline incidents (public domain) ---
get phmsa_hl_2010_present.zip 'https://www.phmsa.dot.gov/sites/phmsa.dot.gov/files/data_statistics/pipeline/accident_hazardous_liquid_jan2010_present.zip'

echo "## file types"
file -b --mime-type * | paste <(ls -1) - | column -t

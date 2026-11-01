"""
Energy statistics ETL: raw open datasets -> PostgreSQL (database energystats) + compact JSON extracts for the website.
Runs inside the energy-stats-py container:  /work = ~/energy_stats  (raw/, out/)
Env: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
"""
import json, os, re, math
import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

RAW, OUT = "/work/raw", "/work/out"
os.makedirs(OUT, exist_ok=True)
eng = create_engine(
    f"postgresql+psycopg2://{os.environ['PGUSER']}:{os.environ['PGPASSWORD']}@{os.environ.get('PGHOST','localhost')}:"
    f"{os.environ.get('PGPORT','5432')}/{os.environ.get('PGDATABASE','energystats')}")

def load(df, name):
    df.to_sql(name, eng, if_exists="replace", index=False, chunksize=5000, method="multi")
    print(f"  table {name:32s} {len(df):>7,d} rows  cols={list(df.columns)}")

def clean(o):
    """Recursively replace NaN/inf/NaT with None and numpy scalars with Python ones."""
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (float, np.floating)):
        return None if (math.isnan(o) or math.isinf(o)) else float(o)
    if o is pd.NaT:
        return None
    return o

def dump(obj, name):
    obj = clean(obj)
    path = f"{OUT}/{name}.json"
    with open(path, "w") as f:
        json.dump(obj, f, separators=(",", ":"), allow_nan=False)
    print(f"  json  {name + '.json':32s} {os.path.getsize(path)/1024:8.1f} KB")

def r(x, d=3):
    return None if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))) else round(float(x), d)

def eia_sheet(path, sheet="Data 1"):
    df = pd.read_excel(path, sheet_name=sheet, skiprows=2)
    df = df.rename(columns={df.columns[0]: "date"})
    df["date"] = pd.to_datetime(df["date"])
    return df

# ---------------------------------------------------------------- EIA prices (daily)
print("EIA daily spot prices")
brent = eia_sheet(f"{RAW}/eia_brent_daily.xls"); brent.columns = ["date", "brent"]
wti = eia_sheet(f"{RAW}/eia_wti_daily.xls");     wti.columns = ["date", "wti"]
px = brent.merge(wti, on="date", how="outer").sort_values("date")
px = px[(px["brent"].isna() | (px["brent"] > 0))]
load(px, "spot_price_daily")
both = px.dropna().reset_index(drop=True)
dump({"source": "U.S. EIA, Europe Brent & Cushing WTI spot price FOB (USD/bbl)",
      "date": both["date"].dt.strftime("%Y-%m-%d").tolist(),
      "brent": [r(v, 2) for v in both["brent"]], "wti": [r(v, 2) for v in both["wti"]]}, "spot_daily")

# ---------------------------------------------------------------- EIA weekly crude stocks
print("EIA weekly crude stocks")
st = eia_sheet(f"{RAW}/eia_crude_stocks_w.xls"); st.columns = ["week", "stocks_kbbl"]
st = st.dropna()
load(st, "crude_stocks_weekly")
dump({"source": "U.S. EIA, weekly U.S. ending stocks of crude oil excluding SPR (thousand barrels)",
      "week": st["week"].dt.strftime("%Y-%m-%d").tolist(), "stocks": [int(v) for v in st["stocks_kbbl"]]},
     "crude_stocks_weekly")

# ---------------------------------------------------------------- EIA refinery utilisation by PADD
print("EIA weekly refinery utilisation")
ru = eia_sheet(f"{RAW}/eia_refinery_util_w.xls")
cols = {"date": "week"}
for c in ru.columns[1:]:
    m = re.search(r"PADD (\d)", c)
    if "Utilization" in c or "Utilization" in c.replace("Utiliz", "Utiliz"):
        cols[c] = f"padd{m.group(1)}" if m else ("us" if "U.S." in c else c)
ru = ru.rename(columns=cols)[[v for v in cols.values()]]
for p in range(1, 6):                                   # per-PADD series files
    f = f"{RAW}/eia_refinery_util_padd{p}_w.xls"
    if os.path.exists(f):
        s = eia_sheet(f); s.columns = ["week", f"padd{p}"]
        ru = ru.merge(s, on="week", how="outer")
ru = ru.sort_values("week")
keep = ["week", "us"] + [f"padd{i}" for i in range(1, 6)]
print("  columns found:", list(ru.columns))
ru = ru[[c for c in keep if c in ru.columns]]
print("  non-null per region:", ru.notna().sum().to_dict(), " first week per region:",
      {c: str(ru.loc[ru[c].notna(), "week"].min().date()) for c in ru.columns if c != "week"})
ru = ru.dropna(subset=[c for c in ru.columns if c != "week"], how="all")
long = ru.melt(id_vars="week", var_name="region", value_name="utilization_pct").dropna()
load(long, "refinery_utilization_weekly")
dump({"source": "U.S. EIA, weekly percent utilization of refinery operable capacity",
      "week": ru["week"].dt.strftime("%Y-%m-%d").tolist(),
      **{c: [r(v, 1) for v in ru[c]] for c in ru.columns if c != "week"}}, "refinery_util_weekly")

# ---------------------------------------------------------------- EIA weekly gasoline + monthly join with crude
print("EIA weekly gasoline")
g = eia_sheet(f"{RAW}/eia_gasoline_w.xls"); g.columns = ["week", "gasoline_usd_gal"]
g = g.dropna()
load(g, "gasoline_retail_weekly")
gm = g.set_index("week")["gasoline_usd_gal"].resample("MS").mean()
bm = px.set_index("date")[["brent", "wti"]].resample("MS").mean()
mj = pd.concat([gm, bm], axis=1).dropna().reset_index().rename(columns={"index": "month", "week": "month"})
mj.columns = ["month", "gasoline", "brent", "wti"]
load(mj, "gasoline_crude_monthly")
dump({"source": "U.S. EIA; monthly averages of weekly U.S. regular retail gasoline (USD/gal) and daily Brent/WTI (USD/bbl)",
      "month": mj["month"].dt.strftime("%Y-%m").tolist(),
      "gasoline": [r(v, 3) for v in mj["gasoline"]], "brent": [r(v, 2) for v in mj["brent"]], "wti": [r(v, 2) for v in mj["wti"]]},
     "gasoline_crude_monthly")

# ---------------------------------------------------------------- OWID country energy panel
print("OWID energy data")
ow = pd.read_csv(f"{RAW}/owid_energy.csv")
keepc = ["country", "year", "iso_code", "population", "gdp", "oil_production", "oil_consumption", "gas_production",
         "gas_consumption", "coal_production", "oil_prod_per_capita", "oil_energy_per_capita", "energy_per_capita",
         "renewables_share_energy", "fossil_share_energy", "greenhouse_gas_emissions", "primary_energy_consumption",
         "electricity_generation", "carbon_intensity_elec"]
ow = ow[[c for c in keepc if c in ow.columns]]
ow = ow[ow["iso_code"].notna() & ~ow["iso_code"].astype(str).str.startswith("OWID")]
load(ow, "owid_country_energy")
recent = ow[ow["year"] >= 2015]
for c in ["oil_production", "oil_consumption", "energy_per_capita", "renewables_share_energy", "population"]:
    print(f"  coverage {c:26s}", recent.groupby("year")[c].count().to_dict())
cov = recent.groupby("year")["energy_per_capita"].count()
year = int(cov[cov >= 200].index.max())         # latest year with (almost) every country present
snap = ow[ow["year"] == year].copy()
prodcols = ["country", "iso_code", "population", "oil_production", "oil_consumption", "gas_production",
            "energy_per_capita", "renewables_share_energy", "fossil_share_energy", "primary_energy_consumption"]
snap = snap[[c for c in prodcols if c in snap.columns]]
dump({"source": f"Our World in Data energy dataset (Energy Institute Statistical Review & others), CC BY 4.0; year {year}; energy in TWh",
      "year": year, "rows": [{k: (r(v, 3) if isinstance(v, (float, np.floating)) else v) for k, v in row.items()}
                             for row in snap.to_dict("records")]}, "owid_countries")
# long-run world-ish trend for a few big producers
big = ["United States", "Saudi Arabia", "Russia", "Norway", "Canada", "China", "Iran", "Iraq", "Brazil", "United Arab Emirates"]
tr = ow[ow["country"].isin(big) & (ow["year"] >= 1965)][["country", "year", "oil_production", "oil_consumption"]]
dump({"source": "Our World in Data energy dataset, CC BY 4.0 (TWh)",
      "rows": [[row.country, int(row.year), r(row.oil_production, 1), r(row.oil_consumption, 1)] for row in tr.itertuples()]},
     "owid_top_producers")

# ---------------------------------------------------------------- Sodir: field reserves (latest version per field)
print("Sodir field reserves")
fr = pd.read_csv(f"{RAW}/sodir_field_reserves.csv", encoding="utf-8-sig")
fr = fr.sort_values("fldVersion").groupby("fldName").tail(1)
fr = fr.rename(columns={"fldName": "field", "fldVersion": "version", "fldRecoverableOil": "recoverable_oil_msm3",
                        "fldRecoverableGas": "recoverable_gas_bsm3", "fldRecoverableOE": "recoverable_oe_msm3",
                        "fldRemainingOE": "remaining_oe_msm3", "fldNpdidField": "npdid_field"})
fr = fr[["field", "version", "recoverable_oil_msm3", "recoverable_gas_bsm3", "recoverable_oe_msm3", "remaining_oe_msm3", "npdid_field"]]
load(fr, "ncs_field_reserves")
dump({"source": "Norwegian Offshore Directorate FactPages (NLOD); latest reserve estimate per field; million Sm3 o.e.",
      "rows": [[row.field, r(row.recoverable_oe_msm3, 2), r(row.recoverable_oil_msm3, 2), r(row.recoverable_gas_bsm3, 2)]
               for row in fr.sort_values("recoverable_oe_msm3", ascending=False).itertuples()]},
     "ncs_fields")

# ---------------------------------------------------------------- Sodir: exploration wellbores
print("Sodir exploration wellbores")
wb = pd.read_csv(f"{RAW}/sodir_wellbore_exploration.csv", encoding="utf-8-sig", low_memory=False)
wb = wb.rename(columns={"wlbWellboreName": "wellbore", "wlbPurpose": "purpose", "wlbStatus": "status",
                        "wlbContent": "content", "wlbMainArea": "main_area", "wlbEntryYear": "entry_year",
                        "wlbCompletionYear": "completion_year", "wlbWaterDepth": "water_depth_m",
                        "wlbTotalDepth": "total_depth_m", "wlbDrillingDays": "drilling_days",
                        "wlbDrillingOperator": "operator", "wlbDiscovery": "discovery", "wlbEntryDate": "entry_date"})
wb["entry_date"] = pd.to_datetime(wb["entry_date"], format="%d.%m.%Y", errors="coerce")
wb["entry_month"] = wb["entry_date"].dt.month
wb = wb[["wellbore", "purpose", "status", "content", "main_area", "entry_date", "entry_month", "entry_year", "completion_year",
         "water_depth_m", "total_depth_m", "drilling_days", "operator", "discovery"]]
load(wb, "ncs_exploration_wells")
print("  purpose:", wb["purpose"].value_counts().to_dict())
print("  content:", wb["content"].value_counts().to_dict())
print("  main_area:", wb["main_area"].value_counts().to_dict())
dump({"source": "Norwegian Offshore Directorate FactPages (NLOD); exploration wellbores",
      "cols": ["wellbore", "purpose", "content", "main_area", "entry_year", "entry_month", "water_depth_m", "total_depth_m", "drilling_days"],
      "rows": [[row.wellbore, row.purpose, row.content, row.main_area,
                None if pd.isna(row.entry_year) else int(row.entry_year),
                None if pd.isna(row.entry_month) else int(row.entry_month), r(row.water_depth_m, 0),
                r(row.total_depth_m, 0), None if pd.isna(row.drilling_days) else int(row.drilling_days)]
               for row in wb.itertuples()]}, "ncs_wells")

# ---------------------------------------------------------------- Sodir: monthly production
print("Sodir monthly production")
mp = pd.read_csv(f"{RAW}/sodir_field_prod_monthly.csv", encoding="utf-8-sig")
mp = mp.rename(columns={"prfInformationCarrier": "field", "prfYear": "year", "prfMonth": "month",
                        "prfPrdOilNetMillSm3": "oil_msm3", "prfPrdGasNetBillSm3": "gas_bsm3",
                        "prfPrdOeNetMillSm3": "oe_msm3", "prfPrdProducedWaterInFieldMillSm3": "water_msm3"})
mp = mp[["field", "year", "month", "oil_msm3", "gas_bsm3", "oe_msm3", "water_msm3"]]
load(mp, "ncs_field_production_monthly")
tot = mp.groupby(["year", "month"], as_index=False)[["oil_msm3", "gas_bsm3", "oe_msm3"]].sum()
top = mp.groupby("field")["oe_msm3"].sum().sort_values(ascending=False).head(12).index.tolist()
dump({"source": "Norwegian Offshore Directorate FactPages (NLOD); net saleable monthly production",
      "total": [[int(t.year), int(t.month), r(t.oil_msm3, 4), r(t.gas_bsm3, 4)] for t in tot.itertuples()],
      "fields": {f: [[int(t.year), int(t.month), r(t.oil_msm3, 5), r(t.gas_bsm3, 5), r(t.water_msm3, 5)]
                     for t in mp[mp["field"] == f].sort_values(["year", "month"]).itertuples()] for f in top}},
     "ncs_production")

# ---------------------------------------------------------------- World Bank Pink Sheet (monthly)
print("World Bank Pink Sheet")
raw = pd.read_excel(f"{RAW}/wb_pinksheet_monthly.xlsx", sheet_name="Monthly Prices", header=None)
hdr = raw.index[raw.apply(lambda row: row.astype(str).str.contains("Crude oil, Brent").any(), axis=1)][0]
names = raw.iloc[hdr].tolist()
data = raw.iloc[hdr + 2:].copy(); data.columns = ["period"] + names[1:]
data = data[data["period"].astype(str).str.match(r"^\d{4}M\d{2}$")]
want = {"Crude oil, Brent": "brent", "Crude oil, Dubai": "dubai", "Crude oil, WTI": "wti",
        "Natural gas, US": "gas_us", "Natural gas, Europe": "gas_europe", "Liquefied natural gas, Japan": "lng_japan",
        "Coal, Australian": "coal_australia"}
present = {k: v for k, v in want.items() if k in data.columns}
wbm = data[["period"] + list(present)].rename(columns=present)
wbm["month"] = pd.to_datetime(wbm["period"].str.replace("M", "-") + "-01")
for c in present.values():
    wbm[c] = pd.to_numeric(wbm[c], errors="coerce")
wbm = wbm.drop(columns="period")
load(wbm.melt(id_vars="month", var_name="commodity", value_name="price").dropna(), "wb_commodity_prices_monthly")
dump({"source": "World Bank Commodity Price Data (The Pink Sheet), CC BY 4.0; nominal USD (oil $/bbl, gas $/mmbtu, coal $/mt)",
      "month": wbm["month"].dt.strftime("%Y-%m").tolist(),
      **{c: [r(v, 3) for v in wbm[c]] for c in present.values()}}, "wb_monthly")

with eng.begin() as con:
    n = con.execute(text("select count(*) from information_schema.tables where table_schema='public'")).scalar()
print(f"done: {n} tables in energystats")

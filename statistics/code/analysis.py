"""
Reference analysis for "Statistics for Daily Use" (energy edition).
Reads the energystats database, computes every number quoted on the website with scipy/statsmodels,
and writes /work/out/results.json.  Pages read their prose numbers from this file.
"""
import json, os, math
import numpy as np
import pandas as pd
from scipy import stats
from sqlalchemy import create_engine
import statsmodels.api as sm
import statsmodels.formula.api as smf
from statsmodels.stats.multicomp import pairwise_tukeyhsd
from statsmodels.stats.multitest import multipletests
from statsmodels.tsa.stattools import acf

eng = create_engine(
    f"postgresql+psycopg2://{os.environ['PGUSER']}:{os.environ['PGPASSWORD']}@{os.environ.get('PGHOST','localhost')}:"
    f"{os.environ.get('PGPORT','5432')}/{os.environ.get('PGDATABASE','energystats')}")
q = lambda sql: pd.read_sql(sql, eng)
rng = np.random.default_rng(20261018)
R = {}

def f(x, d=4):
    if x is None: return None
    x = float(x)
    return None if (math.isnan(x) or math.isinf(x)) else round(x, d)

def five(s):
    s = pd.Series(s).dropna()
    q1, med, q3 = np.percentile(s, [25, 50, 75])
    return {"n": int(s.size), "min": f(s.min()), "q1": f(q1), "median": f(med), "q3": f(q3), "max": f(s.max()),
            "mean": f(s.mean()), "sd": f(s.std(ddof=1)), "iqr": f(q3 - q1)}

# ------------------------------------------------------------------ shared frames
wells = q("select * from ncs_exploration_wells")
HC = {"OIL", "GAS", "OIL/GAS", "GAS/CONDENSATE", "OIL/GAS/CONDENSATE"}
NOHC = {"DRY", "SHOWS", "OIL SHOWS", "GAS SHOWS", "OIL/GAS SHOWS", "WATER", "WATER/GAS"}
w = wells[(wells.purpose == "WILDCAT") & wells.content.isin(HC | NOHC) & wells.entry_year.notna()].copy()
w["discovery"] = w.content.isin(HC).astype(int)
w["decade"] = (w.entry_year // 10 * 10).astype(int)
w["fluid"] = np.select([w.content.isin({"OIL"}), w.content.isin({"GAS", "GAS/CONDENSATE"}),
                        w.content.isin({"OIL/GAS", "OIL/GAS/CONDENSATE"})], ["oil", "gas", "oil+gas"], "none")

px = q("select date, brent, wti from spot_price_daily where brent is not null and wti is not null order by date")
px["date"] = pd.to_datetime(px.date)
px["r_brent"] = np.log(px.brent).diff() * 100           # daily log return, %
pm = px.set_index("date")[["brent", "wti"]].resample("MS").mean()
pm["r_brent"] = np.log(pm.brent).diff() * 100            # monthly log return of monthly average, %

fields = q("select * from ncs_field_reserves where recoverable_oe_msm3 > 0")
owid = q("select * from owid_country_energy")
ru = q("select * from refinery_utilization_weekly")
ru["week"] = pd.to_datetime(ru.week)
stocks = q("select week, stocks_kbbl from crude_stocks_weekly order by week")
stocks["week"] = pd.to_datetime(stocks.week)
gm = q("select * from gasoline_crude_monthly order by month")
wb = q("select * from wb_commodity_prices_monthly")

# ================================================================== CH01 population vs sample
snap_year = int(owid[owid.energy_per_capita.notna()].groupby("year").size().loc[lambda s: s >= 200].index.max())
epc = owid[(owid.year == snap_year) & owid.energy_per_capita.notna()].energy_per_capita
samp = rng.choice(epc.values, size=20, replace=False)
R["ch01"] = {"year": snap_year, "n_countries": int(epc.size), "pop_mean_epc": f(epc.mean(), 0),
             "sample20_mean_epc": f(samp.mean(), 0),
             "wildcats_n": int(len(w)), "wildcat_rate_all": f(w.discovery.mean()),
             "strata": {a: {"n": int(len(g)), "rate": f(g.discovery.mean())} for a, g in w.groupby("main_area")}}

# ================================================================== CH02 seeing data
f2 = fields.recoverable_oe_msm3
prod = owid[(owid.year == snap_year) & owid.oil_production.notna() & (owid.oil_production > 0)].oil_production
content_counts = wells[wells.purpose == "WILDCAT"].content.value_counts().to_dict()
r_daily = px.r_brent.dropna()
z_epc = (epc - epc.mean()) / epc.std(ddof=1)
top_z = owid[(owid.year == snap_year) & owid.energy_per_capita.notna()].assign(z=z_epc.values).nlargest(5, "z")
k1 = (abs(r_daily - r_daily.mean()) <= 1 * r_daily.std()).mean()
k2 = (abs(r_daily - r_daily.mean()) <= 2 * r_daily.std()).mean()
k3 = (abs(r_daily - r_daily.mean()) <= 3 * r_daily.std()).mean()
trim = stats.trim_mean(f2, 0.05)
ann = px.set_index("date").brent.resample("YS").last()
ann_ret = (np.log(ann).diff() * 100).dropna()
by_dec = {int(d): five(g.values) for d, g in ann_ret.groupby((ann_ret.index.year // 10) * 10)}
R["ch02"] = {"fields": five(f2), "fields_trimmed5": f(trim), "fields_top10_share": f(f2.nlargest(10).sum() / f2.sum()),
             "fields_skew": f(stats.skew(f2)), "prod": five(prod), "prod_year": snap_year,
             "epc": five(epc), "epc_top_z": [[r.country, f(r.z, 2), f(r.energy_per_capita, 0)] for r in top_z.itertuples()],
             "wildcat_content": {k: int(v) for k, v in content_counts.items()},
             "brent_daily_ret": five(r_daily), "brent_ret_skew": f(stats.skew(r_daily)),
             "brent_ret_kurt": f(stats.kurtosis(r_daily)),
             "within_k_sd": {"1": f(k1), "2": f(k2), "3": f(k3)},
             "annual_ret_by_decade": by_dec}

# ================================================================== CH03 probability (wildcats: area x outcome)
ct = pd.crosstab(w.main_area, w.discovery)
tot = int(ct.values.sum())
p_disc = w.discovery.mean()
cond = {a: f(ct.loc[a, 1] / ct.loc[a].sum()) for a in ct.index}
p_area = {a: f(ct.loc[a].sum() / tot) for a in ct.index}
p_area_given_disc = {a: f(ct.loc[a, 1] / ct[1].sum()) for a in ct.index}
R["ch03"] = {"table": {a: {"discovery": int(ct.loc[a, 1]), "no_discovery": int(ct.loc[a, 0])} for a in ct.index},
             "total": tot, "p_discovery": f(p_disc), "p_disc_given_area": cond, "p_area": p_area,
             "p_area_given_disc": p_area_given_disc,
             "p_two_in_a_row_indep": f(p_disc ** 2),
             "comb_5_of_12": math.comb(12, 5), "perm_3_of_8": math.perm(8, 3)}

# ================================================================== CH04 distributions
recent = w[(w.entry_year >= 2015) & (w.entry_year <= 2024)]
p_rec = recent.discovery.mean()
binom10 = {str(k): f(stats.binom.pmf(k, 10, p_rec)) for k in range(11)}
spud = w[(w.entry_year >= 2000) & (w.entry_year <= 2024)].groupby("entry_year").size()
disc_year = w[(w.entry_year >= 2000) & (w.entry_year <= 2024)].groupby("entry_year").discovery.sum()
lam = disc_year.mean()
mret = pm.r_brent.dropna()
sh_d = stats.shapiro(r_daily.sample(5000, random_state=1)) if len(r_daily) > 5000 else stats.shapiro(r_daily)
tail_obs = (abs((r_daily - r_daily.mean()) / r_daily.std()) > 4).sum()
tail_exp = len(r_daily) * 2 * stats.norm.sf(4)
n40 = 40
R["ch04"] = {"p_recent": f(p_rec), "n_recent": int(len(recent)), "binom10": binom10,
             "binom10_mean": f(10 * p_rec), "binom10_sd": f(math.sqrt(10 * p_rec * (1 - p_rec))),
             "p_at_least_3_of_10": f(stats.binom.sf(2, 10, p_rec)), "p_zero_of_10": f(stats.binom.pmf(0, 10, p_rec)),
             "disc_per_year": {int(k): int(v) for k, v in disc_year.items()}, "poisson_lambda": f(lam),
             "disc_var": f(disc_year.var(ddof=1)), "dispersion": f(disc_year.var(ddof=1) / lam),
             "p_poisson_ge_25": f(stats.poisson.sf(24, lam)),
             "daily_ret_mean": f(r_daily.mean()), "daily_ret_sd": f(r_daily.std()),
             "tail4_observed": int(tail_obs), "tail4_expected_normal": f(tail_exp, 2),
             "monthly_ret_mean": f(mret.mean()), "monthly_ret_sd": f(mret.std()),
             "shapiro_daily_p": f(sh_d.pvalue, 6), "shapiro_monthly_p": f(stats.shapiro(mret).pvalue, 6),
             "normal_approx_40": {"exact_ge_15": f(stats.binom.sf(14, n40, p_rec)),
                                  "approx_ge_15": f(stats.norm.sf(14.5, n40 * p_rec, math.sqrt(n40 * p_rec * (1 - p_rec))))}}

# ================================================================== CH05 sampling distributions / CLT
mu, sigma = f2.mean(), f2.std(ddof=0)
clt = {}
for n in [2, 5, 15, 30, 60]:
    means = np.array([rng.choice(f2.values, n, replace=True).mean() for _ in range(20000)])
    clt[str(n)] = {"mean_of_means": f(means.mean()), "sd_of_means": f(means.std()), "theory_se": f(sigma / math.sqrt(n)),
                   "skew_of_means": f(stats.skew(means))}
R["ch05"] = {"pop_n": int(f2.size), "pop_mean": f(mu), "pop_sd": f(sigma), "pop_skew": f(stats.skew(f2)), "clt": clt}

# ================================================================== CH06 confidence intervals
d = recent.drilling_days.dropna()
tcrit = stats.t.ppf(0.975, len(d) - 1)
ci_days = (d.mean() - tcrit * d.std(ddof=1) / math.sqrt(len(d)), d.mean() + tcrit * d.std(ddof=1) / math.sqrt(len(d)))
x, n = int(recent.discovery.sum()), int(len(recent))
ph = x / n; se = math.sqrt(ph * (1 - ph) / n)
pt = (x + 2) / (n + 4); se4 = math.sqrt(pt * (1 - pt) / (n + 4))
s_m = mret.std(ddof=1); nm = len(mret)
ci_sd = (math.sqrt((nm - 1) * s_m ** 2 / stats.chi2.ppf(0.975, nm - 1)), math.sqrt((nm - 1) * s_m ** 2 / stats.chi2.ppf(0.025, nm - 1)))
n_needed = math.ceil((1.96 * 0.5 / 0.05) ** 2)
n_needed_guess = math.ceil(1.96 ** 2 * ph * (1 - ph) / 0.05 ** 2)
u23 = ru[(ru.region == "us") & (ru.week.dt.year == 2023)].utilization_pct
R["ch06"] = {"days": {"n": int(len(d)), "mean": f(d.mean()), "sd": f(d.std(ddof=1)), "t": f(tcrit), "lo": f(ci_days[0]), "hi": f(ci_days[1])},
             "rate": {"x": x, "n": n, "phat": f(ph), "lo": f(ph - 1.96 * se), "hi": f(ph + 1.96 * se),
                      "plus4_lo": f(pt - 1.96 * se4), "plus4_hi": f(pt + 1.96 * se4)},
             "vol": {"n": int(nm), "s": f(s_m), "lo": f(ci_sd[0]), "hi": f(ci_sd[1])},
             "n_for_5pct_worst": n_needed, "n_for_5pct_guess": n_needed_guess,
             "util2023": {"n": int(len(u23)), "mean": f(u23.mean()), "sd": f(u23.std(ddof=1)),
                          "lo": f(u23.mean() - stats.t.ppf(.975, len(u23) - 1) * u23.std(ddof=1) / math.sqrt(len(u23))),
                          "hi": f(u23.mean() + stats.t.ppf(.975, len(u23) - 1) * u23.std(ddof=1) / math.sqrt(len(u23)))}}

# ================================================================== CH07 hypothesis tests
chg = stocks.set_index("week").stocks_kbbl.diff().dropna()
chg = chg[(chg.index.year >= 2015) & (chg.index.year <= 2024)]
tt = stats.ttest_1samp(chg, 0)
wil = stats.wilcoxon(chg)
prop = stats.binomtest(x, n, 1 / 3)
z_prop = (ph - 1 / 3) / math.sqrt((1 / 3) * (2 / 3) / n)
# power of a two-sided one-sample t-test to detect a 300 kbbl/week drift with the observed SD
sd_chg = chg.std(ddof=1); nn = len(chg)
def power_t(delta, sd, n, alpha=0.05):
    df = n - 1; ncp = delta / (sd / math.sqrt(n)); tc = stats.t.ppf(1 - alpha / 2, df)
    return stats.nct.sf(tc, df, ncp) + stats.nct.cdf(-tc, df, ncp)
R["ch07"] = {"stock_chg": {"n": int(nn), "mean": f(chg.mean(), 1), "sd": f(sd_chg, 1), "t": f(tt.statistic), "p": f(tt.pvalue),
                           "wilcoxon_p": f(wil.pvalue), "median": f(chg.median(), 1)},
             "prop_test": {"x": x, "n": n, "phat": f(ph), "p0": f(1 / 3), "z": f(z_prop), "p_two_sided_exact": f(prop.pvalue),
                           "p_two_sided_z": f(2 * stats.norm.sf(abs(z_prop)))},
             "power": {str(dl): f(power_t(dl, sd_chg, nn)) for dl in [100, 200, 300, 500, 800]},
             "power_n52_300": f(power_t(300, sd_chg, 52))}

# ================================================================== CH08 two groups
# paired: Brent vs WTI monthly averages
sp = pm.dropna(subset=["brent", "wti"])
spread = sp.brent - sp.wti
pre, post = spread[spread.index.year <= 2010], spread[(spread.index.year >= 2011)]
pt_post = stats.ttest_rel(sp[sp.index.year >= 2011].brent, sp[sp.index.year >= 2011].wti)
pt_pre = stats.ttest_rel(sp[sp.index.year <= 2010].brent, sp[sp.index.year <= 2010].wti)
wil_post = stats.wilcoxon(post)
# Welch: PADD3 utilisation summer vs winter (2010+)
p3 = ru[ru.region == "padd3"].copy(); p3["m"] = p3.week.dt.month
summer, winter = p3[p3.m.isin([6, 7, 8])].utilization_pct, p3[p3.m.isin([12, 1, 2])].utilization_pct
welch = stats.ttest_ind(summer, winter, equal_var=False)
pooled = stats.ttest_ind(summer, winter, equal_var=True)
# Mann-Whitney: drilling days North Sea vs Barents Sea wildcats (2000+)
w2k = w[w.entry_year >= 2000]
dn = w2k[w2k.main_area == "NORTH SEA"].drilling_days.dropna(); db_ = w2k[w2k.main_area == "BARENTS SEA"].drilling_days.dropna()
mw = stats.mannwhitneyu(dn, db_, alternative="two-sided")
# F test for volatility: monthly returns 2010-14 vs 2015-19
v1 = mret[(mret.index.year >= 2010) & (mret.index.year <= 2014)]; v2 = mret[(mret.index.year >= 2015) & (mret.index.year <= 2019)]
F = v2.var(ddof=1) / v1.var(ddof=1)
pF = 2 * min(stats.f.sf(F, len(v2) - 1, len(v1) - 1), stats.f.cdf(F, len(v2) - 1, len(v1) - 1))
lev = stats.levene(v1, v2)
# two proportions: 1990s vs 2010s
a = w[w.decade == 1990]; b = w[w.decade == 2010]
p1, p2 = a.discovery.mean(), b.discovery.mean(); n1, n2 = len(a), len(b)
pp = (a.discovery.sum() + b.discovery.sum()) / (n1 + n2)
z2 = (p2 - p1) / math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2))
se_d = math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
R["ch08"] = {"spread": {"pre_mean": f(pre.mean()), "post_mean": f(post.mean()), "pre_n": int(len(pre)), "post_n": int(len(post)),
                        "post_sd": f(post.std(ddof=1)), "t_post": f(pt_post.statistic), "p_post": f(pt_post.pvalue, 8),
                        "t_pre": f(pt_pre.statistic), "p_pre": f(pt_pre.pvalue, 8), "wilcoxon_post_p": f(wil_post.pvalue, 8)},
             "padd3": {"summer": five(summer), "winter": five(winter), "welch_t": f(welch.statistic), "welch_p": f(welch.pvalue, 8),
                       "pooled_t": f(pooled.statistic), "pooled_p": f(pooled.pvalue, 8)},
             "days": {"north": five(dn), "barents": five(db_), "U": f(mw.statistic, 1), "p": f(mw.pvalue, 8)},
             "vol": {"s1": f(v1.std(ddof=1)), "s2": f(v2.std(ddof=1)), "n1": int(len(v1)), "n2": int(len(v2)), "F": f(F), "p": f(pF, 6),
                     "levene_p": f(lev.pvalue, 6)},
             "props": {"p1990s": f(p1), "n1990s": int(n1), "p2010s": f(p2), "n2010s": int(n2), "z": f(z2),
                       "p": f(2 * stats.norm.sf(abs(z2)), 8), "diff_lo": f(p2 - p1 - 1.96 * se_d), "diff_hi": f(p2 - p1 + 1.96 * se_d)}}

# ================================================================== CH09 chi-square
ct2 = pd.crosstab(w.main_area, w.fluid)
chi = stats.chi2_contingency(ct2)
# goodness of fit: are wildcats spudded evenly across the 12 months? (2000-2024)
sm_ = w[(w.entry_year >= 2000) & (w.entry_year <= 2024) & w.entry_month.notna()].entry_month.astype(int)
obs_m = sm_.value_counts().reindex(range(1, 13), fill_value=0)
gof = stats.chisquare(obs_m.values)
bar_m = w[(w.entry_year >= 2000) & (w.entry_year <= 2024) & (w.main_area == "BARENTS SEA") & w.entry_month.notna()].entry_month.astype(int)
obs_b = bar_m.value_counts().reindex(range(1, 13), fill_value=0)
gof_b = stats.chisquare(obs_b.values)
R["ch09"] = {"months_obs": [int(v) for v in obs_m.values], "months_chi2": f(gof.statistic), "months_p": f(gof.pvalue, 10),
             "barents_months_obs": [int(v) for v in obs_b.values], "barents_chi2": f(gof_b.statistic), "barents_p": f(gof_b.pvalue, 12),
             "barents_n": int(obs_b.sum()), "months_n": int(obs_m.sum())}
R["ch09"] |= {"area_fluid": {a: {k: int(v) for k, v in row.items()} for a, row in ct2.iterrows()},
             "chi2": f(chi.statistic), "df": int(chi.dof), "p": f(chi.pvalue, 12),
             "expected": {a: {k: f(v, 1) for k, v in zip(ct2.columns, row)} for a, row in zip(ct2.index, chi.expected_freq)},
             "cramers_v": f(math.sqrt(chi.statistic / (ct2.values.sum() * (min(ct2.shape) - 1))))}
# homogeneity: outcome distribution by decade
ct3 = pd.crosstab(w.decade, w.fluid)
chi3 = stats.chi2_contingency(ct3)
R["ch09"]["decade_fluid"] = {int(dk): {k: int(v) for k, v in row.items()} for dk, row in ct3.iterrows()}
R["ch09"]["decade_chi2"] = f(chi3.statistic); R["ch09"]["decade_df"] = int(chi3.dof); R["ch09"]["decade_p"] = f(chi3.pvalue, 12)

# ================================================================== CH10 regression
reg = gm.dropna()
ols = smf.ols("gasoline ~ brent", data=reg).fit()
x0 = pd.DataFrame({"brent": [80.0]})
pr = ols.get_prediction(x0).summary_frame(alpha=0.05)
r_pw = stats.pearsonr(reg.brent, reg.gasoline)
dw = sm.stats.stattools.durbin_watson(ols.resid)
ret = pd.DataFrame({"b": np.log(pm.brent).diff(), "w": np.log(pm.wti).diff()}).dropna()
r_bw = stats.pearsonr(ret.b, ret.w)
wbp = wb.pivot_table(index="month", columns="commodity", values="price").dropna(subset=["brent", "gas_us"])
wbp = wbp[wbp.index >= pd.Timestamp("2000-01-01")]
r_bg = stats.pearsonr(np.log(wbp.brent).diff().dropna(), np.log(wbp.gas_us).diff().dropna())
R["ch10"] = {"n": int(len(reg)), "b0": f(ols.params["Intercept"]), "b1": f(ols.params["brent"], 5), "r2": f(ols.rsquared),
             "se_b1": f(ols.bse["brent"], 6), "t_b1": f(ols.tvalues["brent"], 2), "s_e": f(math.sqrt(ols.scale)),
             "ci_b1": [f(v, 5) for v in ols.conf_int().loc["brent"]], "r": f(r_pw.statistic),
             "at80": {"fit": f(pr["mean"][0]), "ci": [f(pr["mean_ci_lower"][0]), f(pr["mean_ci_upper"][0])],
                      "pi": [f(pr["obs_ci_lower"][0]), f(pr["obs_ci_upper"][0])]},
             "gallons_per_barrel_implied": f(1 / ols.params["brent"], 1), "durbin_watson": f(dw),
             "r_brent_wti_monthly_returns": f(r_bw.statistic), "r_brent_hh_monthly_returns": f(r_bg.statistic),
             "p_brent_hh": f(r_bg.pvalue, 6), "n_brent_hh": int(len(wbp) - 1),
             "first_month": str(reg.month.min())[:7], "last_month": str(reg.month.max())[:7]}

# ================================================================== CH11 ANOVA
wd = w[(w.entry_year >= 2000) & w.water_depth_m.notna()]
groups = [g.water_depth_m.values for _, g in wd.groupby("main_area")]
an = stats.f_oneway(*groups)
kw = stats.kruskal(*groups)
tk = pairwise_tukeyhsd(wd.water_depth_m, wd.main_area)
tk_rows = [[str(r[0]), str(r[1]), f(r[2], 1), f(r[3], 6), f(r[4], 1), f(r[5], 1), bool(r[6])] for r in tk._results_table.data[1:]]
model = smf.ols("water_depth_m ~ C(main_area)", data=wd).fit()
at = sm.stats.anova_lm(model, typ=1)
# PADD utilisation 2023 (secondary example)
pu = ru[(ru.week.dt.year == 2023) & ru.region.str.startswith("padd")]
an2 = stats.f_oneway(*[g.utilization_pct.values for _, g in pu.groupby("region")])
R["ch11"] = {"groups": {a: five(g.water_depth_m) for a, g in wd.groupby("main_area")},
             "F": f(an.statistic, 2), "p": f(an.pvalue, 12), "kw_H": f(kw.statistic, 2), "kw_p": f(kw.pvalue, 12),
             "ss_between": f(at["sum_sq"].iloc[0], 0), "ss_within": f(at["sum_sq"].iloc[1], 0),
             "df_between": int(at["df"].iloc[0]), "df_within": int(at["df"].iloc[1]), "tukey": tk_rows,
             "eta2": f(at["sum_sq"].iloc[0] / at["sum_sq"].sum()),
             "padd2023": {"means": {k: f(g.utilization_pct.mean(), 2) for k, g in pu.groupby("region")}, "F": f(an2.statistic, 2), "p": f(an2.pvalue, 12)}}

# ================================================================== CH12 hero level
boot = np.array([np.median(rng.choice(f2.values, f2.size, replace=True)) for _ in range(10000)])
# permutation test: 1990s vs 2010s discovery rate
pool = np.concatenate([a.discovery.values, b.discovery.values]); obs = p2 - p1; cnt = 0; B = 10000
for _ in range(B):
    rng.shuffle(pool); cnt += abs(pool[n1:].mean() - pool[:n1].mean()) >= abs(obs)
# multiple testing: 12 calendar months, is mean monthly return different from 0?
mr = mret.to_frame("r"); mr["m"] = mr.index.month
pvals = [stats.ttest_1samp(g.r, 0).pvalue for _, g in mr.groupby("m")]
bonf = multipletests(pvals, method="bonferroni")[1]; bh = multipletests(pvals, method="fdr_bh")[1]
# autocorrelation: weekly US utilisation and Brent price level vs returns
us = ru[ru.region == "us"].sort_values("week").utilization_pct.values
rho1 = acf(us, nlags=1)[1]; n_eff = len(us) * (1 - rho1) / (1 + rho1)
# Bayesian beta-binomial: Barents Sea recent wildcats with prior from North Sea history
ns = w[(w.main_area == "NORTH SEA") & (w.entry_year < 2015)]
bs = w[(w.main_area == "BARENTS SEA") & (w.entry_year >= 2015)]
a0 = ns.discovery.sum() / 20 + 1; b0 = (len(ns) - ns.discovery.sum()) / 20 + 1    # prior worth ~len/20 wells
ap, bp = a0 + bs.discovery.sum(), b0 + len(bs) - bs.discovery.sum()
# logistic regression: discovery ~ water depth (100 m) + area, wildcats 2000+
lg = w[(w.entry_year >= 2000) & w.water_depth_m.notna()].copy(); lg["wd100"] = lg.water_depth_m / 100
logit = smf.logit("discovery ~ wd100 + C(main_area)", data=lg).fit(disp=0)
# multiple regression: gasoline ~ brent + year
reg["t"] = (pd.to_datetime(reg.month).dt.year + (pd.to_datetime(reg.month).dt.month - 1) / 12) - 2000
mreg = smf.ols("gasoline ~ brent + t", data=reg).fit()
R["ch12"] = {"boot_median": {"median": f(np.median(f2)), "lo": f(np.percentile(boot, 2.5)), "hi": f(np.percentile(boot, 97.5)), "B": 10000},
             "perm": {"obs_diff": f(obs), "p": f(cnt / B), "B": B},
             "months_p": [f(p, 4) for p in pvals], "months_bonf": [f(p, 4) for p in bonf], "months_bh": [f(p, 4) for p in bh],
             "n_raw_sig": int(sum(p < 0.05 for p in pvals)), "n_bonf_sig": int(sum(p < 0.05 for p in bonf)),
             "acf_util_lag1": f(rho1), "n_util": int(len(us)), "n_eff_util": f(n_eff, 0),
             "bayes": {"prior_a": f(a0, 2), "prior_b": f(b0, 2), "x": int(bs.discovery.sum()), "n": int(len(bs)),
                       "post_a": f(ap, 2), "post_b": f(bp, 2), "post_mean": f(ap / (ap + bp)),
                       "cred_lo": f(stats.beta.ppf(.025, ap, bp)), "cred_hi": f(stats.beta.ppf(.975, ap, bp)),
                       "raw_rate": f(bs.discovery.mean())},
             "logit": {k: {"coef": f(v), "p": f(logit.pvalues[k], 6), "odds_ratio": f(math.exp(v))} for k, v in logit.params.items()},
             "logit_n": int(logit.nobs),
             "mreg": {"b_brent": f(mreg.params["brent"], 5), "b_t": f(mreg.params["t"], 5), "r2": f(mreg.rsquared),
                      "p_t": f(mreg.pvalues["t"], 8)}}

with open("/work/out/results.json", "w") as fh:
    json.dump(R, fh, indent=1, allow_nan=False)
print(json.dumps(R, indent=1)[:12000])

\pset footer off
\echo '== ch01 population mean (energy per capita, 2023)'
select count(*) n, round(avg(energy_per_capita)) pop_mean
from owid_country_energy where year = 2023 and energy_per_capita is not null;

\echo '== ch02 five-number summary of NCS field sizes (million Sm3 o.e.)'
select count(*) n, min(recoverable_oe_msm3) min,
       percentile_cont(0.25) within group (order by recoverable_oe_msm3) q1,
       percentile_cont(0.50) within group (order by recoverable_oe_msm3) median,
       percentile_cont(0.75) within group (order by recoverable_oe_msm3) q3,
       max(recoverable_oe_msm3) max, round(avg(recoverable_oe_msm3)::numeric, 2) mean,
       round(stddev_samp(recoverable_oe_msm3)::numeric, 2) sd
from ncs_field_reserves where recoverable_oe_msm3 > 0;

\echo '== ch03 wildcat outcome by area (joint counts + P(discovery | area))'
select coalesce(main_area, 'ALL') area,
       count(*) filter (where discovery)     as discovery,
       count(*) filter (where not discovery) as no_discovery,
       round(avg(discovery::int), 4)         as p_disc_given_area
from v_wildcats group by rollup (main_area) order by 1;

\echo '== ch04 discoveries per year 2000-2024: mean (lambda) and variance'
select round(avg(n), 2) lambda, round(var_samp(n), 2) variance, round(var_samp(n) / avg(n), 2) dispersion
from (select entry_year, count(*) filter (where discovery) n from v_wildcats
      where entry_year between 2000 and 2024 group by entry_year) y;

\echo '== ch06 wildcats 2015-2024: drilling days and success rate'
select count(*) n, round(avg(drilling_days), 3) mean_days, round(stddev_samp(drilling_days), 3) sd_days,
       count(*) filter (where discovery) x, round(avg(discovery::int), 4) phat
from v_wildcats where entry_year between 2015 and 2024;

\echo '== ch07 weekly change in US crude stocks 2015-2024: one-sample t statistic'
with c as (select week, stocks_kbbl - lag(stocks_kbbl) over (order by week) d from crude_stocks_weekly)
select count(*) n, round(avg(d)::numeric, 1) mean, round(stddev_samp(d)::numeric, 1) sd,
       round((avg(d) / (stddev_samp(d) / sqrt(count(*))))::numeric, 4) t
from c where d is not null and extract(year from week) between 2015 and 2024;

\echo '== ch08 Brent-WTI monthly spread before/after 2011'
select case when extract(year from month) <= 2010 then '<=2010' else '>=2011' end era,
       count(*) n, round(avg(brent - wti)::numeric, 4) mean_spread, round(stddev_samp(brent - wti)::numeric, 4) sd
from v_brent_monthly group by 1 order by 1;

\echo '== ch09 wildcat fluid by area'
select main_area, fluid, count(*) from v_wildcats group by 1, 2 order by 1, 2;

\echo '== ch10 gasoline vs Brent (monthly): least squares'
select count(*) n, round(regr_intercept(gasoline, brent)::numeric, 4) b0, round(regr_slope(gasoline, brent)::numeric, 5) b1,
       round(regr_r2(gasoline, brent)::numeric, 4) r2, round(corr(gasoline, brent)::numeric, 4) r
from gasoline_crude_monthly;

\echo '== ch11 water depth by area (wildcats 2000+)'
select main_area, count(*) n, round(avg(water_depth_m)::numeric, 2) mean, round(stddev_samp(water_depth_m)::numeric, 2) sd
from v_wildcats where entry_year >= 2000 and water_depth_m is not null group by 1 order by 1;

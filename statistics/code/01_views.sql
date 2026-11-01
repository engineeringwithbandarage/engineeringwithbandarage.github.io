-- Helper views used by the SQL examples on the Statistics track (database energystats).
create or replace view v_wildcats as
select wellbore, main_area, entry_year, entry_month, water_depth_m, drilling_days, content,
       (entry_year / 10) * 10                                                     as decade,
       content in ('OIL','GAS','OIL/GAS','GAS/CONDENSATE','OIL/GAS/CONDENSATE')   as discovery,
       case when content = 'OIL' then 'oil'
            when content in ('GAS','GAS/CONDENSATE') then 'gas'
            when content in ('OIL/GAS','OIL/GAS/CONDENSATE') then 'oil+gas'
            else 'none' end                                                       as fluid
from ncs_exploration_wells
where purpose = 'WILDCAT'
  and entry_year is not null
  and content in ('OIL','GAS','OIL/GAS','GAS/CONDENSATE','OIL/GAS/CONDENSATE',
                  'DRY','SHOWS','OIL SHOWS','GAS SHOWS','OIL/GAS SHOWS','WATER','WATER/GAS');

create or replace view v_brent_monthly as
select date_trunc('month', date)::date as month, avg(brent) as brent, avg(wti) as wti
from spot_price_daily where brent is not null and wti is not null
group by 1;

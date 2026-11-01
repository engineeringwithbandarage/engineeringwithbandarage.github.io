# 03 - Net Sales PTD

- Home table: `_Measures`
- Display folder: `Period To Date`
- Hidden: False
- Used by: no other measure

Net sales to date within the week, period, quarter or year picked in Period To Date.

## DAX
```dax
VAR pick    = SELECTEDVALUE ( 'Period To Date'[Period], "Week" )
VAR lastDay = MAX ( 'Date'[Date] )               -- the end of whatever is selected
VAR wk      = MAX ( 'Date'[FiscalWeekID] )
VAR per     = MAX ( 'Date'[FiscalPeriodID] )
VAR qtr     = MAX ( 'Date'[FiscalQuarterID] )
VAR yr      = MAX ( 'Date'[FiscalYear] )
RETURN
    SWITCH (
        pick,
        "Week",    CALCULATE ( [03 - Net Sales], REMOVEFILTERS ( 'Date' ), 'Date'[FiscalWeekID] = wk ),
        "Period",  CALCULATE ( [03 - Net Sales], REMOVEFILTERS ( 'Date' ), 'Date'[FiscalPeriodID] = per, 'Date'[Date] <= lastDay ),
        "Quarter", CALCULATE ( [03 - Net Sales], REMOVEFILTERS ( 'Date' ), 'Date'[FiscalQuarterID] = qtr, 'Date'[Date] <= lastDay ),
        "Year",    CALCULATE ( [03 - Net Sales], REMOVEFILTERS ( 'Date' ), 'Date'[FiscalYear] = yr, 'Date'[Date] <= lastDay )
    )
```

## Depends on
- Level 1: [03 - Net Sales]
- Level 2: [01 - Gross Sales], [02 - Discounts]
- Level 3: [_Local Discounts], [_Local Gross Sales]
- Level 4: [_Discounts Base], [_Gross Sales Base], [_Show Local Currency]

## Source columns
| Model column | Warehouse tables | Source expression |
|---|---|---|
| Currency[CurrencyKey] | dbo.DimCurrency, dbo.FactInternetSales, dbo.FactResellerSales | `CurrencyKey` |
| Currency[IsReportingCurrency] | dbo.DimCurrency, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(CASE WHEN CurrencyAlternateKey = 'USD' THEN 1 ELSE 0 END AS bit)` |
| Date[Date] | dbo.DimDate | `FullDateAlternateKey` |
| Date[FiscalPeriodID] | dbo.DimDate | `FiscalYear * 100 + FiscalPeriod` |
| Date[FiscalQuarterID] | dbo.DimDate | `FiscalYear * 10 + FiscalQuarter` |
| Date[FiscalWeekID] | dbo.DimDate | `FiscalYear * 100 + FiscalWeek` |
| Date[FiscalYear] | dbo.DimDate | `CASE WHEN days.[Date] > e.YearEnd THEN days.CalendarYear + 1 ELSE days.CalendarYear END` |
| Period To Date[Period] |  | `[Period]` |
| Sales[Discounts] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(s.DiscountAmount AS decimal(19, 4))` |
| Sales[GrossSales] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(s.ExtendedAmount AS decimal(19, 4))` |
| Sales[LocalCurrencyRate] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(1.0 / r.AverageRate AS decimal(19, 6))` |

## Lineage
```mermaid
graph LR
  03_Net_Sales["03 - Net Sales"] --> 03_Net_Sales_PTD["03 - Net Sales PTD"]
  Date_Date_["Date[Date]"] --> 03_Net_Sales_PTD["03 - Net Sales PTD"]
  Date_FiscalPeriodID_["Date[FiscalPeriodID]"] --> 03_Net_Sales_PTD["03 - Net Sales PTD"]
  Date_FiscalQuarterID_["Date[FiscalQuarterID]"] --> 03_Net_Sales_PTD["03 - Net Sales PTD"]
  Date_FiscalWeekID_["Date[FiscalWeekID]"] --> 03_Net_Sales_PTD["03 - Net Sales PTD"]
  Date_FiscalYear_["Date[FiscalYear]"] --> 03_Net_Sales_PTD["03 - Net Sales PTD"]
  Period_To_Date_Period_["Period To Date[Period]"] --> 03_Net_Sales_PTD["03 - Net Sales PTD"]
  01_Gross_Sales["01 - Gross Sales"] --> 03_Net_Sales["03 - Net Sales"]
  02_Discounts["02 - Discounts"] --> 03_Net_Sales["03 - Net Sales"]
  _Local_Gross_Sales["_Local Gross Sales"] --> 01_Gross_Sales["01 - Gross Sales"]
  _Local_Discounts["_Local Discounts"] --> 02_Discounts["02 - Discounts"]
  _Discounts_Base["_Discounts Base"] --> _Local_Discounts["_Local Discounts"]
  _Show_Local_Currency["_Show Local Currency"] --> _Local_Discounts["_Local Discounts"]
  Sales_Discounts_["Sales[Discounts]"] --> _Local_Discounts["_Local Discounts"]
  Sales_LocalCurrencyRate_["Sales[LocalCurrencyRate]"] --> _Local_Discounts["_Local Discounts"]
  _Gross_Sales_Base["_Gross Sales Base"] --> _Local_Gross_Sales["_Local Gross Sales"]
  _Show_Local_Currency["_Show Local Currency"] --> _Local_Gross_Sales["_Local Gross Sales"]
  Sales_GrossSales_["Sales[GrossSales]"] --> _Local_Gross_Sales["_Local Gross Sales"]
  Sales_LocalCurrencyRate_["Sales[LocalCurrencyRate]"] --> _Local_Gross_Sales["_Local Gross Sales"]
  Sales_Discounts_["Sales[Discounts]"] --> _Discounts_Base["_Discounts Base"]
  Sales_GrossSales_["Sales[GrossSales]"] --> _Gross_Sales_Base["_Gross Sales Base"]
  Currency_CurrencyKey_["Currency[CurrencyKey]"] --> _Show_Local_Currency["_Show Local Currency"]
  Currency_IsReportingCurrency_["Currency[IsReportingCurrency]"] --> _Show_Local_Currency["_Show Local Currency"]
```
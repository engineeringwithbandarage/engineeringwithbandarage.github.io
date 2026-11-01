# 03 - Net Sales vs LY %

- Home table: `_Measures`
- Display folder: `Variance`
- Hidden: False
- Used by: no other measure

## DAX
```dax
DIVIDE ( [03 - Net Sales vs LY], [03 - Net Sales LY] )
```

## Depends on
- Level 1: [03 - Net Sales LY], [03 - Net Sales vs LY]
- Level 2: [03 - Net Sales]
- Level 3: [01 - Gross Sales], [02 - Discounts]
- Level 4: [_Local Discounts], [_Local Gross Sales]
- Level 5: [_Discounts Base], [_Gross Sales Base], [_Show Local Currency]

## Source columns
| Model column | Warehouse tables | Source expression |
|---|---|---|
| Currency[CurrencyKey] | dbo.DimCurrency, dbo.FactInternetSales, dbo.FactResellerSales | `CurrencyKey` |
| Currency[IsReportingCurrency] | dbo.DimCurrency, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(CASE WHEN CurrencyAlternateKey = 'USD' THEN 1 ELSE 0 END AS bit)` |
| Date[FiscalWeekID] | dbo.DimDate | `FiscalYear * 100 + FiscalWeek` |
| Date[LYFiscalWeekID] | dbo.DimDate | `ELSE (FiscalYear - 1) * 100 + FiscalWeek END` |
| Sales[Discounts] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(s.DiscountAmount AS decimal(19, 4))` |
| Sales[GrossSales] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(s.ExtendedAmount AS decimal(19, 4))` |
| Sales[LocalCurrencyRate] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(1.0 / r.AverageRate AS decimal(19, 6))` |

## Lineage
```mermaid
graph LR
  03_Net_Sales_LY["03 - Net Sales LY"] --> 03_Net_Sales_vs_LY_["03 - Net Sales vs LY %"]
  03_Net_Sales_vs_LY["03 - Net Sales vs LY"] --> 03_Net_Sales_vs_LY_["03 - Net Sales vs LY %"]
  03_Net_Sales["03 - Net Sales"] --> 03_Net_Sales_LY["03 - Net Sales LY"]
  Date_FiscalWeekID_["Date[FiscalWeekID]"] --> 03_Net_Sales_LY["03 - Net Sales LY"]
  Date_LYFiscalWeekID_["Date[LYFiscalWeekID]"] --> 03_Net_Sales_LY["03 - Net Sales LY"]
  03_Net_Sales["03 - Net Sales"] --> 03_Net_Sales_vs_LY["03 - Net Sales vs LY"]
  03_Net_Sales_LY["03 - Net Sales LY"] --> 03_Net_Sales_vs_LY["03 - Net Sales vs LY"]
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
# 01 - Gross Sales

- Home table: `_Measures`
- Display folder: `P&L Actual`
- Hidden: False
- Used by: 03 - Net Sales

Order value at list price after volume pricing, before discounts.

## DAX
```dax
[_Local Gross Sales]
```

## Depends on
- Level 1: [_Local Gross Sales]
- Level 2: [_Gross Sales Base], [_Show Local Currency]

## Source columns
| Model column | Warehouse tables | Source expression |
|---|---|---|
| Currency[CurrencyKey] | dbo.DimCurrency, dbo.FactInternetSales, dbo.FactResellerSales | `CurrencyKey` |
| Currency[IsReportingCurrency] | dbo.DimCurrency, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(CASE WHEN CurrencyAlternateKey = 'USD' THEN 1 ELSE 0 END AS bit)` |
| Sales[GrossSales] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(s.ExtendedAmount AS decimal(19, 4))` |
| Sales[LocalCurrencyRate] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(1.0 / r.AverageRate AS decimal(19, 6))` |

## Lineage
```mermaid
graph LR
  _Local_Gross_Sales["_Local Gross Sales"] --> 01_Gross_Sales["01 - Gross Sales"]
  _Gross_Sales_Base["_Gross Sales Base"] --> _Local_Gross_Sales["_Local Gross Sales"]
  _Show_Local_Currency["_Show Local Currency"] --> _Local_Gross_Sales["_Local Gross Sales"]
  Sales_GrossSales_["Sales[GrossSales]"] --> _Local_Gross_Sales["_Local Gross Sales"]
  Sales_LocalCurrencyRate_["Sales[LocalCurrencyRate]"] --> _Local_Gross_Sales["_Local Gross Sales"]
  Sales_GrossSales_["Sales[GrossSales]"] --> _Gross_Sales_Base["_Gross Sales Base"]
  Currency_CurrencyKey_["Currency[CurrencyKey]"] --> _Show_Local_Currency["_Show Local Currency"]
  Currency_IsReportingCurrency_["Currency[IsReportingCurrency]"] --> _Show_Local_Currency["_Show Local Currency"]
```
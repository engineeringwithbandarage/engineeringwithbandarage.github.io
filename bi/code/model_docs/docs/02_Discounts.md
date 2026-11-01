# 02 - Discounts

- Home table: `_Measures`
- Display folder: `P&L Actual`
- Hidden: False
- Used by: 03 - Net Sales

Promotional and volume discounts.

## DAX
```dax
[_Local Discounts]
```

## Depends on
- Level 1: [_Local Discounts]
- Level 2: [_Discounts Base], [_Show Local Currency]

## Source columns
| Model column | Warehouse tables | Source expression |
|---|---|---|
| Currency[CurrencyKey] | dbo.DimCurrency, dbo.FactInternetSales, dbo.FactResellerSales | `CurrencyKey` |
| Currency[IsReportingCurrency] | dbo.DimCurrency, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(CASE WHEN CurrencyAlternateKey = 'USD' THEN 1 ELSE 0 END AS bit)` |
| Sales[Discounts] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(s.DiscountAmount AS decimal(19, 4))` |
| Sales[LocalCurrencyRate] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(1.0 / r.AverageRate AS decimal(19, 6))` |

## Lineage
```mermaid
graph LR
  _Local_Discounts["_Local Discounts"] --> 02_Discounts["02 - Discounts"]
  _Discounts_Base["_Discounts Base"] --> _Local_Discounts["_Local Discounts"]
  _Show_Local_Currency["_Show Local Currency"] --> _Local_Discounts["_Local Discounts"]
  Sales_Discounts_["Sales[Discounts]"] --> _Local_Discounts["_Local Discounts"]
  Sales_LocalCurrencyRate_["Sales[LocalCurrencyRate]"] --> _Local_Discounts["_Local Discounts"]
  Sales_Discounts_["Sales[Discounts]"] --> _Discounts_Base["_Discounts Base"]
  Currency_CurrencyKey_["Currency[CurrencyKey]"] --> _Show_Local_Currency["_Show Local Currency"]
  Currency_IsReportingCurrency_["Currency[IsReportingCurrency]"] --> _Show_Local_Currency["_Show Local Currency"]
```
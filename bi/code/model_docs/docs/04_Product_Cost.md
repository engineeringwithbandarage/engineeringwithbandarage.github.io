# 04 - Product Cost

- Home table: `_Measures`
- Display folder: `P&L Actual`
- Hidden: False
- Used by: 05 - Gross Profit

Standard cost of the products sold.

## DAX
```dax
[_Local Product Cost]
```

## Depends on
- Level 1: [_Local Product Cost]
- Level 2: [_Product Cost Base], [_Show Local Currency]

## Source columns
| Model column | Warehouse tables | Source expression |
|---|---|---|
| Currency[CurrencyKey] | dbo.DimCurrency, dbo.FactInternetSales, dbo.FactResellerSales | `CurrencyKey` |
| Currency[IsReportingCurrency] | dbo.DimCurrency, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(CASE WHEN CurrencyAlternateKey = 'USD' THEN 1 ELSE 0 END AS bit)` |
| Sales[LocalCurrencyRate] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(1.0 / r.AverageRate AS decimal(19, 6))` |
| Sales[ProductCost] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(s.TotalProductCost AS decimal(19, 4))` |

## Lineage
```mermaid
graph LR
  _Local_Product_Cost["_Local Product Cost"] --> 04_Product_Cost["04 - Product Cost"]
  _Product_Cost_Base["_Product Cost Base"] --> _Local_Product_Cost["_Local Product Cost"]
  _Show_Local_Currency["_Show Local Currency"] --> _Local_Product_Cost["_Local Product Cost"]
  Sales_LocalCurrencyRate_["Sales[LocalCurrencyRate]"] --> _Local_Product_Cost["_Local Product Cost"]
  Sales_ProductCost_["Sales[ProductCost]"] --> _Local_Product_Cost["_Local Product Cost"]
  Sales_ProductCost_["Sales[ProductCost]"] --> _Product_Cost_Base["_Product Cost Base"]
  Currency_CurrencyKey_["Currency[CurrencyKey]"] --> _Show_Local_Currency["_Show Local Currency"]
  Currency_IsReportingCurrency_["Currency[IsReportingCurrency]"] --> _Show_Local_Currency["_Show Local Currency"]
```
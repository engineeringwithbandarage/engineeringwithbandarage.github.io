# 05 - Gross Profit

- Home table: `_Measures`
- Display folder: `P&L Actual`
- Hidden: False
- Used by: 05 - Gross Profit LY, Gross Margin %

Net sales less product cost.

## DAX
```dax
[03 - Net Sales] - [04 - Product Cost]
```

## Depends on
- Level 1: [03 - Net Sales], [04 - Product Cost]
- Level 2: [_Local Product Cost], [01 - Gross Sales], [02 - Discounts]
- Level 3: [_Local Discounts], [_Local Gross Sales], [_Product Cost Base], [_Show Local Currency]
- Level 4: [_Discounts Base], [_Gross Sales Base]

## Source columns
| Model column | Warehouse tables | Source expression |
|---|---|---|
| Currency[CurrencyKey] | dbo.DimCurrency, dbo.FactInternetSales, dbo.FactResellerSales | `CurrencyKey` |
| Currency[IsReportingCurrency] | dbo.DimCurrency, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(CASE WHEN CurrencyAlternateKey = 'USD' THEN 1 ELSE 0 END AS bit)` |
| Sales[Discounts] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(s.DiscountAmount AS decimal(19, 4))` |
| Sales[GrossSales] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(s.ExtendedAmount AS decimal(19, 4))` |
| Sales[LocalCurrencyRate] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(1.0 / r.AverageRate AS decimal(19, 6))` |
| Sales[ProductCost] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(s.TotalProductCost AS decimal(19, 4))` |

## Lineage
```mermaid
graph LR
  03_Net_Sales["03 - Net Sales"] --> 05_Gross_Profit["05 - Gross Profit"]
  04_Product_Cost["04 - Product Cost"] --> 05_Gross_Profit["05 - Gross Profit"]
  01_Gross_Sales["01 - Gross Sales"] --> 03_Net_Sales["03 - Net Sales"]
  02_Discounts["02 - Discounts"] --> 03_Net_Sales["03 - Net Sales"]
  _Local_Product_Cost["_Local Product Cost"] --> 04_Product_Cost["04 - Product Cost"]
  _Product_Cost_Base["_Product Cost Base"] --> _Local_Product_Cost["_Local Product Cost"]
  _Show_Local_Currency["_Show Local Currency"] --> _Local_Product_Cost["_Local Product Cost"]
  Sales_LocalCurrencyRate_["Sales[LocalCurrencyRate]"] --> _Local_Product_Cost["_Local Product Cost"]
  Sales_ProductCost_["Sales[ProductCost]"] --> _Local_Product_Cost["_Local Product Cost"]
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
  Sales_ProductCost_["Sales[ProductCost]"] --> _Product_Cost_Base["_Product Cost Base"]
  Currency_CurrencyKey_["Currency[CurrencyKey]"] --> _Show_Local_Currency["_Show Local Currency"]
  Currency_IsReportingCurrency_["Currency[IsReportingCurrency]"] --> _Show_Local_Currency["_Show Local Currency"]
  Sales_Discounts_["Sales[Discounts]"] --> _Discounts_Base["_Discounts Base"]
  Sales_GrossSales_["Sales[GrossSales]"] --> _Gross_Sales_Base["_Gross Sales Base"]
```
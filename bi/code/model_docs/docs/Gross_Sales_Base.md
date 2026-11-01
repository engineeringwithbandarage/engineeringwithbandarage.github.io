# _Gross Sales Base

- Home table: `_Measures`
- Display folder: `zz Helpers`
- Hidden: True
- Used by: _Local Gross Sales

Layer 1: one column, no logic.

## DAX
```dax
SUM ( Sales[GrossSales] )
```

## Depends on
- no other measures

## Source columns
| Model column | Warehouse tables | Source expression |
|---|---|---|
| Sales[GrossSales] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(s.ExtendedAmount AS decimal(19, 4))` |

## Lineage
```mermaid
graph LR
  Sales_GrossSales_["Sales[GrossSales]"] --> _Gross_Sales_Base["_Gross Sales Base"]
```
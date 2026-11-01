# _Product Cost Base

- Home table: `_Measures`
- Display folder: `zz Helpers`
- Hidden: True
- Used by: _Local Product Cost

## DAX
```dax
SUM ( Sales[ProductCost] )
```

## Depends on
- no other measures

## Source columns
| Model column | Warehouse tables | Source expression |
|---|---|---|
| Sales[ProductCost] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(s.TotalProductCost AS decimal(19, 4))` |

## Lineage
```mermaid
graph LR
  Sales_ProductCost_["Sales[ProductCost]"] --> _Product_Cost_Base["_Product Cost Base"]
```
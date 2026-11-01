# _Discounts Base

- Home table: `_Measures`
- Display folder: `zz Helpers`
- Hidden: True
- Used by: _Local Discounts

## DAX
```dax
SUM ( Sales[Discounts] )
```

## Depends on
- no other measures

## Source columns
| Model column | Warehouse tables | Source expression |
|---|---|---|
| Sales[Discounts] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `CAST(s.DiscountAmount AS decimal(19, 4))` |

## Lineage
```mermaid
graph LR
  Sales_Discounts_["Sales[Discounts]"] --> _Discounts_Base["_Discounts Base"]
```
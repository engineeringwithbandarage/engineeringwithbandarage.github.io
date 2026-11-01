# _Units

- Home table: `_Measures`
- Display folder: `zz Helpers`
- Hidden: True
- Used by: Net Sales per Unit

## DAX
```dax
SUM ( Sales[Units] )
```

## Depends on
- no other measures

## Source columns
| Model column | Warehouse tables | Source expression |
|---|---|---|
| Sales[Units] | dbo.FactCurrencyRate, dbo.FactInternetSales, dbo.FactResellerSales | `s.OrderQuantity` |

## Lineage
```mermaid
graph LR
  Sales_Units_["Sales[Units]"] --> _Units["_Units"]
```
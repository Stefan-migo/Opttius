# Product Search & Shopping Cart

<cite>
**Referenced Files in This Document**
- [POS Page](file://src/app/admin/pos/page.tsx)
- [Product Search API](file://src/app/api/admin/products/search/route.ts)
- [Products API](file://src/app/api/admin/products/route.ts)
- [Process Sale API](file://src/app/api/admin/pos/process-sale/route.ts)
- [Tax Utilities](file://src/lib/utils/tax.ts)
- [Stock Helpers](file://src/lib/inventory/stock-helpers.ts)
- [Dashboard Search](file://src/components/admin/DashboardSearch.tsx)
- [AI Tools - Products](file://src/lib/ai/tools/products.ts)
</cite>

## Table of Contents

1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction

This document provides comprehensive documentation for the product search and shopping cart functionality in the Opttius POS system, tailored for optical retail environments. It explains how the system supports SKU, barcode, name, and category-based searches, manages the shopping cart with item addition, quantity adjustments, and removal, integrates with inventory management for real-time stock updates and availability checks, and implements product pricing, tax calculation, and discount application. It also covers POS-specific features such as temporary items, promotional pricing, and bundle deals, along with practical examples for common search scenarios and cart workflows in optical retail.

## Project Structure

The POS search and cart functionality spans several key areas:

- Frontend POS interface for search, cart management, and payment processing
- Backend APIs for product search, product catalog queries, and sale processing
- Inventory management utilities for stock updates and availability checks
- Tax calculation utilities for inclusive/exclusive tax pricing
- Dashboard search integration for quick product lookup

```mermaid
graph TB
subgraph "Frontend"
POS["POS Page<br/>Search UI, Cart, Payments"]
DashSearch["Dashboard Search<br/>Autocomplete"]
end
subgraph "Backend APIs"
ProdSearch["Product Search API<br/>SKU/Barcode/Name/Category"]
ProdCatalog["Products API<br/>Catalog & Filters"]
ProcessSale["Process Sale API<br/>Inventory & Orders"]
end
subgraph "Inventory & Tax"
StockHelpers["Stock Helpers<br/>Real-time Updates"]
TaxUtils["Tax Utilities<br/>Inclusive/Exclusive Tax"]
AITools["AI Tools<br/>Inventory Updates"]
end
POS --> ProdSearch
POS --> ProdCatalog
POS --> ProcessSale
POS --> TaxUtils
POS --> StockHelpers
DashSearch --> ProdSearch
ProcessSale --> StockHelpers
ProcessSale --> TaxUtils
AITools --> StockHelpers
```

**Diagram sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L148-L6075)
- [Product Search API](file://src/app/api/admin/products/search/route.ts#L1-L263)
- [Products API](file://src/app/api/admin/products/route.ts#L1-L1220)
- [Process Sale API](file://src/app/api/admin/pos/process-sale/route.ts#L1-L1457)
- [Stock Helpers](file://src/lib/inventory/stock-helpers.ts#L48-L199)
- [Tax Utilities](file://src/lib/utils/tax.ts#L1-L95)
- [Dashboard Search](file://src/components/admin/DashboardSearch.tsx#L46-L92)
- [AI Tools - Products](file://src/lib/ai/tools/products.ts#L584-L622)

**Section sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L148-L6075)
- [Product Search API](file://src/app/api/admin/products/search/route.ts#L1-L263)
- [Products API](file://src/app/api/admin/products/route.ts#L1-L1220)
- [Process Sale API](file://src/app/api/admin/pos/process-sale/route.ts#L1-L1457)
- [Stock Helpers](file://src/lib/inventory/stock-helpers.ts#L48-L199)
- [Tax Utilities](file://src/lib/utils/tax.ts#L1-L95)
- [Dashboard Search](file://src/components/admin/DashboardSearch.tsx#L46-L92)
- [AI Tools - Products](file://src/lib/ai/tools/products.ts#L584-L622)

## Core Components

- Product Search Engine: Supports intelligent search across name, description, SKU, and barcode with prioritization for exact matches.
- Shopping Cart Management: Handles item addition, quantity updates, removal, and POS-specific features like temporary items and discounts.
- Inventory Integration: Real-time stock updates and availability checks during purchase processing.
- Tax Calculation: Computes tax-inclusive and tax-exclusive pricing with configurable tax rates.
- Discount System: Supports percentage and fixed-amount discounts applied to cart totals or individual items.
- Autocomplete & Suggestion: Provides quick product lookup via dashboard search and POS search suggestions.

**Section sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L924-L5387)
- [Product Search API](file://src/app/api/admin/products/search/route.ts#L65-L124)
- [Products API](file://src/app/api/admin/products/route.ts#L234-L248)
- [Process Sale API](file://src/app/api/admin/pos/process-sale/route.ts#L865-L921)
- [Tax Utilities](file://src/lib/utils/tax.ts#L13-L94)
- [Stock Helpers](file://src/lib/inventory/stock-helpers.ts#L67-L171)

## Architecture Overview

The POS system orchestrates search, cart management, and sale processing with robust inventory and tax integration.

```mermaid
sequenceDiagram
participant User as "User"
participant POS as "POS Page"
participant SearchAPI as "Product Search API"
participant CatalogAPI as "Products API"
participant Stock as "Stock Helpers"
participant Tax as "Tax Utilities"
participant SaleAPI as "Process Sale API"
User->>POS : Enter search term
POS->>SearchAPI : GET /api/admin/products/search?q=term&type=frame&limit=20
SearchAPI-->>POS : Products with SKU/Barcode/Name matching
POS->>POS : addToCart(product)
POS->>Tax : calculateSubtotal/TotalTax/Total
POS->>POS : updateCartQuantity/removeItem
User->>POS : Finalize Payment
POS->>SaleAPI : POST /api/admin/pos/process-sale
SaleAPI->>Stock : updateProductStock(branchId, productId, quantityChange)
Stock-->>SaleAPI : Updated stock
SaleAPI-->>POS : Order created, receipt generated
POS-->>User : Print receipt, clear cart
```

**Diagram sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L875-L953)
- [Product Search API](file://src/app/api/admin/products/search/route.ts#L51-L124)
- [Products API](file://src/app/api/admin/products/route.ts#L57-L100)
- [Process Sale API](file://src/app/api/admin/pos/process-sale/route.ts#L17-L124)
- [Stock Helpers](file://src/lib/inventory/stock-helpers.ts#L67-L171)
- [Tax Utilities](file://src/lib/utils/tax.ts#L46-L94)

## Detailed Component Analysis

### Product Search Mechanism

The search system supports multiple criteria:

- Exact SKU/Barcode matches are prioritized when the query resembles a code pattern.
- Name and description searches use case-insensitive matching.
- Category-based filtering is supported via dedicated endpoints and UI filters.
- Branch-aware product visibility ensures multi-tenant isolation and correct stock display.

Key implementation details:

- Intelligent search logic in the POS page handles keyboard navigation and suggestion rendering.
- The product search API builds dynamic OR conditions for SKU/barcode/name/description while enforcing organization and branch filters.
- The products API supports advanced filters (category, price range, stock status) and nested relation handling for variants and branch stock.

```mermaid
flowchart TD
Start(["Search Request"]) --> Validate["Validate Query Length"]
Validate --> BuildConditions["Build Search Conditions<br/>Name/Description + SKU/Barcode"]
BuildConditions --> ApplyOrgBranch["Apply Organization & Branch Filters"]
ApplyOrgBranch --> QueryProducts["Query Products with Stock Join"]
QueryProducts --> PostProcess["Post-process Results<br/>Filter by Type/Category"]
PostProcess --> ReturnResults["Return Products List"]
```

**Diagram sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L875-L907)
- [Product Search API](file://src/app/api/admin/products/search/route.ts#L65-L124)
- [Products API](file://src/app/api/admin/products/route.ts#L234-L248)

**Section sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L875-L907)
- [Product Search API](file://src/app/api/admin/products/search/route.ts#L65-L124)
- [Products API](file://src/app/api/admin/products/route.ts#L234-L248)

### Shopping Cart Management

The cart supports:

- Item addition with automatic quantity increment if the same product is added again.
- Quantity adjustment with validation against available stock.
- Removal of items from the cart.
- POS-specific features:
  - Temporary items (e.g., lens services, treatments, labor) identified by non-UUID product IDs.
  - Promotional pricing and bundle deals represented as special items with negative unit prices for discounts.
  - Work-order eligibility checks based on product types and categories.

```mermaid
sequenceDiagram
participant User as "User"
participant POS as "POS Page"
participant Cart as "Cart State"
participant Stock as "Stock Helpers"
participant Tax as "Tax Utilities"
User->>POS : Click Add to Cart
POS->>Cart : addToCart(product)
alt Existing Item
Cart->>Cart : updateCartQuantity(productId, quantity+1)
else New Item
Cart->>Cart : Add item with unitPrice, subtotal, priceIncludesTax
end
POS->>Tax : calculateSubtotal/TotalTax/Total
User->>POS : Adjust Quantity
POS->>Cart : updateCartQuantity(productId, newQuantity)
Cart->>Stock : Validate against available_quantity
User->>POS : Remove Item
POS->>Cart : removeFromCart(productId)
```

**Diagram sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L924-L976)
- [POS Page](file://src/app/admin/pos/page.tsx#L5339-L5381)
- [Tax Utilities](file://src/lib/utils/tax.ts#L46-L94)

**Section sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L924-L976)
- [POS Page](file://src/app/admin/pos/page.tsx#L5339-L5381)
- [Tax Utilities](file://src/lib/utils/tax.ts#L46-L94)

### Inventory Integration and Availability Checking

During sale processing:

- The system validates current stock for each product and branch.
- If stock does not exist, it initializes a zero-stock record before applying reductions.
- Stock updates use a dedicated helper that supports reserved quantities and threshold tracking.

```mermaid
flowchart TD
Start(["Process Sale"]) --> CheckCash["Check Cash Register Open"]
CheckCash --> ValidateItems["Validate Items & Branch Access"]
ValidateItems --> LoopItems["For Each Item"]
LoopItems --> GetStock["Get Current Stock by Branch"]
GetStock --> Exists{"Stock Exists?"}
Exists --> |No| InitStock["Initialize Stock Record (quantity=0)"]
Exists --> |Yes| UpdateStock["Update Stock Quantity"]
InitStock --> UpdateStock
UpdateStock --> Done(["Sale Processed"])
```

**Diagram sources**

- [Process Sale API](file://src/app/api/admin/pos/process-sale/route.ts#L865-L921)
- [Stock Helpers](file://src/lib/inventory/stock-helpers.ts#L67-L171)

**Section sources**

- [Process Sale API](file://src/app/api/admin/pos/process-sale/route.ts#L865-L921)
- [Stock Helpers](file://src/lib/inventory/stock-helpers.ts#L67-L171)

### Pricing, Tax Calculation, and Discount Application

- Tax handling:
  - Supports both tax-inclusive and tax-exclusive pricing.
  - Calculates subtotal, tax amount, and total for multiple items with mixed tax inclusion flags.
- Discount system:
  - Supports percentage or fixed-amount discounts.
  - Discounts can be applied as a separate cart item with negative unit price.
  - Ensures discount does not exceed the total with tax.

```mermaid
flowchart TD
Start(["Cart Items"]) --> BuildList["Build Items List<br/>price, includesTax"]
BuildList --> Subtotal["calculateSubtotal(items, taxRate)"]
BuildList --> Tax["calculateTotalTax(items, taxRate)"]
BuildList --> Total["calculateTotal(items, taxRate)"]
Discount["Apply Discount<br/>% or Amount"] --> AdjustTotal["Ensure Discount <= Total With Tax"]
Subtotal --> Display["Display Subtotal/Tax/Total"]
Tax --> Display
Total --> Display
AdjustTotal --> Display
```

**Diagram sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L415-L424)
- [Tax Utilities](file://src/lib/utils/tax.ts#L46-L94)
- [POS Page](file://src/app/admin/pos/page.tsx#L2220-L2246)

**Section sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L415-L424)
- [Tax Utilities](file://src/lib/utils/tax.ts#L46-L94)
- [POS Page](file://src/app/admin/pos/page.tsx#L2220-L2246)

### Product Suggestion System and Autocomplete

- POS search suggestions:
  - Keyboard navigation with arrow keys and enter selection.
  - Auto-focus on mount for efficient scanning workflows.
- Dashboard search:
  - Quick customer and product search with unified results.
  - Displays SKU, barcode, and stock information for products.

```mermaid
sequenceDiagram
participant User as "User"
participant POS as "POS Search"
participant API as "Product Search API"
participant UI as "Suggestions UI"
User->>POS : Type search term
POS->>API : Debounced GET /api/admin/products/search
API-->>POS : Products list
POS->>UI : Render suggestions
User->>UI : Arrow keys / Enter
UI->>POS : Selected product
POS->>POS : addToCart(selectedProduct)
```

**Diagram sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L875-L907)
- [Product Search API](file://src/app/api/admin/products/search/route.ts#L51-L124)
- [Dashboard Search](file://src/components/admin/DashboardSearch.tsx#L49-L92)

**Section sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L875-L907)
- [Product Search API](file://src/app/api/admin/products/search/route.ts#L51-L124)
- [Dashboard Search](file://src/components/admin/DashboardSearch.tsx#L49-L92)

### POS-Specific Cart Features

- Temporary items:
  - Identified by non-UUID product IDs (e.g., lens-, treatments-, labor-, frame-manual-).
  - Used for services and work-order requirements.
- Promotional pricing and bundles:
  - Represented as special items with negative unit prices for discounts.
  - Applied to cart totals with tax inclusion considerations.
- Work-order eligibility:
  - Checks product types and categories to determine if items require work orders.

**Section sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L924-L976)
- [POS Page](file://src/app/admin/pos/page.tsx#L2220-L2246)
- [Process Sale API](file://src/app/api/admin/pos/process-sale/route.ts#L953-L982)

## Dependency Analysis

The POS system exhibits clear separation of concerns:

- Frontend depends on backend APIs for search, catalog, and sale processing.
- Inventory operations are isolated in dedicated helpers with explicit error handling.
- Tax utilities are reusable across POS and quoting workflows.
- AI tools integrate with inventory updates for automated stock management.

```mermaid
graph TB
POS["POS Page"] --> SearchAPI["Product Search API"]
POS --> CatalogAPI["Products API"]
POS --> SaleAPI["Process Sale API"]
POS --> TaxUtils["Tax Utilities"]
POS --> StockHelpers["Stock Helpers"]
SaleAPI --> StockHelpers
SaleAPI --> TaxUtils
AITools["AI Tools - Products"] --> StockHelpers
```

**Diagram sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L148-L6075)
- [Product Search API](file://src/app/api/admin/products/search/route.ts#L1-L263)
- [Products API](file://src/app/api/admin/products/route.ts#L1-L1220)
- [Process Sale API](file://src/app/api/admin/pos/process-sale/route.ts#L1-L1457)
- [Stock Helpers](file://src/lib/inventory/stock-helpers.ts#L48-L199)
- [Tax Utilities](file://src/lib/utils/tax.ts#L1-L95)
- [AI Tools - Products](file://src/lib/ai/tools/products.ts#L584-L622)

**Section sources**

- [POS Page](file://src/app/admin/pos/page.tsx#L148-L6075)
- [Product Search API](file://src/app/api/admin/products/search/route.ts#L1-L263)
- [Products API](file://src/app/api/admin/products/route.ts#L1-L1220)
- [Process Sale API](file://src/app/api/admin/pos/process-sale/route.ts#L1-L1457)
- [Stock Helpers](file://src/lib/inventory/stock-helpers.ts#L48-L199)
- [Tax Utilities](file://src/lib/utils/tax.ts#L1-L95)
- [AI Tools - Products](file://src/lib/ai/tools/products.ts#L584-L622)

## Performance Considerations

- Search performance:
  - Use debounced search to minimize API calls.
  - Prefer exact SKU/barcode matches for faster lookups.
  - Limit search result sets with appropriate limits.
- Inventory updates:
  - Batch stock updates where possible to reduce database round trips.
  - Initialize missing stock records efficiently before applying changes.
- Tax calculations:
  - Compute tax totals once per cart update to avoid redundant calculations.

## Troubleshooting Guide

Common issues and resolutions:

- Search returns no results:
  - Verify query length and character encoding.
  - Check organization and branch filters are correctly applied.
- Out-of-stock items:
  - Ensure branch-specific stock is initialized and updated.
  - Validate available_quantity vs. requested quantity.
- Incorrect tax totals:
  - Confirm price_includes_tax flags on products.
  - Recalculate totals after discount application.
- Payment processing failures:
  - Verify cash register is open and POS session exists.
  - Check branch access permissions for non-super admins.

**Section sources**

- [Process Sale API](file://src/app/api/admin/pos/process-sale/route.ts#L144-L222)
- [Stock Helpers](file://src/lib/inventory/stock-helpers.ts#L85-L171)
- [Tax Utilities](file://src/lib/utils/tax.ts#L13-L94)

## Conclusion

The Opttius POS system delivers a robust, optical-retail-focused product search and shopping cart experience. Its multi-criteria search, real-time inventory integration, flexible tax and discount handling, and POS-specific features enable efficient, accurate transactions. By leveraging branch-aware filtering, temporary items, and promotional pricing, the system supports complex optical workflows while maintaining performance and reliability.

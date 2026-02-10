# Product Management and Catalog System

## Overview
The product management system provides comprehensive control over optical inventory including frames, lenses, accessories, and services. It features advanced inventory tracking, pricing management, category organization, and integration with sales processes.

## Prerequisites
### Required Permissions
- Minimum user role: store_manager or admin
- Specific feature flags required: products_enabled, inventory_management

### System Requirements
- Browser compatibility: Modern browsers with file upload capability
- Network requirements: Stable connection for image uploads and real-time inventory updates
- Account setup: Branch configuration required for multi-location inventory

## Key Workflows

### Workflow 1: Adding New Products
**Purpose:** Add new items to your optical inventory catalog
**Frequency:** Weekly for new arrivals, seasonally for collections
**Business Impact:** Keeps inventory current and enables sales of new merchandise

**Steps:**
1. Navigate to **Products** → **Catalog** in main navigation
2. Click **"Add Product"** or **"+"** button
3. Select product type:
   - Frames (eyeglass frames)
   - Lenses (prescription lenses)
   - Accessories (cases, cleaning supplies)
   - Services (eye exams, adjustments)
4. Enter basic information:
   - Product name and description
   - SKU (stock keeping unit) - unique identifier
   - Barcode (if applicable)
   - Brand and supplier information
5. Set pricing:
   - Retail price
   - Compare-at price (for promotions)
   - Cost price (for profit calculations)
6. Configure inventory:
   - Initial stock quantity
   - Low stock alert threshold
   - Track inventory (yes/no toggle)
7. Assign categories and tags for organization
8. Upload product images (primary and gallery)
9. Set product status (Active/Draft/Archived)
10. Click **"Save Product"** to add to catalog

**Tips & Best Practices:**
- 💡 Use descriptive, SEO-friendly product names
- ⚠️ Always include SKU for accurate inventory tracking
- 🎯 Upload high-quality images from multiple angles
- 💡 Set realistic low-stock alerts based on sales velocity

**Validation Points:**
- Product appears in catalog with correct information
- SKU is unique and properly formatted
- Images display correctly
- Pricing shows accurately in different views
- Inventory tracking is enabled if physical product

### Workflow 2: Managing Product Inventory
**Purpose:** Track stock levels and update quantities as sales occur
**Frequency:** Daily for active products, weekly for slow-moving items
**Business Impact:** Prevents stockouts and overstock situations

**Steps:**
1. Go to **Products** → **Catalog**
2. Use filters to locate products needing attention:
   - Low stock items
   - Out of stock items
   - Specific categories or brands
3. For individual updates:
   - Click product to view details
   - Click **"Edit Inventory"**
   - Enter new quantity or adjustment amount
   - Add notes about reason for change
4. For bulk updates:
   - Select multiple products using checkboxes
   - Click **"Bulk Operations"**
   - Choose "Update Inventory"
   - Enter adjustment values
   - Apply changes to selected items

**Alternative Approaches:**
- Use barcode scanner for quick inventory counts
- Import/export inventory via CSV for large updates
- Set up automatic reorder points with suppliers
- Use mobile app for on-the-floor inventory management

### Workflow 3: Product Pricing Management
**Purpose:** Adjust prices for promotions, seasonal changes, or cost fluctuations
**Frequency:** Monthly for routine adjustments, as needed for promotions
**Business Impact:** Maintains competitive pricing and healthy profit margins

**Steps:**
1. Navigate to **Products** → **Catalog**
2. Filter to products needing price changes:
   - By category
   - By brand
   - By current price range
3. For individual pricing:
   - Open product details
   - Edit price fields
   - Set sale prices if applicable
   - Update compare-at prices for promotions
4. For bulk pricing:
   - Select multiple products
   - Choose **"Update Pricing"** from bulk operations
   - Apply percentage increases/decreases
   - Or set fixed price adjustments
5. Review changes in preview mode
6. Apply updates and verify in storefront

## Configuration Options

| Setting | Description | Default Value | Business Impact | When to Change |
|---------|-------------|---------------|-----------------|----------------|
| Low Stock Threshold | Quantity that triggers low stock alerts | 5 units | Lower thresholds prevent stockouts but increase alerts | Adjust based on sales volume and supplier lead times |
| Inventory Tracking | Whether to track stock quantities | Enabled | Disabling removes inventory management features | Only for services or unlimited digital products |
| SKU Format | Pattern for generating product SKUs | AUTO-XXXXXX | Custom formats help with organization and identification | Create brand-specific or category-specific patterns |
| Image Requirements | Size and format specifications | 1024x1024px, JPG/PNG | Stricter requirements improve site performance | Tighten for better user experience, loosen for easier uploads |

## Common Use Cases

### Use Case 1: Seasonal Inventory Management
**Situation:** Preparing for back-to-school or holiday shopping seasons
**Goal:** Ensure adequate stock levels for peak demand periods
**Process:**
1. Analyze previous year's sales data for seasonal trends
2. Order additional inventory based on projected demand
3. Create seasonal categories and promotional pricing
4. Set up early bird discounts for advance purchases
5. Monitor inventory closely during peak period
**Success Metrics:** 95%+ product availability during peak season, 20%+ increase in seasonal sales

### Use Case 2: New Product Launch
**Situation:** Introducing new eyewear collection or lens technology
**Goal:** Successfully launch new products with maximum visibility and sales
**Process:**
1. Create detailed product listings with high-quality images
2. Set up pre-order system if supply is limited
3. Create marketing categories and featured collections
4. Train staff on product features and benefits
5. Monitor initial sales and customer feedback
**Success Metrics:** 50%+ of initial inventory sold within first month, positive customer reviews

## Troubleshooting

### Issue: Duplicate SKU Error
**Symptoms:** Unable to save product due to "SKU already exists" error
**Root Cause:** Attempting to use SKU that's already assigned to another product
**Solution:**
1. Search existing products using the problematic SKU
2. Verify if product already exists in catalog
3. If legitimate duplicate, modify SKU with variation indicator
4. If error, check for data entry mistakes
5. Generate new unique SKU if needed
**Verification:** Product saves successfully with unique SKU
**Prevention:** Implement SKU generation system, regularly audit for duplicates

### Issue: Inventory Discrepancies
**Symptoms:** Physical stock doesn't match system quantities
**Root Cause:** Unrecorded sales, theft, damaged goods, or data entry errors
**Solution:**
1. Conduct physical inventory count
2. Compare with system quantities
3. Investigate significant discrepancies
4. Adjust system quantities to match physical count
5. Document reasons for adjustments
6. Implement better tracking procedures
**Verification:** System matches physical inventory after adjustment
**Prevention:** Regular inventory audits, barcode scanning for all transactions

### Issue: Product Not Appearing in Storefront
**Symptoms:** Product exists in admin but customers can't find or purchase it
**Root Cause:** Product status not set to "Active" or visibility restrictions
**Solution:**
1. Check product status (must be "Active")
2. Verify product is assigned to correct branch/location
3. Confirm category assignments are correct
4. Check if product is excluded from any collections
5. Verify pricing is set and valid
6. Clear any cache if storefront uses caching
**Verification:** Product visible and purchasable in storefront
**Prevention:** Standard publishing checklist, regular storefront testing

## Error Codes & Messages

| Error Code | Message | Meaning | Solution |
|------------|---------|---------|----------|
| PROD_001 | "SKU already exists" | Duplicate product identifier | Generate unique SKU or use existing product |
| PROD_002 | "Invalid price format" | Price contains non-numeric characters | Enter valid numeric price values |
| PROD_003 | "Insufficient inventory" | Trying to sell more than available stock | Check current inventory levels |
| PROD_004 | "Missing required fields" | Essential product information incomplete | Complete all required fields |
| PROD_005 | "Image upload failed" | File format or size not supported | Use supported formats (JPG, PNG) within size limits |

## Integration Points

### Related Modules
- **See Also:** Point of Sale, Orders Management, Customer Profiles, Categories
- **Dependencies:** Inventory tracking system, Pricing engine, Image storage
- **Impacts:** Sales reporting, Profit margins, Customer purchasing experience

### External Integrations
- **Third-party services:** Inventory management systems, Supplier portals, Accounting software
- **API endpoints:** Product CRUD operations, Inventory updates, Price synchronization
- **Data flows:** Product information, Stock levels, Sales data, Supplier information

## Best Practices

### Dos:
✅ Use consistent naming conventions for products and SKUs
✅ Maintain accurate inventory counts with regular audits
✅ Optimize product images for fast loading and clear presentation
✅ Organize products into logical categories and subcategories
✅ Regular price reviews to maintain competitiveness

### Don'ts:
❌ Use manufacturer SKUs without verification for uniqueness
❌ Neglect to update inventory after manual stock adjustments
❌ Upload low-quality or irrelevant product images
❌ Create overly complex category structures that confuse customers
❌ Ignore low stock alerts or let items remain out of stock long-term

## Training Resources

### Quick Start Guide
1. Familiarize yourself with product listing interface
2. Practice creating sample products with test data
3. Learn category management and organization
4. Understand inventory tracking basics
5. Master search and filtering capabilities

### Advanced Techniques
- Implement dynamic pricing based on demand or competition
- Create product bundles and package deals
- Set up automated low-stock ordering with suppliers
- Use product variants for size/color options
- Implement advanced SEO for product listings

### Video Tutorials
- [Product Creation Basics]: Step-by-step product listing process
- [Inventory Management]: Tracking stock and preventing shortages
- [Category Organization]: Structuring your product catalog effectively
- [Pricing Strategies]: Competitive pricing and promotional techniques
- [Bulk Operations]: Efficiently managing large product catalogs

## FAQ

**Q: How should I structure my product categories?**
A: Organize by customer needs first (prescription glasses, sunglasses, contacts), then by attributes (brand, price range, frame style). Keep it simple - customers should find what they want in 2-3 clicks.

**Q: What's the best way to handle seasonal inventory?**
A: Create seasonal categories, use promotional pricing, implement pre-order systems for popular items, and plan inventory based on historical sales data. Always maintain some core inventory year-round.

**Q: How often should I update product information?**
A: Product details should be updated immediately when changes occur. Prices should be reviewed monthly, images refreshed seasonally, and inventory counted weekly or bi-weekly depending on volume.

**Q: What information is essential for lens products?**
A: Prescription ranges, material types, coatings, indices, and fitting measurements. Include clear explanations of technical specifications in layman's terms for customer understanding.

**Q: How do I handle discontinued products?**
A: Archive rather than delete discontinued products to maintain order history. Create redirect rules to similar current products, and update any linked content or promotions.

## Glossary

| Term | Definition | Usage Context |
|------|------------|---------------|
| SKU | Stock Keeping Unit - unique product identifier | Inventory management and tracking |
| Inventory Turnover | How quickly products sell and are replaced | Performance measurement |
| Gross Margin | Difference between selling price and cost | Profitability analysis |
| Product Variant | Different versions of same product (size, color) | Catalog organization |
| Backorder | Accepting orders for out-of-stock items | Customer service policy |

---
*Last Updated: 2026-02-08*  
*Maintainer: Documentation Team*  
*Version: 1.0.0*
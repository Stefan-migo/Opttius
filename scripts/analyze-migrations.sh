#!/bin/bash
# Migration Analysis and Consolidation Script

echo "=== Opttius Migration Analysis ==="
echo "Date: $(date)"
echo ""

MIGRATIONS_DIR="supabase/migrations"
OUTPUT_DIR="supabase/consolidated"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "1. Migration Count Analysis:"
echo "   Total migrations: $(ls -1 "$MIGRATIONS_DIR"/*.sql | wc -l)"
echo ""

echo "2. Migration Categories:"
echo "   Core Schema: $(ls -1 "$MIGRATIONS_DIR"/2024*.sql | wc -l) files"
echo "   Admin System: $(ls -1 "$MIGRATIONS_DIR"/20250116*.sql | wc -l) files"
echo "   Optical Features: $(ls -1 "$MIGRATIONS_DIR"/2025012*.sql | wc -l) files"
echo "   SaaS Multi-tenancy: $(ls -1 "$MIGRATIONS_DIR"/20260128*.sql | wc -l) files"
echo "   Lens Systems: $(ls -1 "$MIGRATIONS_DIR"/2026012[29]*.sql | wc -l) files"
echo "   Payments: $(ls -1 "$MIGRATIONS_DIR"/20260131*.sql | wc -l) files"
echo "   AI Features: $(ls -1 "$MIGRATIONS_DIR"/20260131000004*.sql | wc -l) files"
echo ""

echo "3. Duplicate Migration Detection:"
echo "   Checking for duplicate operations..."
# Check for duplicate table creations
grep -l "CREATE TABLE" "$MIGRATIONS_DIR"/*.sql | sort | uniq -d | wc -l
echo "   Files with CREATE TABLE (potential duplicates):"
grep -l "CREATE TABLE" "$MIGRATIONS_DIR"/*.sql | wc -l
echo ""

echo "4. Redundant Operations:"
echo "   ALTER TABLE statements:"
grep -c "ALTER TABLE" "$MIGRATIONS_DIR"/*.sql | grep -v ":0" | wc -l
echo "   Index recreations:"
grep -c "CREATE INDEX.*IF NOT EXISTS" "$MIGRATIONS_DIR"/*.sql | grep -v ":0" | wc -l
echo ""

echo "5. Migration Size Analysis:"
echo "   Largest migrations:"
ls -la "$MIGRATIONS_DIR"/*.sql | sort -k5 -n -r | head -5
echo ""
echo "   Smallest migrations:"
ls -la "$MIGRATIONS_DIR"/*.sql | sort -k5 -n | head -5

# Create consolidation groups
echo ""
echo "6. Proposed Consolidation Groups:"

cat > "$OUTPUT_DIR/consolidation-plan.md" << 'EOF'
# Migration Consolidation Plan

## Groups for Consolidation

### Group 1: Core Schema Foundation (2024)
- 20241220000000_create_user_profiles.sql
- 20241220000001_create_ecommerce_system.sql

### Group 2: Admin System Setup (2025-01-16)
- 20250116000000_setup_admin_users.sql
- 20250116000001_fix_admin_profile.sql
- 20250116000003_fix_admin_rls.sql
- 20250116200000_create_support_system.sql
- 20250116210000_create_system_admin_tools.sql
- 20250118000000_create_admin_notifications.sql

### Group 3: Optical Shop Conversion (2025-01-20-25)
- 20250120000000_add_admin_profiles_access.sql
- 20250121000000_create_pos_system.sql
- 20250122000000_convert_to_optical_shop.sql
- 20250123000000_adapt_customers_for_optical_shop.sql
- 20250124000000_remove_membership_from_customers.sql
- 20250125000000_create_lab_work_orders_system.sql

### Group 4: Advanced Features (2025-01-26-31)
- 20250126000000_create_schedule_settings_system.sql
- 20250127000000_create_product_option_fields.sql
- 20250130000002_create_chat_history.sql

### Group 5: SaaS Multi-tenancy (2026-01-28)
- 20260128000000_create_organizations_and_subscriptions.sql
- 20260128000001_extend_rls_for_multitenancy.sql

### Group 6: Lens Systems (2026-01-29-31)
- 20260129000000_create_lens_families_and_matrices.sql
- 20260131000005_create_contact_lenses_system.sql

## Migration Dependencies Map
EOF

echo "Analysis complete. See $OUTPUT_DIR/consolidation-plan.md for details."
#!/bin/bash
# Migration Consolidation Tool

MIGRATIONS_DIR="supabase/migrations"
CONSOLIDATED_DIR="supabase/consolidated"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Function to consolidate a group of migrations
consolidate_group() {
    local group_name="$1"
    shift
    local files=("$@")
    
    if [ ${#files[@]} -lt 2 ]; then
        echo "Skipping $group_name (only ${#files[@]} file)"
        return
    fi
    
    local output_file="$CONSOLIDATED_DIR/${TIMESTAMP}_${group_name}.sql"
    echo "-- Consolidated Migration: $group_name" > "$output_file"
    echo "-- Generated: $(date)" >> "$output_file"
    echo "-- Original files: ${#files[@]}" >> "$output_file"
    echo "" >> "$output_file"
    
    for file in "${files[@]}"; do
        if [ -f "$MIGRATIONS_DIR/$file" ]; then
            echo "-- === Source: $file ===" >> "$output_file"
            cat "$MIGRATIONS_DIR/$file" >> "$output_file"
            echo "" >> "$output_file"
            echo "-- === End of $file ===" >> "$output_file"
            echo "" >> "$output_file"
        fi
    done
    
    echo "Created consolidated migration: $(basename "$output_file")"
}

# Define migration groups
echo "Starting migration consolidation..."

# Group 1: Core Schema Foundation
consolidate_group "core_schema" \
    "20241220000000_create_user_profiles.sql" \
    "20241220000001_create_ecommerce_system.sql"

# Group 2: Admin System Setup
consolidate_group "admin_system" \
    "20250116000000_setup_admin_users.sql" \
    "20250116000001_fix_admin_profile.sql" \
    "20250116000003_fix_admin_rls.sql" \
    "20250116200000_create_support_system.sql" \
    "20250116210000_create_system_admin_tools.sql" \
    "20250118000000_create_admin_notifications.sql"

# Group 3: Optical Shop Conversion
consolidate_group "optical_conversion" \
    "20250120000000_add_admin_profiles_access.sql" \
    "20250121000000_create_pos_system.sql" \
    "20250122000000_convert_to_optical_shop.sql" \
    "20250123000000_adapt_customers_for_optical_shop.sql" \
    "20250124000000_remove_membership_from_customers.sql" \
    "20250125000000_create_lab_work_orders_system.sql"

# Group 4: SaaS Multi-tenancy
consolidate_group "saas_multitenancy" \
    "20260128000000_create_organizations_and_subscriptions.sql" \
    "20260128000001_extend_rls_for_multitenancy.sql"

# Group 5: Lens Systems
consolidate_group "lens_systems" \
    "20260129000000_create_lens_families_and_matrices.sql" \
    "20260131000005_create_contact_lenses_system.sql"

echo ""
echo "Consolidation complete!"
echo "Generated $(ls -1 "$CONSOLIDATED_DIR"/*.sql | wc -l) consolidated migration files"
echo "Location: $CONSOLIDATED_DIR"

# Create summary report
cat > "$CONSOLIDATED_DIR/consolidation-summary.md" << EOF
# Migration Consolidation Summary

**Date**: $(date)
**Original Migration Count**: 139 files
**Consolidated Groups Created**: $(ls -1 "$CONSOLIDATED_DIR"/*.sql | wc -l) files

## Consolidation Results

$(ls -la "$CONSOLIDATED_DIR"/*.sql | awk '{print $5 " bytes - " $9}' | sed 's#.*/##')

## Benefits Achieved

- Reduced deployment complexity
- Better organization by functionality
- Easier maintenance and review
- Clearer dependency relationships

## Next Steps

1. Review consolidated migrations for correctness
2. Test consolidated migrations in staging environment
3. Update documentation to reflect new structure
4. Consider removing redundant individual migrations (optional)

EOF

echo "Summary report created: $CONSOLIDATED_DIR/consolidation-summary.md"
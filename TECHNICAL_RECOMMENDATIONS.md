# Opttius Technical Recommendations

## Actionable Items for Performance and Code Quality Improvement

**Generated**: February 7, 2026  
**Based on**: Supabase Postgres Best Practices & Codebase Analysis

---

## Database Performance Optimization

### 1. Critical Indexes to Implement

```sql
-- Foreign Key Performance Indexes
CREATE INDEX CONCURRENTLY idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX CONCURRENTLY idx_quotes_branch_id ON public.quotes(branch_id);
CREATE INDEX CONCURRENTLY idx_work_orders_assigned_to ON public.lab_work_orders(assigned_to);
CREATE INDEX CONCURRENTLY idx_appointments_professional_id ON public.appointments(professional_id);
CREATE INDEX CONCURRENTLY idx_products_category_id ON public.products(category_id);

-- Composite Indexes for Common Queries
CREATE INDEX CONCURRENTLY idx_appointments_branch_date_status
ON public.appointments(branch_id, appointment_date, status);

CREATE INDEX CONCURRENTLY idx_orders_branch_created
ON public.orders(branch_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_quotes_customer_created
ON public.quotes(customer_id, created_at DESC);

-- Partial Indexes for Filtered Queries
CREATE INDEX CONCURRENTLY idx_products_active_featured
ON public.products(is_active, is_featured, category_id)
WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_customers_active_rut
ON public.customers(is_active, rut)
WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_work_orders_status_branch
ON public.lab_work_orders(status, branch_id)
WHERE status IN ('in_process', 'ready', 'quality_control');
```

### 2. Query Performance Monitoring Setup

Create a monitoring script to identify slow queries:

```sql
-- Enable query statistics collection
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View top 10 slowest queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    stddev_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor queries taking longer than 100ms
SELECT
    query,
    calls,
    total_time/calls as avg_time_ms
FROM pg_stat_statements
WHERE total_time/calls > 100
ORDER BY avg_time_ms DESC;
```

### 3. Database Maintenance Functions

```sql
-- Enhanced database optimization function
CREATE OR REPLACE FUNCTION public.optimize_database_advanced()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := NOW();
    v_tables_optimized TEXT[];
    v_indexes_created INTEGER := 0;
    v_result JSONB;
BEGIN
    -- Check permissions
    IF NOT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'root', 'dev')
        AND is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- Run ANALYZE on all tables
    SELECT array_agg(table_name) INTO v_tables_optimized
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

    FOREACH table_name IN ARRAY v_tables_optimized
    LOOP
        EXECUTE format('ANALYZE public.%I', table_name);
    END LOOP;

    -- Log the operation
    INSERT INTO public.system_maintenance_log (
        task_type, task_name, status, description, started_at, completed_at
    ) VALUES (
        'optimization',
        'Database Statistics Update',
        'completed',
        format('Analyzed %s tables', array_length(v_tables_optimized, 1)),
        v_start_time,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'tables_analyzed', array_length(v_tables_optimized, 1),
        'duration_seconds', extract(epoch from (NOW() - v_start_time)),
        'message', 'Database optimization completed successfully'
    );
END;
$$;
```

---

## Code Quality Improvements

### 1. Error Boundary Enhancement

```typescript
// src/components/ErrorBoundary.tsx
import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export function ErrorBoundary({ children, fallback: FallbackComponent }: Props) {
  const handleError = (error: Error, errorInfo: { componentStack: string }) => {
    // Log to error reporting service
    console.error('Application Error:', error, errorInfo);

    // In production, send to Sentry/New Relic
    if (process.env.NODE_ENV === 'production') {
      // Implementation depends on chosen service
    }
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={FallbackComponent || DefaultErrorFallback}
      onError={handleError}
    >
      {children}
    </ReactErrorBoundary>
  );
}

function DefaultErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={resetError}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 2. API Response Standardization

```typescript
// src/lib/api/types.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
  };
}

// src/lib/api/client.ts
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: data.message || "Request failed",
            details: data.details,
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        };
      }

      return {
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            error instanceof Error ? error.message : "Network error occurred",
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
```

### 3. Performance Monitoring Hook

```typescript
// src/hooks/usePerformanceMetrics.ts
import { useEffect, useRef } from "react";

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
}

export function usePerformanceMetrics(
  onMetrics: (metrics: PerformanceMetrics) => void,
) {
  const metricsRef = useRef<PerformanceMetrics>({});

  useEffect(() => {
    // Measure Core Web Vitals
    if ("performance" in window && "getEntriesByType" in performance) {
      // First Contentful Paint
      const paintEntries = performance.getEntriesByType("paint");
      const fcpEntry = paintEntries.find(
        (entry) => entry.name === "first-contentful-paint",
      );
      if (fcpEntry) {
        metricsRef.current.fcp = fcpEntry.startTime;
      }

      // Largest Contentful Paint
      const lcpEntries = performance.getEntriesByType(
        "largest-contentful-paint",
      );
      if (lcpEntries.length > 0) {
        metricsRef.current.lcp = lcpEntries[lcpEntries.length - 1].startTime;
      }

      // Cumulative Layout Shift
      const clsEntries = performance.getEntriesByType("layout-shift");
      if (clsEntries.length > 0) {
        let clsValue = 0;
        for (const entry of clsEntries) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        metricsRef.current.cls = clsValue;
      }
    }

    // Send metrics after page load
    if (document.readyState === "complete") {
      setTimeout(() => onMetrics(metricsRef.current), 1000);
    } else {
      window.addEventListener("load", () => {
        setTimeout(() => onMetrics(metricsRef.current), 1000);
      });
    }
  }, [onMetrics]);
}
```

---

## Migration Cleanup Strategy

### 1. Migration Consolidation Plan

```javascript
// scripts/consolidate-migrations.js
const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = "./supabase/migrations";
const OUTPUT_DIR = "./supabase/consolidated";

// Group migrations by functionality
const migrationGroups = {
  "core-schema": [
    "20241220000000_create_user_profiles.sql",
    "20241220000001_create_ecommerce_system.sql",
    // ... other core migrations
  ],
  "admin-system": [
    "20250116000000_setup_admin_users.sql",
    "20250116210000_create_system_admin_tools.sql",
    // ... admin-related migrations
  ],
  "optical-features": [
    "20260122000000_add_lens_family_id_to_quotes_work_orders.sql",
    "20260129000000_create_lens_families_and_matrices.sql",
    // ... optical-specific migrations
  ],
};

function consolidateGroup(groupName, migrationFiles) {
  const consolidatedContent = [];
  consolidatedContent.push(`-- Consolidated Migration: ${groupName}`);
  consolidatedContent.push("-- Generated by migration consolidation script\n");

  for (const file of migrationFiles) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      consolidatedContent.push(`-- Source: ${file}`);
      consolidatedContent.push(content);
      consolidatedContent.push("\n-- End of migration\n");
    }
  }

  const outputFileName = `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_${groupName}.sql`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);

  fs.writeFileSync(outputPath, consolidatedContent.join("\n"));
  console.log(`Created consolidated migration: ${outputFileName}`);
}

// Execute consolidation
Object.entries(migrationGroups).forEach(([groupName, files]) => {
  consolidateGroup(groupName, files);
});
```

### 2. Migration Validation Script

```sql
-- scripts/validate-migrations.sql
-- Validate migration integrity and dependencies

-- Check for orphaned foreign key references
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_name = ccu.table_name
    AND t.table_schema = ccu.table_schema
);

-- Check for missing indexes on foreign keys
SELECT
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND NOT EXISTS (
    SELECT 1 FROM pg_indexes i
    WHERE i.tablename = tc.table_name
    AND i.indexdef ILIKE '%' || kcu.column_name || '%'
);

-- Check for tables without primary keys
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
AND table_name NOT IN (
    SELECT tc.table_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
);
```

---

## Monitoring and Observability Setup

### 1. Production Error Tracking

```typescript
// src/lib/error-reporting.ts
import * as Sentry from '@sentry/nextjs';

export function initErrorReporting() {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }
}

// src/app/layout.tsx
import { initErrorReporting } from '@/lib/error-reporting';

initErrorReporting();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### 2. Performance Monitoring Dashboard

```sql
-- Create performance monitoring view
CREATE OR REPLACE VIEW public.performance_dashboard AS
SELECT
    -- Table sizes
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,

    -- Row counts
    (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', schemaname, tablename), false, true, '')))[1]::text::int as row_count,

    -- Last analyzed
    last_autoanalyze,
    last_autovacuum

FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Testing Improvements

### 1. Integration Test Framework

```typescript
// src/__tests__/integration/setup.ts
import { createClient } from "@supabase/supabase-js";
import { beforeAll, afterAll } from "vitest";

let supabase: ReturnType<typeof createClient>;

beforeAll(async () => {
  // Create test database connection
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Seed test data
  await seedTestData();
});

afterAll(async () => {
  // Cleanup test data
  await cleanupTestData();
});

async function seedTestData() {
  // Insert test organizations, users, products, etc.
  const { data: org } = await supabase
    .from("organizations")
    .insert({
      name: "Test Organization",
      slug: "test-org",
    })
    .select()
    .single();

  // Continue with other test data...
}

async function cleanupTestData() {
  // Delete test data in reverse order
  await supabase.from("appointments").delete().ilike("notes", "%TEST%");
  await supabase.from("customers").delete().ilike("first_name", "%Test%");
  await supabase.from("organizations").delete().eq("slug", "test-org");
}
```

### 2. Load Testing Script

```javascript
// scripts/load-test.js
const autocannon = require("autocannon");

const urls = [
  "/api/admin/customers",
  "/api/admin/products",
  "/api/admin/appointments",
  "/api/admin/orders",
];

async function runLoadTest(url) {
  const result = await autocannon({
    url: `http://localhost:3000${url}`,
    connections: 10,
    duration: 30,
    pipelining: 1,
    headers: {
      Authorization: "Bearer test-token", // Use test user token
    },
  });

  console.log(`Results for ${url}:`);
  console.log(`Requests per second: ${result.requests.average}`);
  console.log(`Latency (ms): ${result.latency.average}`);
  console.log(`Errors: ${result.errors}`);
  console.log("---");
}

async function main() {
  console.log("Starting load test...\n");

  for (const url of urls) {
    await runLoadTest(url);
  }
}

main().catch(console.error);
```

---

## Deployment Checklist

### Pre-deployment Validation

- [ ] All database migrations tested in staging
- [ ] Performance benchmarks established
- [ ] Error reporting configured
- [ ] Monitoring dashboards created
- [ ] Backup strategy verified
- [ ] Rollback plan documented

### Post-deployment Verification

- [ ] Smoke tests pass
- [ ] Critical user flows working
- [ ] Performance metrics within acceptable range
- [ ] Error rates below threshold
- [ ] Database connections healthy
- [ ] Cache warming completed

---

_This document provides actionable technical improvements for the Opttius project. Implementation should be prioritized based on business impact and resource availability._

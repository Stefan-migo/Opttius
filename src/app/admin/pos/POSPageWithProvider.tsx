/**
 * POSPageWithProvider - Wrapper component that provides POS context
 * This is the entry point that wraps the POS page with the POSProvider
 *
 * Migration strategy:
 * 1. This component provides the POS context
 * 2. The original page.tsx logic can gradually migrate to use usePOS() hook
 * 3. New components should use usePOS() for state management
 */

"use client";

import { useState } from "react";

import { useBranch } from "@/hooks/useBranch";

import { POSProvider, usePOS } from "./hooks";
import { POSPageContent } from "./POSPageContent";

// Inner component that uses the POS context
function POSPageInner() {
  const pos = usePOS();

  // This component has access to all POS state via usePOS()
  // Gradually migrate logic from page.tsx here

  return <POSPageContent />;
}

// Main wrapper component
export function POSPageWithProvider() {
  const {
    currentBranchId,
    isSuperAdmin,
    branches,
    isLoading: branchLoading,
  } = useBranch();

  const [fieldOperationId] = useState<string | null>(null);

  // Provide POS context to the entire page
  return (
    <POSProvider branchId={currentBranchId} isSuperAdmin={isSuperAdmin}>
      <POSPageInner />
    </POSProvider>
  );
}

// Re-export the original page as default for backward compatibility
// This allows gradual migration - both old and new code can work
export { POSPageContent as POSPageOriginal };

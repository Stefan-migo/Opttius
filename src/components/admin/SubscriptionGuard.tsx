"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useRoot } from "@/hooks/useRoot";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

/**
 * Guards admin content: if user has org with expired trial/subscription,
 * redirects to subscription-required page.
 * Root users and users without org bypass.
 */
export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { isRoot } = useRoot();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [shouldBlock, setShouldBlock] = useState(false);

  useEffect(() => {
    if (isRoot === undefined) return;
    if (isRoot) {
      setChecking(false);
      return;
    }
    // Don't block on subscription-required, checkout, help, or saas-management (root-only)
    if (
      pathname?.includes("/subscription-required") ||
      pathname?.includes("/checkout") ||
      pathname?.includes("/admin/help") ||
      pathname?.includes("/admin/saas-management")
    ) {
      setChecking(false);
      return;
    }

    fetch("/api/admin/subscription-status", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.organizationId && data.isExpired) {
          setShouldBlock(true);
          router.replace("/admin/subscription-required");
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [isRoot, pathname, router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (
    pathname?.includes("/subscription-required") ||
    pathname?.includes("/checkout") ||
    pathname?.includes("/admin/help") ||
    pathname?.includes("/admin/saas-management")
  ) {
    return children;
  }

  if (shouldBlock) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Redirigiendo...</p>
      </div>
    );
  }

  return <>{children}</>;
}

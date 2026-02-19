import { useState, useEffect, useCallback } from "react";
import { posService } from "@/lib/api/services";

export function usePOSCashStatus(
  branchId: string | null,
  isSuperAdmin: boolean,
) {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!branchId && !isSuperAdmin) {
      setIsOpen(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    try {
      const cashStatus = await posService.getCashStatus(branchId || undefined);
      setIsOpen(cashStatus?.isOpen ?? null);
    } catch (error) {
      console.error("Error checking cash status:", error);
    } finally {
      setChecking(false);
    }
  }, [branchId, isSuperAdmin]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return { isOpen, checking, refresh: checkStatus };
}

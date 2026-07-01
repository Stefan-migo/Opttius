"use client";

import { useEffect, useState } from "react";

import { useAuthContext } from "@/contexts/AuthContext";
import { useBranch } from "@/hooks/useBranch";
import { useRoot } from "@/hooks/useRoot";
import { getBranchHeader } from "@/lib/utils/branch";

export interface AdminStats {
  todayOrders: number;
  totalOrders: number;
  revenue: number;
  lowStock: number;
  newWorkOrders: number;
  inProgressWorkOrders: number;
  pendingQuotes: number;
  todayAppointments: number;
  openTickets: number;
}

interface UseAdminStatsParams {
  adminState: { isAdmin: boolean };
}

/**
 * Hook that fetches dashboard stats on interval.
 * Extracted from AdminShell.tsx to reduce component complexity.
 */
export function useAdminStats({ adminState }: UseAdminStatsParams) {
  const { user, loading } = useAuthContext();
  const { currentBranchId } = useBranch();
  const { isRoot } = useRoot();

  const [stats, setStats] = useState<AdminStats>({
    todayOrders: 0,
    totalOrders: 0,
    revenue: 0,
    lowStock: 0,
    newWorkOrders: 0,
    inProgressWorkOrders: 0,
    pendingQuotes: 0,
    todayAppointments: 0,
    openTickets: 0,
  });

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!adminState.isAdmin || !user || loading) return;

      try {
        const headers: HeadersInit = {
          ...getBranchHeader(currentBranchId),
        };

        const response = await fetch("/api/admin/dashboard", {
          headers,
          credentials: "include",
        });
        if (response.ok) {
          const result = await response.json();
          if (!result.success)
            throw new Error(result.error?.message || "Error fetching stats");

          const data = result.data;
          const workOrders = data.kpis?.workOrders || {};
          const quotes = data.kpis?.quotes || {};
          const appointments = data.kpis?.appointments || {};

          // Fetch open tickets count (only for non-root users)
          let openTicketsCount = 0;
          if (!isRoot) {
            try {
              const ticketsResponse = await fetch(
                "/api/admin/optical-support/tickets?limit=100",
              );
              if (ticketsResponse.ok) {
                const ticketsData = await ticketsResponse.json();
                const allTickets = ticketsData.tickets || [];
                openTicketsCount = allTickets.filter(
                  (t: { status?: string }) =>
                    t.status !== "resolved" && t.status !== "closed",
                ).length;
              } else if (ticketsResponse.status === 403) {
                console.debug("User doesn't have access to tickets");
              }
            } catch (error) {
              console.debug("Error fetching open tickets count:", error);
            }
          }

          setStats({
            todayOrders: data.kpis?.orders?.pending || 0,
            totalOrders: workOrders.pending || 0,
            revenue: data.kpis?.revenue?.current || 0,
            lowStock: data.kpis?.products?.lowStock || 0,
            newWorkOrders: workOrders.pending || 0,
            inProgressWorkOrders: workOrders.inProgress || 0,
            pendingQuotes: quotes.pending || 0,
            todayAppointments: appointments.today || 0,
            openTickets: openTicketsCount,
          });
        }
      } catch (error) {
        if (error instanceof Error && !error.message.includes("401")) {
          console.error("Error fetching stats:", error);
        }
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [adminState.isAdmin, user, loading, currentBranchId]);

  return { stats };
}

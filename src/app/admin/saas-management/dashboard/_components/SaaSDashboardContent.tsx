"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTelemetry } from "@/lib/telemetry/hooks/use-telemetry";
import { SaaSCharts } from "./SaaSCharts";
import { SaaSRecentActivity } from "./SaaSRecentActivity";
import { SaaSStatsCards } from "./SaaSStatsCards";

interface SaasMetrics {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  activeUsers: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  annualRevenue: number;
  organizationGrowth: number;
  trialConversionRate: number;
  tierDistribution?: Record<string, number>;
  organizationsLast30Days?: number;
}

export default function SaaSDashboardContent({
  initialUser,
}: {
  initialUser: { id: string; email?: string } | null;
}) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SaasMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(
    initialUser ? true : null,
  );
  const [telemetryEnabled, setTelemetryEnabled] = useState(true);
  const [updatingTelemetry, setUpdatingTelemetry] = useState(false);
  const [showResetDemoDialog, setShowResetDemoDialog] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);
  const { trackFeatureUsage } = useTelemetry("saas-dashboard");
  const { user } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (user === undefined) return;
    const authorized = !!user;
    if (isAuthorized !== authorized) {
      setIsAuthorized(authorized);
    }
    if (!user && isAuthorized !== false) {
      router.push("/unauthorized");
    }
  }, [user, isAuthorized, router]);

  useEffect(() => {
    if (!isAuthorized) return;

    const fetchTelemetryConfig = async () => {
      try {
        const response = await fetch(
          "/api/admin/saas-management/telemetry-config",
        );
        if (response.ok) {
          const data = await response.json();
          setTelemetryEnabled(data.enabled);
        }
      } catch (err) {
        console.error("Error fetching telemetry config:", err);
      }
    };

    fetchTelemetryConfig();
  }, [isAuthorized]);

  const handleResetDemo = async () => {
    try {
      setResettingDemo(true);
      const response = await fetch("/api/admin/saas-management/reset-demo", {
        method: "POST",
      });
      if (response.ok) {
        toast.success("Óptica Demo reseteada correctamente");
        setShowResetDemoDialog(false);
        trackFeatureUsage("admin_reset_demo");
      } else {
        const data = await response.json();
        toast.error(
          data.details || data.error || "Error al resetear la Óptica Demo",
        );
      }
    } catch (err) {
      toast.error("Error al resetear la Óptica Demo");
      console.error(err);
    } finally {
      setResettingDemo(false);
    }
  };

  const handleToggleTelemetry = async (enabled: boolean) => {
    try {
      setUpdatingTelemetry(true);
      const response = await fetch(
        "/api/admin/saas-management/telemetry-config",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        },
      );

      if (response.ok) {
        setTelemetryEnabled(enabled);
        toast.success(
          `Telemetría ${enabled ? "activada" : "desactivada"} globalmente`,
        );
        trackFeatureUsage("admin_telemetry_toggle", { enabled });
      } else {
        throw new Error("Error al actualizar configuración");
      }
    } catch (err) {
      toast.error("No se pudo actualizar la configuración de telemetría");
      console.error(err);
    } finally {
      setUpdatingTelemetry(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    if (typeof window !== "undefined") {
      trackFeatureUsage("usage_dashboard_view");
    }
  }, [trackFeatureUsage, isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/saas-management/analytics");

        if (!response.ok) {
          throw new Error("Error al cargar métricas");
        }

        const data = await response.json();
        setMetrics(data.metrics);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [isAuthorized]);

  if (loading || isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-epoch-primary mx-auto" />
          <p className="text-epoch-primary/70">Cargando métricas del SaaS...</p>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Access denied. You don't have permission to view this dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="admin-card">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Error: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">
          SaaS Engine
        </h1>
        <p className="text-white/50 mt-2">
          Dashboard principal con métricas del sistema completo
        </p>
      </div>

      {metrics && <SaaSStatsCards metrics={metrics} />}

      {metrics && <SaaSCharts metrics={metrics} />}

      <SaaSRecentActivity
        telemetryEnabled={telemetryEnabled}
        onToggleTelemetry={handleToggleTelemetry}
        updatingTelemetry={updatingTelemetry}
        onResetDemo={handleResetDemo}
        showResetDemoDialog={showResetDemoDialog}
        onShowResetDemoDialogChange={setShowResetDemoDialog}
        resettingDemo={resettingDemo}
      />
    </div>
  );
}

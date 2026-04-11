"use client";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  HelpCircle,
  Mail,
  MessageCircle,
  RotateCcw,
  Settings,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTelemetry } from "@/lib/telemetry/hooks/use-telemetry";

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

export default function SaaSDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SaasMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [telemetryEnabled, setTelemetryEnabled] = useState(true);
  const [updatingTelemetry, setUpdatingTelemetry] = useState(false);
  const [showResetDemoDialog, setShowResetDemoDialog] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);
  const { trackFeatureUsage } = useTelemetry("saas-dashboard");
  const { user, isAdmin, isSuperAdmin } = useAuthContext();
  const router = useRouter();

  // Check authorization - optimized to avoid redundant updates
  useEffect(() => {
    if (user === undefined) return;

    // Temporary bypass for debugging
    const authorized = !!user;

    // Setting state in useEffect is fine, but we should only do it if the value changed
    if (isAuthorized !== authorized) {
      setIsAuthorized(authorized);
    }

    if (user && !authorized) {
      router.push("/unauthorized");
    }
  }, [user, isAuthorized, router]);

  // Fetch telemetry configuration
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

        // Track the change
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
    // Only fetch data if authorized
    if (!isAuthorized) return;

    // Track dashboard usage (only after component mounts)
    if (typeof window !== "undefined") {
      trackFeatureUsage("usage_dashboard_view");
    }
  }, [trackFeatureUsage, isAuthorized]);

  useEffect(() => {
    // Only fetch data if authorized
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

  // Show loading state
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

  // Show unauthorized message
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

  // Show error state
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

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(value);
  };

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

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Organizaciones Activas
            </CardTitle>
            <Building2 className="h-4 w-4 text-[#C5A059]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {metrics?.activeOrganizations || 0}
            </div>
            <p className="text-xs text-white/50">
              de {metrics?.totalOrganizations || 0} totales
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Usuarios Activos
            </CardTitle>
            <Users className="h-4 w-4 text-[#C5A059]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {metrics?.activeUsers || 0}
            </div>
            <p className="text-xs text-white/50">
              de {metrics?.totalUsers || 0} totales
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Suscripciones Activas
            </CardTitle>
            <CreditCard className="h-4 w-4 text-[#C5A059]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {metrics?.activeSubscriptions || 0}
            </div>
            <p className="text-xs text-white/50">
              de {metrics?.totalSubscriptions || 0} totales
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Ingresos Mensuales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-[#C5A059]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatPrice(metrics?.monthlyRevenue || 0)}
            </div>
            <p className="text-xs text-white/50">
              {metrics?.organizationGrowth || 0}% crecimiento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ingresos Anuales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatPrice(metrics?.annualRevenue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              Tasa de Conversión de Trials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {metrics?.trialConversionRate || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribución por tier */}
      {metrics?.tierDistribution && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Distribución por Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(metrics.tierDistribution).map(([tier, count]) => (
                <div
                  className="p-4 border border-white/10 rounded-lg text-center bg-white/5"
                  key={tier}
                >
                  <div className="text-2xl font-bold text-white">{count}</div>
                  <div className="text-sm text-white/50 mt-1">
                    {tier === "basic"
                      ? "Básico"
                      : tier === "pro"
                        ? "Pro"
                        : tier === "premium"
                          ? "Premium"
                          : tier}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crecimiento */}
      {metrics?.organizationsLast30Days !== undefined && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Crecimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-white/50">
                  Organizaciones creadas (últimos 30 días)
                </div>
                <div className="text-2xl font-bold text-white">
                  {metrics.organizationsLast30Days}
                </div>
              </div>
              <div>
                <div className="text-sm text-white/50">Crecimiento mensual</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {metrics.organizationGrowth > 0 ? "+" : ""}
                  {metrics.organizationGrowth.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sección de Seguridad y Backups SaaS */}
      <div className="grid grid-cols-1 gap-6">
        <Card
          className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-[#C5A059]"
          onClick={() => router.push("/admin/saas-management/backups")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#C5A059]/20 rounded-lg">
                  <Shield className="h-6 w-6 text-[#C5A059]" />
                </div>
                <div>
                  <CardTitle className="text-white">
                    SaaS Disaster Recovery & Backups
                  </CardTitle>
                  <p className="text-sm text-white/50 mt-1">
                    Gestión integral de respaldos del servidor y descarga de
                    volcados SQL
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-white/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Triple Capa de Seguridad Activa
                </div>
                <ul className="text-xs text-white/50 space-y-2 list-disc pl-5">
                  <li>Backups individuales por organización (diarios)</li>
                  <li>Backups integrales de todo el SaaS (semanales)</li>
                  <li>Cifrado AES-256 de archivos en reposo</li>
                </ul>
              </div>
              <div className="flex-1 border-l border-white/10 pl-6">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  Estado del Sistema
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                  </span>
                  <span className="text-xs text-white/50">
                    Almacenamiento Conectado & Protegido
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estado del Sistema y Telemetría */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="bg-white/5 border-white/10 border-l-4 border-l-[#C5A059]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#C5A059]" />
                <CardTitle className="text-lg text-white">
                  Estado de Telemetría
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${telemetryEnabled ? "text-emerald-400" : "text-red-400"}`}
                >
                  {telemetryEnabled ? "Activa" : "Inactiva"}
                </span>
                <Switch
                  checked={telemetryEnabled}
                  disabled={updatingTelemetry}
                  onCheckedChange={handleToggleTelemetry}
                />
              </div>
            </div>
            <p className="text-xs text-white/50 mt-1">
              Control global de recolección de métricas y tracking de eventos.
              Desactívelo para reducir carga en el servidor.
            </p>
          </CardHeader>
        </Card>

        <Card className="bg-white/5 border-white/10 border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-lg text-white">
                Salud del Sistema
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-medium text-emerald-400">
                  Sistemas operacionales
                </span>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Navegación rápida a secciones de gestión */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Gestión del Sistema</CardTitle>
          <p className="text-sm text-white/50 mt-2">
            Acceso rápido a las herramientas de administración SaaS
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Analytics Dashboard */}
            <Card
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-[#C5A059]"
              onClick={() => router.push("/admin/saas-management/analytics")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#C5A059]/20 rounded-lg">
                      <BarChart3 className="h-6 w-6 text-[#C5A059]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        Analytics Dashboard
                      </h3>
                      <p className="text-sm text-white/50">
                        Telemetría y métricas de uso del sistema
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/50" />
                </div>
              </CardContent>
            </Card>
            {/* Organizaciones */}
            <Card
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-[#C5A059]"
              onClick={() =>
                router.push("/admin/saas-management/organizations")
              }
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#C5A059]/20 rounded-lg">
                      <Building2 className="h-6 w-6 text-[#C5A059]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        Organizaciones
                      </h3>
                      <p className="text-sm text-white/50">
                        Gestionar todas las organizaciones
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/50" />
                </div>
              </CardContent>
            </Card>

            {/* Usuarios */}
            <Card
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-[#C5A059]"
              onClick={() => router.push("/admin/saas-management/users")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#C5A059]/20 rounded-lg">
                      <Users className="h-6 w-6 text-[#C5A059]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        Usuarios
                      </h3>
                      <p className="text-sm text-white/50">
                        Administrar usuarios globales
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/50" />
                </div>
              </CardContent>
            </Card>

            {/* Suscripciones */}
            <Card
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-[#C5A059]"
              onClick={() =>
                router.push("/admin/saas-management/subscriptions")
              }
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#C5A059]/20 rounded-lg">
                      <CreditCard className="h-6 w-6 text-[#C5A059]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        Suscripciones
                      </h3>
                      <p className="text-sm text-white/50">
                        Gestionar suscripciones activas
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/50" />
                </div>
              </CardContent>
            </Card>

            {/* Tiers */}
            <Card
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-[#C5A059]"
              onClick={() => router.push("/admin/saas-management/tiers")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#C5A059]/20 rounded-lg">
                      <Settings className="h-6 w-6 text-[#C5A059]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        Tiers
                      </h3>
                      <p className="text-sm text-white/50">
                        Configurar planes de suscripción
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/50" />
                </div>
              </CardContent>
            </Card>

            {/* Configuración SaaS */}
            <Card
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-[#C5A059]"
              onClick={() => router.push("/admin/saas-management/config")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#C5A059]/20 rounded-lg">
                      <Settings className="h-6 w-6 text-[#C5A059]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        Configuración SaaS
                      </h3>
                      <p className="text-sm text-white/50">
                        Período de prueba por defecto y parámetros
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/50" />
                </div>
              </CardContent>
            </Card>

            {/* Flujos de Nuevos Usuarios */}
            <Card
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-[#C5A059]"
              onClick={() =>
                router.push("/admin/saas-management/new-users-flow")
              }
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#C5A059]/20 rounded-lg">
                      <Users className="h-6 w-6 text-[#C5A059]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        Flujos de Nuevos Usuarios
                      </h3>
                      <p className="text-sm text-white/50">
                        Solicitudes demo, ópticas conocidas y aprobaciones
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/50" />
                </div>
              </CardContent>
            </Card>

            {/* Soporte */}
            <Card
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-[#C5A059]"
              onClick={() => router.push("/admin/saas-management/support")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#C5A059]/20 rounded-lg">
                      <HelpCircle className="h-6 w-6 text-[#C5A059]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Soporte</h3>
                      <p className="text-sm text-white/50">
                        Búsqueda rápida y resolución
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/50" />
                </div>
              </CardContent>
            </Card>

            {/* Gestión de Emails */}
            <Card
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-[#C5A059]"
              onClick={() => router.push("/admin/saas-management/emails")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#C5A059]/20 rounded-lg">
                      <Mail className="h-6 w-6 text-[#C5A059]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        Emails
                      </h3>
                      <p className="text-sm text-white/50">
                        Configurar plantillas y comunicaciones SaaS
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/50" />
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp */}
            <Card
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-[#C5A059]"
              onClick={() => router.push("/admin/saas-management/whatsapp")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#C5A059]/20 rounded-lg">
                      <MessageCircle className="h-6 w-6 text-[#C5A059]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        WhatsApp
                      </h3>
                      <p className="text-sm text-white/50">
                        Configurar números y ver conversaciones del canal
                        WhatsApp
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/50" />
                </div>
              </CardContent>
            </Card>

            {/* Pasarelas de Pago */}
            <Card
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-[#C5A059]"
              onClick={() => router.push("/admin/saas-management/payments")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#C5A059]/20 rounded-lg">
                      <Zap className="h-6 w-6 text-[#C5A059]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        Pasarelas de Pago
                      </h3>
                      <p className="text-sm text-white/50">
                        Habilitar/deshabilitar métodos de pago
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/50" />
                </div>
              </CardContent>
            </Card>

            {/* Resetear Óptica Demo - Herramientas de desarrollo */}
            <Card
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-amber-500"
              onClick={() => setShowResetDemoDialog(true)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <RotateCcw className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        Resetear Óptica Demo
                      </h3>
                      <p className="text-sm text-white/50">
                        Restaurar la base de datos de la Óptica Demo al estado
                        inicial (solo dev)
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de confirmación Reset Demo */}
      <Dialog open={showResetDemoDialog} onOpenChange={setShowResetDemoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetear Óptica Demo</DialogTitle>
            <DialogDescription>
              Esto borrará todos los datos de la Óptica Demo y los restaurará al
              estado inicial. Los clientes, productos, órdenes, citas y demás
              datos serán eliminados y reemplazados por datos de prueba.
              ¿Continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={resettingDemo}
              variant="outline"
              onClick={() => setShowResetDemoDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={resettingDemo}
              variant="destructive"
              onClick={handleResetDemo}
            >
              {resettingDemo ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                  Reseteando...
                </>
              ) : (
                "Resetear Óptica Demo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

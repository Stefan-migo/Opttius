"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  DollarSign,
  Settings,
  HelpCircle,
  ArrowRight,
  Zap,
  Mail,
  Shield,
  Database,
  HardDrive,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

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

export default function SaasManagementDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SaasMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Cargando métricas del SaaS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
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
        <h1 className="text-3xl font-bold text-azul-profundo">
          Gestión SaaS Opttius
        </h1>
        <p className="text-tierra-media mt-2">
          Dashboard principal con métricas del sistema completo
        </p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Organizaciones Activas
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.activeOrganizations || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              de {metrics?.totalOrganizations || 0} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Usuarios Activos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.activeUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              de {metrics?.totalUsers || 0} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Suscripciones Activas
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.activeSubscriptions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              de {metrics?.totalSubscriptions || 0} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos Mensuales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(metrics?.monthlyRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.organizationGrowth || 0}% crecimiento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
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

        <Card>
          <CardHeader>
            <CardTitle>Tasa de Conversión de Trials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics?.trialConversionRate || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribución por tier */}
      {metrics?.tierDistribution && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(metrics.tierDistribution).map(([tier, count]) => (
                <div key={tier} className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-gray-600 mt-1">
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
        <Card>
          <CardHeader>
            <CardTitle>Crecimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">
                  Organizaciones creadas (últimos 30 días)
                </div>
                <div className="text-2xl font-bold">
                  {metrics.organizationsLast30Days}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Crecimiento mensual</div>
                <div className="text-2xl font-bold">
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
          className="border-l-4 border-l-blue-600 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => router.push("/admin/saas-management/backups")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>SaaS Disaster Recovery & Backups</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gestión integral de respaldos del servidor y descarga de
                    volcados SQL
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Triple Capa de Seguridad Activa
                </div>
                <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-5">
                  <li>Backups individuales por organización (diarios)</li>
                  <li>Backups integrales de todo el SaaS (semanales)</li>
                  <li>Cifrado AES-256 de archivos en reposo</li>
                </ul>
              </div>
              <div className="flex-1 border-l pl-6 border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Estado del Sistema
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="text-xs text-gray-600">
                    Almacenamiento Conectado & Protegido
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navegación rápida a secciones de gestión */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión del Sistema</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Acceso rápido a las herramientas de administración SaaS
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Organizaciones */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() =>
                router.push("/admin/saas-management/organizations")
              }
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Organizaciones</h3>
                      <p className="text-sm text-muted-foreground">
                        Gestionar todas las organizaciones
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Usuarios */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push("/admin/saas-management/users")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Usuarios</h3>
                      <p className="text-sm text-muted-foreground">
                        Administrar usuarios globales
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Suscripciones */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() =>
                router.push("/admin/saas-management/subscriptions")
              }
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Suscripciones</h3>
                      <p className="text-sm text-muted-foreground">
                        Gestionar suscripciones activas
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Tiers */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push("/admin/saas-management/tiers")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <Settings className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Tiers</h3>
                      <p className="text-sm text-muted-foreground">
                        Configurar planes de suscripción
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Configuración SaaS */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push("/admin/saas-management/config")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                      <Settings className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        Configuración SaaS
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Período de prueba por defecto y parámetros
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Soporte */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push("/admin/saas-management/support")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                      <HelpCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Soporte</h3>
                      <p className="text-sm text-muted-foreground">
                        Búsqueda rápida y resolución
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Gestión de Emails */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push("/admin/saas-management/emails")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
                      <Mail className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Emails</h3>
                      <p className="text-sm text-muted-foreground">
                        Configurar plantillas y comunicaciones SaaS
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Pasarelas de Pago */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push("/admin/saas-management/payments")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                      <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        Pasarelas de Pago
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Habilitar/deshabilitar métodos de pago
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

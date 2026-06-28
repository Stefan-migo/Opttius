"use client";

import {
  Building2,
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface SaaSStatsCardsProps {
  metrics: SaasMetrics;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(value);
}

export function SaaSStatsCards({ metrics }: SaaSStatsCardsProps) {
  return (
    <>
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
              {metrics.activeOrganizations}
            </div>
            <p className="text-xs text-white/50">
              de {metrics.totalOrganizations} totales
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
              {metrics.activeUsers}
            </div>
            <p className="text-xs text-white/50">
              de {metrics.totalUsers} totales
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
              {metrics.activeSubscriptions}
            </div>
            <p className="text-xs text-white/50">
              de {metrics.totalSubscriptions} totales
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
              {formatPrice(metrics.monthlyRevenue)}
            </div>
            <p className="text-xs text-white/50">
              {metrics.organizationGrowth}% crecimiento
            </p>
          </CardContent>
        </Card>
      </div>

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
              {formatPrice(metrics.annualRevenue)}
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
              {metrics.trialConversionRate}%
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

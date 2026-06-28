"use client";

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

interface SaaSChartsProps {
  metrics: SaasMetrics;
}

export function SaaSCharts({ metrics }: SaaSChartsProps) {
  return (
    <>
      {/* Distribución por tier */}
      {metrics.tierDistribution && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              Distribución por Tier
            </CardTitle>
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
      {metrics.organizationsLast30Days !== undefined && (
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
                <div className="text-sm text-white/50">
                  Crecimiento mensual
                </div>
                <div className="text-2xl font-bold text-emerald-400">
                  {metrics.organizationGrowth > 0 ? "+" : ""}
                  {metrics.organizationGrowth.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

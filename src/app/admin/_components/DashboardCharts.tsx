"use client";

import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

import type { DashboardData } from "./types";

interface DashboardChartsProps {
  data: DashboardData;
  revenuePeriod: string;
  onRevenuePeriodChange: (value: string) => void;
}

export default function DashboardCharts({
  data,
  revenuePeriod,
  onRevenuePeriodChange,
}: DashboardChartsProps) {
  return (
    <Card className="border border-admin-border-primary/20 bg-admin-border-primary/5 rounded-xl shadow-none overflow-hidden group">
      <CardHeader className="pb-2 border-b border-admin-border-primary/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-epoch-primary/5 border border-epoch-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-epoch-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
                Evolución de Ingresos
              </CardTitle>
            </div>
          </div>
          <Select value={revenuePeriod} onValueChange={onRevenuePeriodChange}>
            <SelectTrigger className="w-[140px] h-9 text-[10px] font-display font-bold uppercase tracking-widest border-admin-border-primary/30 bg-admin-bg-tertiary/50 hover:bg-admin-bg-secondary transition-colors rounded-xl">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-admin-border-primary/30">
              <SelectItem
                className="text-[10px] font-display uppercase tracking-widest"
                value="7"
              >
                7 días
              </SelectItem>
              <SelectItem
                className="text-[10px] font-display uppercase tracking-widest"
                value="30"
              >
                30 días
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest mt-2">
          {revenuePeriod === "7"
            ? "Análisis del ciclo semanal de facturación"
            : "Análisis del rendimiento operativo mensual"}
        </p>
      </CardHeader>
      <CardContent className="p-3 md:p-8">
        {data?.charts?.revenueTrend?.length > 0 ? (
          <div className="h-[160px] md:h-[220px] lg:h-[280px] w-full">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart
                data={data.charts.revenueTrend}
                id="dashboard-revenue-chart"
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorRevenue"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="rgba(0,0,0,0.03)"
                  strokeDasharray="0"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="date"
                  dy={10}
                  tick={{
                    fontSize: 9,
                    fontWeight: 700,
                    fill: "var(--admin-text-tertiary)",
                    fontFamily: "var(--font-display)",
                  }}
                  tickFormatter={(date) =>
                    new Date(date)
                      .toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                      })
                      .toUpperCase()
                  }
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={{
                    fontSize: 9,
                    fontWeight: 700,
                    fill: "var(--admin-text-tertiary)",
                    fontFamily: "var(--font-display)",
                  }}
                  tickFormatter={(value) =>
                    `$${value >= 1000 ? (value / 1000).toFixed(0) + "k" : value}`
                  }
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--admin-bg-secondary)",
                    borderRadius: "0",
                    border: "1px solid var(--admin-accent-secondary)",
                    boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.4)",
                    fontSize: "10px",
                    fontWeight: "bold",
                    fontFamily: "var(--font-display)",
                    color: "var(--admin-text-primary)",
                    padding: "12px",
                    zIndex: 100,
                  }}
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Ingresos",
                  ]}
                  itemStyle={{
                    color: "var(--admin-accent-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                  labelFormatter={(date) =>
                    new Date(date).toLocaleDateString("es-AR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  }
                  labelStyle={{
                    color: "rgba(249, 247, 242, 0.5)",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                  }}
                />
                <Area
                  animationDuration={2000}
                  dataKey="revenue"
                  fill="url(#colorRevenue)"
                  fillOpacity={1}
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-center space-y-4">
            <div className="h-12 w-12 rounded-xl bg-admin-bg-tertiary border border-admin-border-primary/10 flex items-center justify-center">
              <BarChart className="h-6 w-6 text-admin-text-tertiary/20" />
            </div>
            <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
              Falta de registros para el análisis operativo
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

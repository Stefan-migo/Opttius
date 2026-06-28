"use client";

import { Calendar, CheckCircle2, Clock, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Stats } from "./types";

interface StatsCardsProps {
  stats: Stats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/70">
            <Clock className="h-4 w-4 text-amber-400" />
            Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white">
            {stats.pendingRequests}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/70">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Aprobadas este mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white">
            {stats.approvedThisMonth}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/70">
            <Users className="h-4 w-4 text-blue-400" />
            Demos activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white">
            {stats.activeDemos}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/70">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            Tasa conversión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white">
            {stats.conversionRate ?? 0}%
          </div>
          <p className="text-xs text-white/40 mt-1">
            {stats.totalConverted ?? 0} / {stats.totalApproved ?? 0}
          </p>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/70">
            <Calendar className="h-4 w-4 text-orange-400" />
            Por vencer (2 días)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white">
            {stats.expiringSoon ?? 0}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

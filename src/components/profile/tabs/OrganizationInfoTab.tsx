"use client";

import { ArrowRight, Building2, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrganizationInfoTabProps {
  subscriptionData: { currentTier?: string } | null;
  onNavigateToAdmin: () => void;
  onNavigateToSettings: () => void;
}

export function OrganizationInfoTab({
  subscriptionData,
  onNavigateToAdmin,
  onNavigateToSettings,
}: OrganizationInfoTabProps) {
  return (
    <Card
      className="overflow-hidden border-2 border-primary/5 shadow-2xl shadow-primary/5"
      variant="elevated"
    >
      <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl md:text-2xl font-bold font-cormorant tracking-tight">
          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg sm:rounded-xl">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          Mi Organización
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 md:gap-8">
          <div className="flex flex-wrap gap-6 sm:gap-10 justify-center md:justify-start">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">
                Estado Cuenta
              </p>
              <Badge
                className="px-3 sm:px-4 py-1 text-[9px] sm:text-[10px] font-bold"
                variant="healty"
              >
                ACTIVA
              </Badge>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">
                Plan Actual
              </p>
              <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white uppercase">
                {subscriptionData?.currentTier || "Basic"}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full md:w-auto">
            <Button
              className="flex-1 md:flex-none border-2 h-12 min-h-[44px]"
              variant="outline"
              onClick={onNavigateToSettings}
            >
              <Settings className="h-5 w-5 mr-2 shrink-0" />
              Ajustes
            </Button>
            <Button
              shimmer
              className="flex-1 md:flex-none h-12 min-h-[44px] shadow-xl shadow-primary/10"
              onClick={onNavigateToAdmin}
            >
              Panel Administrativo
              <ArrowRight className="ml-2 h-5 w-5 shrink-0" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

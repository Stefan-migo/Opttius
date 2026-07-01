"use client";

import {
  ArrowRight,
  Building2,
  CreditCard,
  Edit3,
  MapPin,
  User,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { Tables } from "@/types/database";

import { OrganizationInfoTab } from "./OrganizationInfoTab";

type Profile = Tables<"profiles">;

interface OverviewTabProps {
  variant: "public" | "admin";
  profile: Profile | null;
  user: { email?: string | null };
  adminData: Record<string, unknown> | null;
  subscriptionData: { currentTier?: string } | null;
  dataLoading: boolean;
  needsOnboarding: boolean;
  hasOrganization: boolean;
  onNavigateToTab: (tab: string) => void;
  onEditPersonal: () => void;
  onEditAddress: () => void;
  onNavigateToAdmin: () => void;
  onNavigateToSettings: () => void;
  onNavigateToOnboarding: () => void;
}

export function OverviewTab({
  variant,
  profile,
  user,
  adminData,
  subscriptionData,
  dataLoading,
  needsOnboarding,
  hasOrganization,
  onEditPersonal,
  onEditAddress,
  onNavigateToAdmin,
  onNavigateToSettings,
  onNavigateToOnboarding,
  onNavigateToTab,
}: OverviewTabProps) {
  return (
    <>
      {variant === "public" && !dataLoading && needsOnboarding && (
        <Card
          className="border-primary/20 bg-primary/5 shadow-xl shadow-primary/5 overflow-hidden"
          variant="glass"
        >
          <CardContent className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6 md:gap-8">
              <div className="flex-shrink-0 relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse rounded-full" />
                <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl">
                  <Building2 className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0 text-center md:text-left">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-1 sm:mb-2 tracking-tight">
                  Configura tu Óptica Profesional
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-0 font-medium font-body leading-relaxed">
                  Desbloquea todas las herramientas especializadas configurando
                  tu organización real. Toma menos de 2 minutos.
                </p>
              </div>
              <Button
                shimmer
                className="w-full md:w-auto min-h-[44px] shadow-xl shadow-primary/20 font-bold"
                size="lg"
                onClick={onNavigateToOnboarding}
              >
                Comenzar Ahora
                <ArrowRight className="ml-2 h-5 w-5 shrink-0" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {variant === "public" && !dataLoading && hasOrganization && (
        <OrganizationInfoTab
          subscriptionData={subscriptionData}
          onNavigateToAdmin={onNavigateToAdmin}
          onNavigateToSettings={onNavigateToSettings}
        />
      )}

      <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 md:grid-cols-2">
        <Card className="group" variant="interactive">
          <CardHeader className="p-4 sm:p-6 pb-4">
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-bold font-cormorant tracking-tight text-slate-800 dark:text-white group-hover:text-primary transition-colors">
              <div className="p-1.5 sm:p-2 bg-[var(--admin-bg-tertiary)] rounded-lg sm:rounded-xl group-hover:bg-primary/10 transition-colors">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400 group-hover:text-primary" />
              </div>
              Información Base
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0" spacing="relaxed">
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-slate-100/50 dark:bg-slate-900/50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[var(--admin-border-secondary)] group-hover:border-primary/30 transition-all">
                <Label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Nombre Completo
                </Label>
                <p className="text-sm sm:text-base font-bold mt-1 text-slate-800 dark:text-slate-100 break-words">
                  {profile?.first_name && profile?.last_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : "Pendiente de completar"}
                </p>
              </div>
              <div className="bg-slate-100/50 dark:bg-slate-900/50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[var(--admin-border-secondary)] group-hover:border-primary/30 transition-all">
                <Label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Canal de Acceso
                </Label>
                <p className="text-sm sm:text-base font-bold mt-1 text-slate-800 dark:text-slate-100 truncate">
                  {user.email}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-slate-100/50 dark:bg-slate-900/50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[var(--admin-border-secondary)] group-hover:border-primary/30 transition-all">
                  <Label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Teléfono
                  </Label>
                  <p className="text-xs sm:text-sm font-bold mt-1 text-slate-800 dark:text-slate-100">
                    {profile?.phone || "Sin registro"}
                  </p>
                </div>
                <div className="bg-[var(--admin-bg-tertiary)] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[var(--admin-border-secondary)] group-hover:border-primary/30 transition-all">
                  <Label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Cumpleaños
                  </Label>
                  <p className="text-xs sm:text-sm font-bold mt-1 text-slate-800 dark:text-slate-100">
                    {profile?.date_of_birth
                      ? formatDate(profile.date_of_birth)
                      : "Sin registro"}
                  </p>
                </div>
              </div>
            </div>
            <Button
              className="w-full mt-4 sm:mt-6 border-2 border-[var(--accent-foreground)] text-[var(--accent-foreground)] rounded-xl sm:rounded-2xl font-bold h-12 min-h-[44px] hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
              variant="outline"
              onClick={onEditPersonal}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Actualizar Información
            </Button>
          </CardContent>
        </Card>

        <Card className="group" variant="interactive">
          <CardHeader className="p-4 sm:p-6 pb-4">
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-bold font-cormorant tracking-tight text-[var(--accent-foreground)] transition-colors">
              <div className="p-1.5 sm:p-2 bg-[var(--admin-bg-tertiary)] rounded-lg sm:rounded-xl transition-colors">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--accent-foreground)]" />
              </div>
              Ubicación Principal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0" spacing="relaxed">
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-[var(--admin-bg-tertiary)] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[var(--admin-border-secondary)] group-hover:border-primary/30 transition-all min-h-[72px] sm:min-h-[84px]">
                <Label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Dirección Lineal
                </Label>
                <div className="mt-1">
                  <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 break-words">
                    {profile?.address_line_1 || "Pendiente de completar"}
                  </p>
                  {profile?.address_line_2 && (
                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 break-words">
                      {profile.address_line_2}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-[var(--admin-bg-tertiary)] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[var(--admin-border-secondary)] group-hover:border-primary/30 transition-all">
                  <Label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Ciudad
                  </Label>
                  <p className="text-xs sm:text-sm font-bold mt-1 text-slate-800 dark:text-slate-100">
                    {profile?.city || "—"}
                  </p>
                </div>
                <div className="bg-[var(--admin-bg-tertiary)] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[var(--admin-border-secondary)] group-hover:border-primary/30 transition-all">
                  <Label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    País
                  </Label>
                  <p className="text-xs sm:text-sm font-bold mt-1 text-slate-800 dark:text-slate-100">
                    {profile?.country || "—"}
                  </p>
                </div>
              </div>
            </div>
            <Button
              className="w-full mt-4 sm:mt-6 bg-[var(--accent-foreground)] border-2 border-[var(--admin-border-secondary)] text-[var(--admin-bg-primary)] rounded-xl sm:rounded-2xl font-bold h-12 min-h-[44px] hover:bg-[var(--accent-foreground)] hover:text-white hover:border-[var(--accent-foreground)] transition-all duration-300"
              variant="outline"
              onClick={onEditAddress}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Gestionar Dirección
            </Button>
          </CardContent>
        </Card>

        <Card className="group md:col-span-2" variant="interactive">
          <CardHeader className="p-4 sm:p-6 pb-4">
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-bold font-cormorant tracking-tight text-slate-800 dark:text-white group-hover:text-primary transition-colors">
              <div className="p-1.5 sm:p-2 bg-[var(--admin-bg-tertiary)] rounded-lg sm:rounded-xl group-hover:bg-primary/10 transition-colors">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400 group-hover:text-primary" />
              </div>
              Estado de Suscripción
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 border border-[var(--admin-border-secondary)] flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 md:gap-8">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl sm:rounded-3xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30 shrink-0">
                  <Zap className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-1">
                    Tu Nivel Actual
                  </p>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                    Plan {subscriptionData?.currentTier || "Básico"}
                  </h3>
                </div>
              </div>
              <div className="w-full md:w-auto">
                <Button
                  shimmer
                  className="w-full md:w-auto min-h-[44px] h-12 sm:h-14 rounded-xl sm:rounded-2xl font-bold px-6 sm:px-8 shadow-xl shadow-primary/20"
                  disabled={!adminData?.adminCheck?.isOwner}
                  size="lg"
                  onClick={() => onNavigateToTab("subscription")}
                >
                  Gestionar Suscripción
                  <ArrowRight className="h-5 w-5 ml-2 shrink-0" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

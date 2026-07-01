"use client";

import {
  CreditCard,
  Edit3,
  Loader2,
  MapPin,
  Settings,
  User,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SubscriptionManagementSection } from "@/components/admin/SubscriptionManagementSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthContext } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";

import { ProfileHeaderCard } from "./_components/ProfileHeaderCard";
import { AddressTab } from "./tabs/AddressTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { PasswordTab } from "./tabs/PasswordTab";
import { PersonalInfoTab } from "./tabs/PersonalInfoTab";
import { PreferencesTab } from "./tabs/PreferencesTab";

export interface ProfilePageContentProps {
  variant: "public" | "admin";
  title?: string;
  subtitle?: string;
}

export function ProfilePageContent({
  variant,
  title = variant === "admin" ? "Mi Perfil Administrativo" : "Mi Perfil",
  subtitle = variant === "admin"
    ? "Gestiona tu información personal, preferencias y seguridad de acceso."
    : "Gestiona tu información personal, preferencias y configuración de cuenta con seguridad.",
}: ProfilePageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    profile,
    loading: authLoading,
    updateProfile,
    refetchProfile,
  } = useAuthContext();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "overview",
  );
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  const [adminData, setAdminData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [subscriptionData, setSubscriptionData] = useState<{
    currentTier?: string;
  } | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (variant === "public" && !authLoading && !user) {
      router.push("/login");
    }
  }, [variant, authLoading, user, router]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        const [adminRes, subRes] = await Promise.all([
          fetch("/api/admin/check-status"),
          fetch("/api/checkout/current-subscription"),
        ]);

        if (adminRes.ok) {
          const data = await adminRes.json();
          setAdminData(data);
        }
        if (subRes.ok) {
          const data = await subRes.json();
          setSubscriptionData(data);
        }
      } catch (error) {
        console.error("Error loading profile data:", error);
      } finally {
        setDataLoading(false);
      }
    };
    loadData();
  }, [user]);

  const needsOnboarding =
    variant === "public" &&
    adminData?.adminCheck?.isAdmin &&
    !adminData?.organization?.hasOrganization;
  const hasOrganization =
    variant === "public" && adminData?.organization?.hasOrganization;
  const showRoleBadge = variant === "admin";

  const memberSince = profile?.created_at
    ? formatDate(profile.created_at, {
        format: "long",
        locale: "es-CL",
        includeYear: false,
      })
    : "Recientemente";

  const handleAvatarUpload = async (avatarUrl: string) => {
    try {
      await updateProfile({ avatar_url: avatarUrl });
      await refetchProfile();
      toast.success("Foto de perfil actualizada exitosamente");
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast.error("Error al actualizar la foto de perfil");
      throw error;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">
            {variant === "admin" ? "Cargando perfil..." : "Loading profile..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg-primary)] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-premium-float" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-indigo-500/10 rounded-full blur-[120px] animate-premium-float"
          style={{ animationDelay: "-3s" }}
        />
        <div className="absolute top-[20%] right-[15%] w-[20%] h-[20%] bg-blue-500/5 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <ProfileHeaderCard
          adminData={adminData}
          memberSince={memberSince}
          profile={profile}
          showRoleBadge={showRoleBadge}
          subtitle={subtitle}
          title={title}
          user={user}
          onAvatarUpload={handleAvatarUpload}
        />

        <Tabs
          className="space-y-6 sm:space-y-8"
          value={activeTab}
          onValueChange={(tab) => {
            setActiveTab(tab);
            if (tab !== "personal") setIsEditingPersonal(false);
            if (tab !== "address") setIsEditingAddress(false);
          }}
        >
          <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
            <TabsList className="p-1.5 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-xl sm:rounded-2xl inline-flex flex-nowrap gap-1.5 sm:gap-2 shrink-0">
              {[
                { id: "overview", label: "Resumen", icon: User },
                { id: "personal", label: "Personal", icon: Edit3 },
                { id: "address", label: "Dirección", icon: MapPin },
                { id: "subscription", label: "Suscripción", icon: CreditCard },
                { id: "settings", label: "Ajustes", icon: Settings },
              ]
                .filter((tab) =>
                  tab.id === "subscription"
                    ? adminData?.adminCheck?.isOwner
                    : true,
                )
                .map((tab) => (
                  <TabsTrigger
                    className="rounded-lg sm:rounded-xl py-2.5 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-[var(--admin-bg-secondary)] data-[state=active]:shadow-lg data-[state=active]:text-[var(--admin-accent-secondary)] transition-all duration-300 min-h-[44px] sm:min-h-0 shrink-0 whitespace-nowrap"
                    key={tab.id}
                    value={tab.id}
                  >
                    <tab.icon
                      className={`h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0 ${variant === "admin" ? "text-[var(--admin-accent-secondary)]" : ""}`}
                    />
                    <span
                      className={`font-bold tracking-tight truncate ${variant === "admin" ? "text-[var(--admin-accent-secondary)]" : ""}`}
                    >
                      {tab.label}
                    </span>
                  </TabsTrigger>
                ))}
            </TabsList>
          </div>

          <TabsContent
            className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-top-2 duration-500"
            value="overview"
          >
            <OverviewTab
              adminData={adminData}
              dataLoading={dataLoading}
              hasOrganization={hasOrganization}
              needsOnboarding={needsOnboarding}
              profile={profile}
              subscriptionData={subscriptionData}
              user={user}
              variant={variant}
              onEditAddress={() => {
                setActiveTab("address");
                setIsEditingAddress(true);
              }}
              onEditPersonal={() => {
                setActiveTab("personal");
                setIsEditingPersonal(true);
              }}
              onNavigateToAdmin={() => router.push("/admin")}
              onNavigateToOnboarding={() => router.push("/onboarding/choice")}
              onNavigateToSettings={() => router.push("/admin/settings")}
              onNavigateToTab={setActiveTab}
            />
          </TabsContent>

          <TabsContent
            className="animate-in fade-in slide-in-from-top-2 duration-500"
            value="personal"
          >
            <PersonalInfoTab
              isEditing={isEditingPersonal}
              onEditingChange={setIsEditingPersonal}
            />
          </TabsContent>

          <TabsContent
            className="animate-in fade-in slide-in-from-top-2 duration-500"
            value="address"
          >
            <AddressTab
              isEditing={isEditingAddress}
              onEditingChange={setIsEditingAddress}
            />
          </TabsContent>

          <TabsContent
            className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-500"
            value="subscription"
          >
            <SubscriptionManagementSection />
          </TabsContent>

          <TabsContent
            className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-500"
            value="settings"
          >
            <PasswordTab />
            <PreferencesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

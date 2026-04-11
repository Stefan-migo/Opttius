"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Award,
  Bell,
  Building2,
  CreditCard,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MapPin,
  Save,
  Settings,
  Sparkles,
  User,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { SubscriptionManagementSection } from "@/components/admin/SubscriptionManagementSection";
import AvatarUpload from "@/components/ui/AvatarUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/contexts/AuthContext";
import { useBranch } from "@/hooks/useBranch";
import {
  type AddressForm,
  addressSchema,
  type PasswordChangeForm,
  passwordChangeSchema,
  type PersonalInfoForm,
  personalInfoSchema,
} from "@/lib/api/validation/profile-schemas";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [adminData, setAdminData] = useState<unknown>(null);
  const [subscriptionData, setSubscriptionData] = useState<unknown>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { branches } = useBranch();
  const [preferences, setPreferences] = useState({
    timezone: profile?.timezone || "America/Santiago",
    language: profile?.language || "es",
    newsletter_subscribed: profile?.newsletter_subscribed ?? false,
    preferred_branch_id: profile?.preferred_branch_id || "",
  });

  const personalForm = useForm<PersonalInfoForm>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: profile?.first_name || "",
      lastName: profile?.last_name || "",
      phone: profile?.phone || "",
      dateOfBirth: profile?.date_of_birth || "",
      bio: profile?.bio || "",
    },
  });

  const addressForm = useForm<AddressForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zod default() makes input country optional, output required
    resolver: zodResolver(addressSchema) as any,
    defaultValues: {
      addressLine1: profile?.address_line_1 || "",
      addressLine2: profile?.address_line_2 || "",
      city: profile?.city || "",
      state: profile?.state || "",
      postalCode: profile?.postal_code || "",
      country: profile?.country || "Chile",
    },
  });

  const passwordForm = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
  });

  useEffect(() => {
    if (profile) {
      personalForm.reset({
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        phone: profile.phone || "",
        dateOfBirth: profile.date_of_birth || "",
        bio: profile.bio || "",
      });
      addressForm.reset({
        addressLine1: profile.address_line_1 || "",
        addressLine2: profile.address_line_2 || "",
        city: profile.city || "",
        state: profile.state || "",
        postalCode: profile.postal_code || "",
        country: profile.country || "Chile",
      });
      setPreferences({
        timezone: profile.timezone || "America/Santiago",
        language: profile.language || "es",
        newsletter_subscribed: profile.newsletter_subscribed ?? false,
        preferred_branch_id: profile.preferred_branch_id || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (variant === "public" && !authLoading && !user) {
      router.push("/login");
    }
  }, [variant, authLoading, user, router]);

  useEffect(() => {
    const loadData = async () => {
      if (!user && variant === "admin") return;
      if (!user && variant === "public") return;

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
  }, [user, variant]);

  const needsOnboarding =
    variant === "public" &&
    adminData?.adminCheck?.isAdmin &&
    !adminData?.organization?.hasOrganization;
  const hasOrganization =
    variant === "public" && adminData?.organization?.hasOrganization;
  const showRoleBadge = variant === "admin";

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

  const handlePersonalInfoSubmit = async (data: PersonalInfoForm) => {
    try {
      setIsLoading(true);
      await updateProfile({
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone || null,
        date_of_birth: data.dateOfBirth || null,
        bio: data.bio || null,
      });
      await refetchProfile();
      setIsEditingPersonal(false);
      toast.success("Información personal actualizada exitosamente");
    } catch (error) {
      console.error("Error updating personal info:", error);
      toast.error("Error al actualizar la información personal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSubmit = async (data: AddressForm) => {
    try {
      setIsLoading(true);
      await updateProfile({
        address_line_1: data.addressLine1 || null,
        address_line_2: data.addressLine2 || null,
        city: data.city || null,
        state: data.state || null,
        postal_code: data.postalCode || null,
        country: data.country || null,
      });
      await refetchProfile();
      setIsEditingAddress(false);
      toast.success("Dirección actualizada exitosamente");
    } catch (error) {
      console.error("Error updating address:", error);
      toast.error("Error al actualizar la dirección");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (data: PasswordChangeForm) => {
    try {
      setIsLoading(true);
      const supabase = createClient();

      // Re-authenticate: verify current password before allowing change
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: data.currentPassword,
      });

      if (reauthError) {
        toast.error(
          "Contraseña actual incorrecta. Verifica e intenta de nuevo.",
        );
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;

      passwordForm.reset();
      setIsChangingPassword(false);
      toast.success("Contraseña cambiada exitosamente");
    } catch (error: unknown) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Error al cambiar la contraseña");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    try {
      setIsLoading(true);
      await updateProfile({
        timezone: preferences.timezone,
        language: preferences.language,
        newsletter_subscribed: preferences.newsletter_subscribed,
        preferred_branch_id: preferences.preferred_branch_id || null,
      });
      await refetchProfile();
      toast.success("Preferencias actualizadas exitosamente");
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Error al actualizar las preferencias");
    } finally {
      setIsLoading(false);
    }
  };

  const memberSince = profile?.created_at
    ? formatDate(profile.created_at, {
        format: "long",
        locale: "es-CL",
        includeYear: false,
      })
    : "Recientemente";

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
        <div className="mb-6 sm:mb-8 md:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-slate-900 dark:text-white mb-1 sm:mb-2 tracking-tight">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium font-body">
            {subtitle}
          </p>
        </div>

        <Card
          className="mb-6 sm:mb-8 md:mb-10 overflow-hidden border-white/20 dark:border-slate-800/50 shadow-2xl animate-in zoom-in-95 duration-500 bg-[var(--admin-bg-tertiary)] backdrop-blur-xl"
          rounded="lg"
          variant="glass"
        >
          <CardContent className="p-4 sm:p-6 md:p-8 lg:p-10">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 md:gap-10">
              <div className="relative group shrink-0 flex flex-col items-center">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-500 scale-75 pointer-events-none" />
                <div className="relative z-10">
                  <AvatarUpload
                    currentAvatarUrl={profile?.avatar_url || undefined}
                    isEditing={true}
                    size="lg"
                    onUploadSuccess={handleAvatarUpload}
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0 text-center md:text-left space-y-3 sm:space-y-4">
                <div>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-center md:justify-start gap-2 sm:gap-3 mb-1">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight break-words">
                      {profile?.first_name && profile?.last_name
                        ? `${profile.first_name} ${profile.last_name}`
                        : user.email?.split("@")[0]}
                    </h2>
                    {showRoleBadge && (
                      <Badge
                        className="w-fit mx-auto md:mx-0 bg-green-500/10 text-green-600 border-none px-2 sm:px-3 py-1 font-bold text-[9px] sm:text-[10px] uppercase"
                        variant="healty"
                      >
                        {adminData?.adminCheck?.role || "ADMINISTRADOR"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm sm:text-base md:text-lg text-slate-500 dark:text-slate-400 font-medium truncate max-w-full">
                    {user.email}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center md:justify-start">
                  {profile?.is_member && (
                    <Badge className="gap-1.5 sm:gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-3 sm:px-4 py-1.5 rounded-full transition-all">
                      <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      <span className="font-bold tracking-wide text-[9px] sm:text-[10px] uppercase">
                        MIEMBRO GOLD
                      </span>
                    </Badge>
                  )}
                  <Badge
                    className="gap-1.5 sm:gap-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 px-3 sm:px-4 py-1.5 rounded-full transition-all"
                    variant="outline"
                  >
                    <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-amber-500" />
                    <span className="text-slate-600 dark:text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase">
                      Desde {memberSince}
                    </span>
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs
          className="space-y-6 sm:space-y-8"
          value={activeTab}
          onValueChange={setActiveTab}
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
                .filter((tab) => {
                  if (tab.id === "subscription") {
                    return adminData?.adminCheck?.isOwner;
                  }
                  return true;
                })
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
                        Desbloquea todas las herramientas especializadas
                        configurando tu organización real. Toma menos de 2
                        minutos.
                      </p>
                    </div>
                    <Button
                      shimmer
                      className="w-full md:w-auto min-h-[44px] shadow-xl shadow-primary/20 font-bold"
                      size="lg"
                      onClick={() => router.push("/onboarding/choice")}
                    >
                      Comenzar Ahora
                      <ArrowRight className="ml-2 h-5 w-5 shrink-0" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {variant === "public" && !dataLoading && hasOrganization && (
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
                        onClick={() => router.push("/admin/settings")}
                      >
                        <Settings className="h-5 w-5 mr-2 shrink-0" />
                        Ajustes
                      </Button>
                      <Button
                        shimmer
                        className="flex-1 md:flex-none h-12 min-h-[44px] shadow-xl shadow-primary/10"
                        onClick={() => router.push("/admin")}
                      >
                        Panel Administrativo
                        <ArrowRight className="ml-2 h-5 w-5 shrink-0" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                    onClick={() => {
                      setActiveTab("personal");
                      setIsEditingPersonal(true);
                    }}
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
                    onClick={() => {
                      setActiveTab("address");
                      setIsEditingAddress(true);
                    }}
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
                        onClick={() => setActiveTab("subscription")}
                      >
                        Gestionar Suscripción
                        <ArrowRight className="h-5 w-5 ml-2 shrink-0" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent
            className="animate-in fade-in slide-in-from-top-2 duration-500"
            value="personal"
          >
            <Card className="border-0 shadow-2xl" variant="elevated">
              <CardHeader
                className="border-b border-slate-100 dark:border-slate-800 p-4 sm:p-6"
                padding="lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle
                    className="font-cormorant text-lg sm:text-xl"
                    size="lg"
                    theme="modern"
                  >
                    Datos Personales
                  </CardTitle>
                  {!isEditingPersonal && (
                    <Button
                      className="border-2 font-bold px-4 sm:px-6 text-[var(--accent-foreground)] bg-[var(--admin-border-primary)] border-[var(--admin-border-secondary)] min-h-[44px] w-full sm:w-auto"
                      variant="outline"
                      onClick={() => setIsEditingPersonal(true)}
                    >
                      <Edit3 className="h-4 w-4 mr-2 shrink-0" />
                      Editar Información
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6" padding="lg">
                <form
                  className="space-y-6 sm:space-y-8"
                  onSubmit={personalForm.handleSubmit(handlePersonalInfoSubmit)}
                >
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label
                        className="text-sm font-bold text-slate-700 dark:text-slate-300"
                        htmlFor="firstName"
                      >
                        Nombre <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        {...personalForm.register("firstName")}
                        className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                        disabled={!isEditingPersonal || isLoading}
                      />
                      {personalForm.formState.errors.firstName && (
                        <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />{" "}
                          {personalForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label
                        className="text-sm font-bold text-slate-700 dark:text-slate-300"
                        htmlFor="lastName"
                      >
                        Apellido <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        {...personalForm.register("lastName")}
                        className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                        disabled={!isEditingPersonal || isLoading}
                      />
                      {personalForm.formState.errors.lastName && (
                        <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />{" "}
                          {personalForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label
                        className="text-sm font-bold text-slate-700 dark:text-slate-300"
                        htmlFor="phone"
                      >
                        Teléfono
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        {...personalForm.register("phone")}
                        className="h-12 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                        disabled={!isEditingPersonal || isLoading}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label
                        className="text-sm font-bold text-slate-700 dark:text-slate-300"
                        htmlFor="dateOfBirth"
                      >
                        Fecha de Nacimiento
                      </Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        {...personalForm.register("dateOfBirth")}
                        className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                        disabled={!isEditingPersonal || isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                      htmlFor="bio"
                    >
                      Biografía
                    </Label>
                    <Textarea
                      id="bio"
                      {...personalForm.register("bio")}
                      className="bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10 rounded-2xl p-4 disabled:opacity-100"
                      disabled={!isEditingPersonal || isLoading}
                      placeholder="Cuéntanos un poco sobre ti, tu rol en la óptica, etc."
                      rows={5}
                    />
                    {personalForm.formState.errors.bio && (
                      <p className="text-xs font-medium text-red-500">
                        {personalForm.formState.errors.bio.message}
                      </p>
                    )}
                  </div>
                  {isEditingPersonal && (
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                      <Button
                        shimmer
                        className="flex-1 h-12 min-h-[44px] shadow-xl shadow-primary/20"
                        disabled={isLoading}
                        type="submit"
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin shrink-0" />
                        ) : (
                          <Save className="h-5 w-5 mr-2 shrink-0" />
                        )}
                        Guardar Cambios
                      </Button>
                      <Button
                        className="flex-1 h-12 min-h-[44px] border-2"
                        disabled={isLoading}
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditingPersonal(false);
                          personalForm.reset({
                            firstName: profile?.first_name || "",
                            lastName: profile?.last_name || "",
                            phone: profile?.phone || "",
                            dateOfBirth: profile?.date_of_birth || "",
                            bio: profile?.bio || "",
                          });
                        }}
                      >
                        <X className="h-5 w-5 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent
            className="animate-in fade-in slide-in-from-top-2 duration-500"
            value="address"
          >
            <Card className="border-0 shadow-2xl" variant="elevated">
              <CardHeader
                className="border-b border-slate-100 dark:border-slate-800 p-4 sm:p-6"
                padding="lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle
                    className="font-cormorant text-lg sm:text-xl"
                    size="lg"
                    theme="modern"
                  >
                    Dirección de Envío / Oficina
                  </CardTitle>
                  {!isEditingAddress && (
                    <Button
                      className="border-2 font-bold px-4 sm:px-6 min-h-[44px] w-full sm:w-auto"
                      variant="outline"
                      onClick={() => setIsEditingAddress(true)}
                    >
                      <Edit3 className="h-4 w-4 mr-2 shrink-0" />
                      Editar Dirección
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6" padding="lg">
                <form
                  className="space-y-6 sm:space-y-8"
                  onSubmit={addressForm.handleSubmit(handleAddressSubmit)}
                >
                  <div className="grid gap-6 sm:gap-8">
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label
                          className="text-sm font-bold text-slate-700 dark:text-slate-300"
                          htmlFor="addressLine1"
                        >
                          Dirección Línea 1
                        </Label>
                        <Input
                          id="addressLine1"
                          {...addressForm.register("addressLine1")}
                          className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                          disabled={!isEditingAddress || isLoading}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label
                          className="text-sm font-bold text-slate-700 dark:text-slate-300"
                          htmlFor="addressLine2"
                        >
                          Dirección Línea 2
                        </Label>
                        <Input
                          id="addressLine2"
                          {...addressForm.register("addressLine2")}
                          className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                          disabled={!isEditingAddress || isLoading}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label
                          className="text-sm font-bold text-slate-700 dark:text-slate-300"
                          htmlFor="city"
                        >
                          Ciudad
                        </Label>
                        <Input
                          id="city"
                          {...addressForm.register("city")}
                          className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                          disabled={!isEditingAddress || isLoading}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label
                          className="text-sm font-bold text-slate-700 dark:text-slate-300"
                          htmlFor="state"
                        >
                          Región / Provincia
                        </Label>
                        <Input
                          id="state"
                          {...addressForm.register("state")}
                          className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                          disabled={!isEditingAddress || isLoading}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label
                          className="text-sm font-bold text-slate-700 dark:text-slate-300"
                          htmlFor="postalCode"
                        >
                          Código Postal
                        </Label>
                        <Input
                          id="postalCode"
                          {...addressForm.register("postalCode")}
                          className="h-12 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                          disabled={!isEditingAddress || isLoading}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label
                          className="text-sm font-bold text-slate-700 dark:text-slate-300"
                          htmlFor="country"
                        >
                          País
                        </Label>
                        <Input
                          id="country"
                          {...addressForm.register("country")}
                          className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                          disabled={!isEditingAddress || isLoading}
                        />
                      </div>
                    </div>
                  </div>
                  {isEditingAddress && (
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                      <Button
                        shimmer
                        className="flex-1 h-12 min-h-[44px] shadow-xl shadow-primary/20"
                        disabled={isLoading}
                        type="submit"
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin shrink-0" />
                        ) : (
                          <Save className="h-5 w-5 mr-2 shrink-0" />
                        )}
                        Guardar Dirección
                      </Button>
                      <Button
                        className="flex-1 h-12 min-h-[44px] border-2"
                        disabled={isLoading}
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditingAddress(false);
                          addressForm.reset({
                            addressLine1: profile?.address_line_1 || "",
                            addressLine2: profile?.address_line_2 || "",
                            city: profile?.city || "",
                            state: profile?.state || "",
                            postalCode: profile?.postal_code || "",
                            country: profile?.country || "Chile",
                          });
                        }}
                      >
                        <X className="h-5 w-5 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
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
            <Card
              className="border-0 shadow-2xl overflow-hidden"
              variant="elevated"
            >
              <CardHeader
                className="bg-[var(--admin-bg-tertiary)] p-4 sm:p-6"
                padding="lg"
              >
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-bold font-cormorant tracking-tight">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg sm:rounded-xl">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  Seguridad de la Cuenta
                </CardTitle>
                <CardDescription className="text-[var(--accent-foreground)] text-sm">
                  Administra tu contraseña y métodos de acceso. Se requiere tu
                  contraseña actual para realizar el cambio.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6" padding="lg">
                {!isChangingPassword ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 bg-[var(--admin-bg-primary)] rounded-xl sm:rounded-2xl border border-dashed border-[var(--admin-border-secondary)]">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">
                        Contraseña
                      </h4>
                      <p className="text-sm text-slate-500 tracking-widest mt-1">
                        ••••••••••••••••
                      </p>
                    </div>
                    <Button
                      className="border-2 font-bold min-h-[44px] w-full sm:w-auto"
                      variant="outline"
                      onClick={() => setIsChangingPassword(true)}
                    >
                      Cambiar Contraseña
                    </Button>
                  </div>
                ) : (
                  <form
                    className="space-y-6 max-w-xl"
                    onSubmit={passwordForm.handleSubmit(handlePasswordChange)}
                  >
                    <div className="space-y-3">
                      <Label
                        className="text-sm font-bold"
                        htmlFor="currentPassword"
                      >
                        Contraseña Actual
                      </Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          {...passwordForm.register("currentPassword")}
                          className="h-12 pr-12 rounded-2xl border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                          disabled={isLoading}
                        />
                        <Button
                          className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                          size="icon"
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4 text-slate-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-slate-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label
                          className="text-sm font-bold"
                          htmlFor="newPassword"
                        >
                          Nueva Contraseña
                        </Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            {...passwordForm.register("newPassword")}
                            className="h-12 pr-12 rounded-2xl border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                            disabled={isLoading}
                          />
                          <Button
                            className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                            size="icon"
                            type="button"
                            variant="ghost"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4 text-slate-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-slate-400" />
                            )}
                          </Button>
                        </div>
                        {passwordForm.formState.errors.newPassword && (
                          <p className="text-xs font-medium text-red-500">
                            {passwordForm.formState.errors.newPassword.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Label
                          className="text-sm font-bold"
                          htmlFor="confirmPassword"
                        >
                          Confirmar Nueva
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            {...passwordForm.register("confirmPassword")}
                            className="h-12 pr-12 rounded-2xl border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                            disabled={isLoading}
                          />
                          <Button
                            className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                            size="icon"
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-slate-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-slate-400" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                      <Button
                        shimmer
                        className="flex-1 h-12 min-h-[44px] shadow-xl shadow-primary/20"
                        disabled={isLoading}
                        type="submit"
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                        ) : (
                          <Save className="h-5 w-5 mr-2 shrink-0" />
                        )}
                        Actualizar Ahora
                      </Button>
                      <Button
                        className="flex-1 h-12 min-h-[44px] border-2"
                        disabled={isLoading}
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsChangingPassword(false);
                          passwordForm.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card
              className="border-0 shadow-2xl overflow-hidden"
              variant="elevated"
            >
              <CardHeader
                className="bg-[var(--admin-bg-tertiary)] p-4 sm:p-6"
                padding="lg"
              >
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-bold font-cormorant tracking-tight">
                  <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg sm:rounded-xl">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                  </div>
                  Personalización
                </CardTitle>
                <CardDescription className="text-sm">
                  Ajusta el sistema a tus necesidades regionales.
                </CardDescription>
              </CardHeader>
              <CardContent
                className="p-4 sm:p-6"
                padding="lg"
                spacing="relaxed"
              >
                <div className="space-y-4 sm:space-y-6 max-w-md">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold" htmlFor="timezone">
                      Zona Horaria Regional
                    </Label>
                    <Select
                      value={preferences.timezone}
                      onValueChange={(value) =>
                        setPreferences((prev) => ({ ...prev, timezone: value }))
                      }
                    >
                      <SelectTrigger
                        className="h-12 rounded-2xl border-slate-200 dark:border-slate-800"
                        id="timezone"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800">
                        <SelectItem value="America/Santiago">
                          Santiago, Chile (GMT-3)
                        </SelectItem>
                        <SelectItem value="America/Argentina/Buenos_Aires">
                          Buenos Aires, Argentina (GMT-3)
                        </SelectItem>
                        <SelectItem value="America/Lima">
                          Lima, Perú (GMT-5)
                        </SelectItem>
                        <SelectItem value="America/Bogota">
                          Bogotá, Colombia (GMT-5)
                        </SelectItem>
                        <SelectItem value="America/Mexico_City">
                          CDMX, México (GMT-6)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold" htmlFor="language">
                      Idioma
                    </Label>
                    <Select
                      value={preferences.language}
                      onValueChange={(value) =>
                        setPreferences((prev) => ({ ...prev, language: value }))
                      }
                    >
                      <SelectTrigger
                        className="h-12 rounded-2xl border-slate-200 dark:border-slate-800"
                        id="language"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800">
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {branches.length > 1 && (
                    <div className="space-y-3">
                      <Label
                        className="text-sm font-bold"
                        htmlFor="preferred_branch"
                      >
                        Sucursal Preferida
                      </Label>
                      <Select
                        value={preferences.preferred_branch_id || "none"}
                        onValueChange={(value) =>
                          setPreferences((prev) => ({
                            ...prev,
                            preferred_branch_id: value === "none" ? "" : value,
                          }))
                        }
                      >
                        <SelectTrigger
                          className="h-12 rounded-2xl border-slate-200 dark:border-slate-800"
                          id="preferred_branch"
                        >
                          <SelectValue placeholder="Sin preferencia" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800">
                          <SelectItem value="none">Sin preferencia</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} ({branch.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold" htmlFor="newsletter">
                        Recibir novedades y ofertas por email
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Suscripción a newsletter
                      </p>
                    </div>
                    <Switch
                      checked={preferences.newsletter_subscribed}
                      id="newsletter"
                      onCheckedChange={(checked) =>
                        setPreferences((prev) => ({
                          ...prev,
                          newsletter_subscribed: checked,
                        }))
                      }
                    />
                  </div>

                  <Button
                    shimmer
                    className="w-full h-12 min-h-[44px] shadow-xl shadow-amber-500/20"
                    onClick={handlePreferencesUpdate}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Save className="h-5 w-5 mr-2" />
                    )}
                    Guardar Preferencias
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

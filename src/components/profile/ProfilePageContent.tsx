"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthContext } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AvatarUpload from "@/components/ui/AvatarUpload";
import {
  User,
  MapPin,
  Edit3,
  Save,
  X,
  Lock,
  Eye,
  EyeOff,
  Bell,
  Award,
  Loader2,
  Sparkles,
  Settings,
  CreditCard,
  ArrowRight,
  Zap,
  Building2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { SubscriptionManagementSection } from "@/components/admin/SubscriptionManagementSection";
import {
  personalInfoSchema,
  addressSchema,
  passwordChangeSchema,
  type PersonalInfoForm,
  type AddressForm,
  type PasswordChangeForm,
} from "@/lib/api/validation/profile-schemas";
import { useBranch } from "@/hooks/useBranch";
import { Switch } from "@/components/ui/switch";

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
  } = useAuthContext();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "overview",
  );
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [adminData, setAdminData] = useState<any>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
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
    } catch (error: any) {
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
    <div className="min-h-screen bg-[var(--admin-bg-primary)] px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-premium-float" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-indigo-500/10 rounded-full blur-[120px] animate-premium-float"
          style={{ animationDelay: "-3s" }}
        />
        <div className="absolute top-[20%] right-[15%] w-[20%] h-[20%] bg-blue-500/5 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-bold font-display text-slate-900 dark:text-white mb-2 tracking-tight">
            {title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium font-body">
            {subtitle}
          </p>
        </div>

        <Card
          variant="glass"
          rounded="lg"
          className="mb-10 overflow-hidden border-white/20 dark:border-slate-800/50 shadow-2xl animate-in zoom-in-95 duration-500 bg-[var(--admin-bg-tertiary)] backdrop-blur-xl"
        >
          <CardContent className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-500 scale-75" />
                <div className="relative z-10 rounded-full shadow-xl overflow-hidden">
                  <AvatarUpload
                    currentAvatarUrl={profile?.avatar_url || undefined}
                    onUploadSuccess={handleAvatarUpload}
                    isEditing={true}
                    size="lg"
                  />
                </div>
              </div>

              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <div className="flex flex-col md:flex-row md:items-center gap-3 mb-1">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {profile?.first_name && profile?.last_name
                        ? `${profile.first_name} ${profile.last_name}`
                        : user.email?.split("@")[0]}
                    </h2>
                    {showRoleBadge && (
                      <Badge
                        variant="healty"
                        className="w-fit mx-auto md:mx-0 bg-green-500/10 text-green-600 border-none px-3 py-1 font-bold text-[10px] uppercase"
                      >
                        {adminData?.adminCheck?.role || "ADMINISTRADOR"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
                    {user.email}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  {profile?.is_member && (
                    <Badge className="gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-4 py-1.5 rounded-full transition-all">
                      <Sparkles className="h-4 w-4" />
                      <span className="font-bold tracking-wide text-[10px] uppercase">
                        MIEMBRO GOLD
                      </span>
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="gap-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 px-4 py-1.5 rounded-full transition-all"
                  >
                    <Award className="h-4 w-4 text-amber-500" />
                    <span className="text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase">
                      Desde {memberSince}
                    </span>
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-8"
        >
          <TabsList className="p-1.5 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl grid w-full grid-cols-2 md:grid-cols-5 gap-2">
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
                  key={tab.id}
                  value={tab.id}
                  className="rounded-xl py-3 data-[state=active]:bg-[var(--admin-bg-secondary)] data-[state=active]:shadow-lg data-[state=active]:text-[var(--admin-accent-secondary)] transition-all duration-300"
                >
                  <tab.icon
                    className={`h-4 w-4 mr-2 ${variant === "admin" ? "text-[var(--admin-accent-secondary)]" : ""}`}
                  />
                  <span
                    className={`font-bold tracking-tight ${variant === "admin" ? "text-[var(--admin-accent-secondary)]" : ""}`}
                  >
                    {tab.label}
                  </span>
                </TabsTrigger>
              ))}
          </TabsList>

          <TabsContent
            value="overview"
            className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-500"
          >
            {variant === "public" && !dataLoading && needsOnboarding && (
              <Card
                variant="glass"
                className="border-primary/20 bg-primary/5 shadow-xl shadow-primary/5 overflow-hidden"
              >
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-shrink-0 relative">
                      <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse rounded-full" />
                      <div className="relative z-10 w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl">
                        <Building2 className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                        Configura tu Óptica Profesional
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-0 font-medium font-body leading-relaxed">
                        Desbloquea todas las herramientas especializadas
                        configurando tu organización real. Toma menos de 2
                        minutos.
                      </p>
                    </div>
                    <Button
                      onClick={() => router.push("/onboarding/choice")}
                      size="lg"
                      shimmer
                      className="whitespace-nowrap shadow-xl shadow-primary/20 font-bold"
                    >
                      Comenzar Ahora
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {variant === "public" && !dataLoading && hasOrganization && (
              <Card
                variant="elevated"
                className="overflow-hidden border-2 border-primary/5 shadow-2xl shadow-primary/5"
              >
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold font-cormorant tracking-tight">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    Mi Organización
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex gap-10">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Estado Cuenta
                        </p>
                        <Badge
                          variant="healty"
                          className="px-4 py-1 text-[10px] font-bold"
                        >
                          ACTIVA
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Plan Actual
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white uppercase">
                          {subscriptionData?.currentTier || "Basic"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                      <Button
                        variant="outline"
                        onClick={() => router.push("/admin/settings")}
                        className="flex-1 md:flex-none border-2 h-12"
                      >
                        <Settings className="h-5 w-5 mr-2" />
                        Ajustes
                      </Button>
                      <Button
                        onClick={() => router.push("/admin")}
                        className="flex-1 md:flex-none h-12 shadow-xl shadow-primary/10"
                        shimmer
                      >
                        Panel Administrativo
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-8 md:grid-cols-2">
              <Card variant="interactive" className="group">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold font-cormorant tracking-tight text-slate-800 dark:text-white group-hover:text-primary transition-colors">
                    <div className="p-2 bg-[var(--admin-bg-tertiary)] rounded-xl group-hover:bg-primary/10 transition-colors">
                      <User className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-primary" />
                    </div>
                    Información Base
                  </CardTitle>
                </CardHeader>
                <CardContent spacing="relaxed" className="p-6 pt-0">
                  <div className="space-y-4">
                    <div className="bg-slate-100/50 dark:bg-slate-900/50 p-5 rounded-3xl border border-[var(--admin-border-secondary)] group-hover:border-primary/30 transition-all">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Nombre Completo
                      </Label>
                      <p className="text-base font-bold mt-1 text-slate-800 dark:text-slate-100">
                        {profile?.first_name && profile?.last_name
                          ? `${profile.first_name} ${profile.last_name}`
                          : "Pendiente de completar"}
                      </p>
                    </div>
                    <div className="bg-slate-100/50 dark:bg-slate-900/50 p-5 rounded-3xl border border-[var(--admin-border-secondary)] group-hover:border-primary/30 transition-all">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Canal de Acceso
                      </Label>
                      <p className="text-base font-bold mt-1 text-slate-800 dark:text-slate-100">
                        {user.email}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-100/50 dark:bg-slate-900/50 p-5 rounded-3xl border border-[var(--admin-border-secondary)] group-hover:border-primary/30 transition-all">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Teléfono
                        </Label>
                        <p className="text-sm font-bold mt-1 text-slate-800 dark:text-slate-100">
                          {profile?.phone || "Sin registro"}
                        </p>
                      </div>
                      <div className="bg-[var(--admin-bg-tertiary)] p-5 rounded-3xl border border-[var(--admin-border-secondary)] group-hover:border-primary/30 transition-all">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Cumpleaños
                        </Label>
                        <p className="text-sm font-bold mt-1 text-slate-800 dark:text-slate-100">
                          {profile?.date_of_birth
                            ? formatDate(profile.date_of_birth)
                            : "Sin registro"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-6 border-2 border-[var(--accent-foreground)] text-[var(--accent-foreground)] rounded-2xl font-bold h-12 hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
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

              <Card variant="interactive" className="group">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold font-cormorant tracking-tight text-[var(--accent-foreground)] transition-colors">
                    <div className="p-2 bg-[var(--admin-bg-tertiary)] rounded-xl transition-colors">
                      <MapPin className="h-5 w-5 text-[var(--accent-foreground)]" />
                    </div>
                    Ubicación Principal
                  </CardTitle>
                </CardHeader>
                <CardContent spacing="relaxed" className="p-6 pt-0">
                  <div className="space-y-4">
                    <div className="bg-[var(--admin-bg-tertiary)] p-5 rounded-3xl border border-[var(--admin-border-secondary)] group-hover:border-primary/30 transition-all min-h-[84px]">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Dirección Lineal
                      </Label>
                      <div className="mt-1">
                        <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                          {profile?.address_line_1 || "Pendiente de completar"}
                        </p>
                        {profile?.address_line_2 && (
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {profile.address_line_2}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[var(--admin-bg-tertiary)] p-5 rounded-3xl border border-[var(--admin-border-secondary)] group-hover:border-primary/30 transition-all">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Ciudad
                        </Label>
                        <p className="text-sm font-bold mt-1 text-slate-800 dark:text-slate-100">
                          {profile?.city || "—"}
                        </p>
                      </div>
                      <div className="bg-[var(--admin-bg-tertiary)] p-5 rounded-3xl border border-[var(--admin-border-secondary)] group-hover:border-primary/30 transition-all">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          País
                        </Label>
                        <p className="text-sm font-bold mt-1 text-slate-800 dark:text-slate-100">
                          {profile?.country || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-6 bg-[var(--accent-foreground)] border-2 border-[var(--admin-border-secondary)] text-[var(--admin-bg-primary)] rounded-2xl font-bold h-12 hover:bg-[var(--accent-foreground)] hover:text-white hover:border-[var(--accent-foreground)] transition-all duration-300"
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

              <Card variant="interactive" className="group md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold font-cormorant tracking-tight text-slate-800 dark:text-white group-hover:text-primary transition-colors">
                    <div className="p-2 bg-[var(--admin-bg-tertiary)] rounded-xl group-hover:bg-primary/10 transition-colors">
                      <CreditCard className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-primary" />
                    </div>
                    Estado de Suscripción
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="bg-primary/5 dark:bg-primary/10 rounded-[2rem] p-8 border border-[var(--admin-border-secondary)] flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30">
                        <Zap className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-1">
                          Tu Nivel Actual
                        </p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                          Plan {subscriptionData?.currentTier || "Básico"}
                        </h3>
                      </div>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                      <Button
                        size="lg"
                        className="flex-1 md:flex-none h-14 rounded-2xl font-bold px-8 shadow-xl shadow-primary/20"
                        onClick={() => setActiveTab("subscription")}
                        disabled={!adminData?.adminCheck?.isOwner}
                        shimmer
                      >
                        Gestionar Suscripción
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent
            value="personal"
            className="animate-in fade-in slide-in-from-top-2 duration-500"
          >
            <Card variant="elevated" className="border-0 shadow-2xl">
              <CardHeader
                padding="lg"
                className="border-b border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <CardTitle
                    size="lg"
                    theme="modern"
                    className="font-cormorant"
                  >
                    Datos Personales
                  </CardTitle>
                  {!isEditingPersonal && (
                    <Button
                      onClick={() => setIsEditingPersonal(true)}
                      variant="outline"
                      className="border-2 font-bold px-6 text-[var(--accent-foreground)] bg-[var(--admin-border-primary)] border-[var(--admin-border-secondary)]"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Editar Información
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent padding="lg">
                <form
                  onSubmit={personalForm.handleSubmit(handlePersonalInfoSubmit)}
                  className="space-y-8"
                >
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label
                        htmlFor="firstName"
                        className="text-sm font-bold text-slate-700 dark:text-slate-300"
                      >
                        Nombre <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        {...personalForm.register("firstName")}
                        disabled={!isEditingPersonal || isLoading}
                        className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
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
                        htmlFor="lastName"
                        className="text-sm font-bold text-slate-700 dark:text-slate-300"
                      >
                        Apellido <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        {...personalForm.register("lastName")}
                        disabled={!isEditingPersonal || isLoading}
                        className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                      />
                      {personalForm.formState.errors.lastName && (
                        <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />{" "}
                          {personalForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label
                        htmlFor="phone"
                        className="text-sm font-bold text-slate-700 dark:text-slate-300"
                      >
                        Teléfono
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        {...personalForm.register("phone")}
                        disabled={!isEditingPersonal || isLoading}
                        className="h-12 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label
                        htmlFor="dateOfBirth"
                        className="text-sm font-bold text-slate-700 dark:text-slate-300"
                      >
                        Fecha de Nacimiento
                      </Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        {...personalForm.register("dateOfBirth")}
                        disabled={!isEditingPersonal || isLoading}
                        className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label
                      htmlFor="bio"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Biografía
                    </Label>
                    <Textarea
                      id="bio"
                      {...personalForm.register("bio")}
                      disabled={!isEditingPersonal || isLoading}
                      rows={5}
                      placeholder="Cuéntanos un poco sobre ti, tu rol en la óptica, etc."
                      className="bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10 rounded-2xl p-4 disabled:opacity-100"
                    />
                    {personalForm.formState.errors.bio && (
                      <p className="text-xs font-medium text-red-500">
                        {personalForm.formState.errors.bio.message}
                      </p>
                    )}
                  </div>
                  {isEditingPersonal && (
                    <div className="flex gap-4 pt-4">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 h-12 shadow-xl shadow-primary/20"
                        shimmer
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-5 w-5 mr-2" />
                        )}
                        Guardar Cambios
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-12 border-2"
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
                        disabled={isLoading}
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
            value="address"
            className="animate-in fade-in slide-in-from-top-2 duration-500"
          >
            <Card variant="elevated" className="border-0 shadow-2xl">
              <CardHeader
                padding="lg"
                className="border-b border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <CardTitle
                    size="lg"
                    theme="modern"
                    className="font-cormorant"
                  >
                    Dirección de Envío / Oficina
                  </CardTitle>
                  {!isEditingAddress && (
                    <Button
                      onClick={() => setIsEditingAddress(true)}
                      variant="outline"
                      className="border-2 font-bold px-6"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Editar Dirección
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent padding="lg">
                <form
                  onSubmit={addressForm.handleSubmit(handleAddressSubmit)}
                  className="space-y-8"
                >
                  <div className="grid gap-8">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label
                          htmlFor="addressLine1"
                          className="text-sm font-bold text-slate-700 dark:text-slate-300"
                        >
                          Dirección Línea 1
                        </Label>
                        <Input
                          id="addressLine1"
                          {...addressForm.register("addressLine1")}
                          disabled={!isEditingAddress || isLoading}
                          className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label
                          htmlFor="addressLine2"
                          className="text-sm font-bold text-slate-700 dark:text-slate-300"
                        >
                          Dirección Línea 2
                        </Label>
                        <Input
                          id="addressLine2"
                          {...addressForm.register("addressLine2")}
                          disabled={!isEditingAddress || isLoading}
                          className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label
                          htmlFor="city"
                          className="text-sm font-bold text-slate-700 dark:text-slate-300"
                        >
                          Ciudad
                        </Label>
                        <Input
                          id="city"
                          {...addressForm.register("city")}
                          disabled={!isEditingAddress || isLoading}
                          className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label
                          htmlFor="state"
                          className="text-sm font-bold text-slate-700 dark:text-slate-300"
                        >
                          Región / Provincia
                        </Label>
                        <Input
                          id="state"
                          {...addressForm.register("state")}
                          disabled={!isEditingAddress || isLoading}
                          className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label
                          htmlFor="postalCode"
                          className="text-sm font-bold text-slate-700 dark:text-slate-300"
                        >
                          Código Postal
                        </Label>
                        <Input
                          id="postalCode"
                          {...addressForm.register("postalCode")}
                          disabled={!isEditingAddress || isLoading}
                          className="h-12 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label
                          htmlFor="country"
                          className="text-sm font-bold text-slate-700 dark:text-slate-300"
                        >
                          País
                        </Label>
                        <Input
                          id="country"
                          {...addressForm.register("country")}
                          disabled={!isEditingAddress || isLoading}
                          className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                    </div>
                  </div>
                  {isEditingAddress && (
                    <div className="flex gap-4 pt-4">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 h-12 shadow-xl shadow-primary/20"
                        shimmer
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-5 w-5 mr-2" />
                        )}
                        Guardar Dirección
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-12 border-2"
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
                        disabled={isLoading}
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
            value="subscription"
            className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-500"
          >
            <SubscriptionManagementSection />
          </TabsContent>

          <TabsContent
            value="settings"
            className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-500"
          >
            <Card
              variant="elevated"
              className="border-0 shadow-2xl overflow-hidden"
            >
              <CardHeader
                padding="lg"
                className="bg-[var(--admin-bg-tertiary)]"
              >
                <CardTitle className="flex items-center gap-3 text-xl font-bold font-cormorant tracking-tight">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  Seguridad de la Cuenta
                </CardTitle>
                <CardDescription className="text-[var(--accent-foreground)]">
                  Administra tu contraseña y métodos de acceso. Se requiere tu
                  contraseña actual para realizar el cambio.
                </CardDescription>
              </CardHeader>
              <CardContent padding="lg">
                {!isChangingPassword ? (
                  <div className="flex items-center justify-between p-6 bg-[var(--admin-bg-primary)] rounded-2xl border border-dashed border-[var(--admin-border-secondary)]">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">
                        Contraseña
                      </h4>
                      <p className="text-sm text-slate-500 tracking-widest mt-1">
                        ••••••••••••••••
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setIsChangingPassword(true)}
                      className="border-2 font-bold"
                    >
                      Cambiar Contraseña
                    </Button>
                  </div>
                ) : (
                  <form
                    onSubmit={passwordForm.handleSubmit(handlePasswordChange)}
                    className="space-y-6 max-w-xl"
                  >
                    <div className="space-y-3">
                      <Label
                        htmlFor="currentPassword"
                        className="text-sm font-bold"
                      >
                        Contraseña Actual
                      </Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          {...passwordForm.register("currentPassword")}
                          disabled={isLoading}
                          className="h-12 pr-12 rounded-2xl border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
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
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label
                          htmlFor="newPassword"
                          className="text-sm font-bold"
                        >
                          Nueva Contraseña
                        </Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            {...passwordForm.register("newPassword")}
                            disabled={isLoading}
                            className="h-12 pr-12 rounded-2xl border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
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
                          htmlFor="confirmPassword"
                          className="text-sm font-bold"
                        >
                          Confirmar Nueva
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            {...passwordForm.register("confirmPassword")}
                            disabled={isLoading}
                            className="h-12 pr-12 rounded-2xl border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
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
                    <div className="flex gap-4 pt-4">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 h-12 shadow-xl shadow-primary/20"
                        shimmer
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Save className="h-5 w-5 mr-2" />
                        )}
                        Actualizar Ahora
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-12 border-2"
                        onClick={() => {
                          setIsChangingPassword(false);
                          passwordForm.reset();
                        }}
                        disabled={isLoading}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card
              variant="elevated"
              className="border-0 shadow-2xl overflow-hidden"
            >
              <CardHeader
                padding="lg"
                className="bg-[var(--admin-bg-tertiary)]"
              >
                <CardTitle className="flex items-center gap-3 text-xl font-bold font-cormorant tracking-tight">
                  <div className="p-2 bg-amber-500/10 rounded-xl">
                    <Bell className="h-5 w-5 text-amber-500" />
                  </div>
                  Personalización
                </CardTitle>
                <CardDescription>
                  Ajusta el sistema a tus necesidades regionales.
                </CardDescription>
              </CardHeader>
              <CardContent padding="lg" spacing="relaxed">
                <div className="space-y-6 max-w-md">
                  <div className="space-y-3">
                    <Label htmlFor="timezone" className="text-sm font-bold">
                      Zona Horaria Regional
                    </Label>
                    <Select
                      value={preferences.timezone}
                      onValueChange={(value) =>
                        setPreferences((prev) => ({ ...prev, timezone: value }))
                      }
                    >
                      <SelectTrigger
                        id="timezone"
                        className="h-12 rounded-2xl border-slate-200 dark:border-slate-800"
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
                    <Label htmlFor="language" className="text-sm font-bold">
                      Idioma
                    </Label>
                    <Select
                      value={preferences.language}
                      onValueChange={(value) =>
                        setPreferences((prev) => ({ ...prev, language: value }))
                      }
                    >
                      <SelectTrigger
                        id="language"
                        className="h-12 rounded-2xl border-slate-200 dark:border-slate-800"
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
                        htmlFor="preferred_branch"
                        className="text-sm font-bold"
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
                          id="preferred_branch"
                          className="h-12 rounded-2xl border-slate-200 dark:border-slate-800"
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

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="newsletter" className="text-sm font-bold">
                        Recibir novedades y ofertas por email
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Suscripción a newsletter
                      </p>
                    </div>
                    <Switch
                      id="newsletter"
                      checked={preferences.newsletter_subscribed}
                      onCheckedChange={(checked) =>
                        setPreferences((prev) => ({
                          ...prev,
                          newsletter_subscribed: checked,
                        }))
                      }
                    />
                  </div>

                  <Button
                    onClick={handlePreferencesUpdate}
                    className="w-full h-12 shadow-xl shadow-amber-500/20"
                    shimmer
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

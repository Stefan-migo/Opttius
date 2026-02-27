"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Mail,
  Package,
  HardDrive,
  Users,
  Server,
  Database,
  BarChart3,
  Shield,
  Eye,
  EyeOff,
  Save,
  Building2,
  Image as ImageIcon,
  Loader2,
  FileText,
} from "lucide-react";
import { SystemConfig as SystemConfigType } from "../hooks/useSystemConfig";
import { toast } from "sonner";
import Image from "next/image";
import ImageUpload from "@/components/ui/ImageUpload";

interface SystemConfigProps {
  configs: SystemConfigType[];
  onUpdateConfig: (key: string, value: any) => Promise<void>;
  isUpdating?: boolean;
  configScope?: "global" | "branch";
  onConfigScopeChange?: (scope: "global" | "branch") => void;
  currentBranchId?: string | null;
  hasMultipleBranches?: boolean;
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, any> = {
    general: Settings,
    contact: Mail,
    ecommerce: Package,
    inventory: HardDrive,
    membership: Users,
    email: Mail,
    system: Server,
    database: Database,
    business: BarChart3,
    prescriptions: FileText,
  };

  return icons[category] || Settings;
};

const getContactPlaceholder = (key: string): string => {
  const placeholders: Record<string, string> = {
    address: "Dirección",
    phone_number: "Teléfono",
    contact_email: "contacto@ejemplo.com",
    support_email: "soporte@ejemplo.com",
  };
  return placeholders[key] ?? "";
};

const translateConfigKey = (key: string): string => {
  const translations: Record<string, string> = {
    // General
    site_name: "Nombre del Sitio",
    site_description: "Descripción del Sitio",
    timezone: "Zona Horaria",
    date_format: "Formato de Fecha",
    time_format: "Formato de Hora",
    language: "Idioma Predeterminado",

    // Contact
    address: "Dirección",
    contact_email: "Email de Contacto",
    phone_number: "Número de Teléfono",
    support_email: "Email de Soporte",

    // E-commerce & Billing
    currency: "Moneda",
    currency_symbol: "Símbolo de Moneda",
    tax_rate: "Tasa de Impuesto (IVA)",
    shipping_cost: "Costo de Envío",
    free_shipping_threshold: "Umbral de Envío Gratis",
    invoice_footer_text: "Texto Pie de Factura",

    // Inventory
    low_stock_threshold: "Umbral de Stock Bajo",
    auto_low_stock_alerts: "Alertas Automáticas de Stock",
    enable_negative_stock: "Permitir Stock Negativo",

    // Membership
    membership_trial_days: "Días de Prueba",
    membership_reminder_days: "Días de Recordatorio",

    // Email
    smtp_host: "Servidor SMTP",
    smtp_port: "Puerto SMTP",
    smtp_username: "Usuario SMTP",
    smtp_password: "Contraseña SMTP",
    from_name: "Nombre Remitente",
    from_email: "Email Remitente",

    // System & Security
    maintenance_mode: "Modo Mantenimiento",
    debug_mode: "Modo Depuración",
    session_timeout: "Tiempo de Expiración de Sesión (min)",
    max_login_attempts: "Intentos Máximos de Login",
    password_expiry_days: "Expiración de Contraseña (días)",

    // Business
    business_hours: "Horarios de Atención",
    enable_online_appointments: "Habilitar Citas Online",
  };

  return (
    translations[key] ||
    key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
};

/**
 * UI de configuración del sistema por categorías.
 * Muestra system_config con filtros, scope global/branch, e información de la óptica.
 *
 * @param props.configs - Lista de configuraciones a mostrar
 * @param props.onUpdateConfig - Callback para guardar una config por clave
 * @param props.configScope - "global" (todas sucursales) o "branch" (sucursal actual)
 * @param props.onConfigScopeChange - Callback al cambiar scope (solo si hasMultipleBranches)
 */
export default function SystemConfig({
  configs,
  onUpdateConfig,
  isUpdating = false,
  configScope = "global",
  onConfigScopeChange,
  currentBranchId,
  hasMultipleBranches = false,
}: SystemConfigProps) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showSensitive, setShowSensitive] = useState(false);

  // Local state for config values (to prevent page reload on input)
  const [localConfigValues, setLocalConfigValues] = useState<
    Record<string, any>
  >({});
  const [savingConfigKeys, setSavingConfigKeys] = useState<Set<string>>(
    new Set(),
  );

  // Organization data state
  const [organizationData, setOrganizationData] = useState<{
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    slogan: string | null;
  } | null>(null);
  const [localOrgData, setLocalOrgData] = useState<{
    name: string;
    logo_url: string;
    slogan: string;
  } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);

  const filteredConfigs = useMemo(() => {
    return configs.filter((config) => {
      // Filter out overlapping or irrelevant categories
      // 'appointments' is plural in DB. 'branches' handles isolation.
      // 'telemetry' is SaaS config, not for optics
      if (["appointments", "branches", "telemetry"].includes(config.category))
        return false;

      // Filter out redundant keys handled by dedicated cards
      const redundancyKeys = [
        "site_name",
        "site_description",
        "clinic_name", // Handled by Organization Name
        "clinic_rut", // Handled by Organization settings if added
        "clinic_specialty", // Handled by Organization Slogan/Desc
        // Email card: only Display Name + Reply-To in dedicated card
        "from_name",
        "from_email",
        "email_from_name",
        "email_from_address",
        "resend_enabled",
        "resend_from_email",
        "smtp_host",
        "smtp_port",
        "smtp_username",
        "smtp_password",
        "support_email", // Shown in Email tab (EmailConfigCard)
        "prescription_expiration_months", // Shown in dedicated Recetas card
      ];
      if (redundancyKeys.includes(config.config_key)) return false;

      if (categoryFilter !== "all" && config.category !== categoryFilter)
        return false;
      if (config.is_sensitive && !showSensitive) return false;
      return true;
    });
  }, [configs, categoryFilter, showSensitive]);

  const configsByCategory = useMemo(() => {
    return filteredConfigs.reduce((acc: any, config) => {
      if (!acc[config.category]) {
        acc[config.category] = [];
      }
      acc[config.category].push(config);
      return acc;
    }, {});
  }, [filteredConfigs]);

  const categoryNames: Record<string, string> = {
    general: "General",
    contact: "Contacto",
    ecommerce: "E-commerce",
    inventory: "Inventario",
    membership: "Membresías",
    email: "Correo Electrónico",
    system: "Sistema",
    database: "Base de Datos",
    business: "Negocio",
    prescriptions: "Recetas",
  };

  const uniqueCategories = Array.from(
    new Set(
      configs
        .filter(
          (c) =>
            !["appointments", "branches", "telemetry"].includes(c.category),
        )
        .map((c) => c.category),
    ),
  );

  // Initialize local config values from props
  useEffect(() => {
    const initialValues: Record<string, any> = {};
    configs.forEach((config) => {
      initialValues[config.config_key] = config.config_value;
    });
    // Default for prescription_expiration_months when not in DB (before migration)
    if (
      !configs.some((c) => c.config_key === "prescription_expiration_months")
    ) {
      initialValues["prescription_expiration_months"] = 6;
    }
    setLocalConfigValues(initialValues);
  }, [configs]);

  // Fetch organization data
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        setLoadingOrg(true);
        const response = await fetch("/api/admin/organizations/current");
        if (response.ok) {
          const data = await response.json();
          const organization = data?.data ?? data?.organization;
          if (organization) {
            setOrganizationData(organization);
            setLocalOrgData({
              name: organization.name || "",
              logo_url: organization.logo_url || "",
              slogan: organization.slogan || "",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching organization:", error);
        toast.error("Error al cargar información de la organización");
      } finally {
        setLoadingOrg(false);
      }
    };

    fetchOrganization();
  }, []);

  // Handle save config
  const handleSaveConfig = async (configKey: string) => {
    const value = localConfigValues[configKey];
    if (value === undefined) return;

    try {
      setSavingConfigKeys((prev) => new Set(prev).add(configKey));
      await onUpdateConfig(configKey, value);
      toast.success("Configuración guardada correctamente");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Error al guardar la configuración");
    } finally {
      setSavingConfigKeys((prev) => {
        const newSet = new Set(prev);
        newSet.delete(configKey);
        return newSet;
      });
    }
  };

  // Handle save organization
  const handleSaveOrganization = async () => {
    if (!localOrgData) return;

    try {
      setSavingOrg(true);
      const response = await fetch("/api/admin/organizations/current", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: localOrgData.name,
          logo_url: localOrgData.logo_url || null,
          slogan: localOrgData.slogan || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar la organización");
      }

      const data = await response.json();
      const organization = data?.data ?? data?.organization;
      if (organization) {
        setOrganizationData(organization);
        toast.success("Información de la óptica actualizada correctamente");
        // Reload page to update header
        window.location.reload();
      }
    } catch (error: any) {
      console.error("Error saving organization:", error);
      toast.error(
        error.message || "Error al guardar la información de la óptica",
      );
    } finally {
      setSavingOrg(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header con información */}
      <Card className="rounded-xl border border-border">
        <CardHeader className="p-4 sm:p-6 pb-0">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-display text-epoch-primary text-base sm:text-lg">
            <div className="flex items-center">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
              Configuración del Sistema
            </div>
            <Badge variant="outline" className="text-[10px] sm:text-xs w-fit">
              {configs.length}{" "}
              {configs.length === 1 ? "configuración" : "configuraciones"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-4">
          <p className="text-xs sm:text-sm text-epoch-primary/80">
            Gestiona las configuraciones del sistema. Usa el botón
            &quot;Guardar&quot; para aplicar los cambios.
          </p>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            {hasMultipleBranches && onConfigScopeChange && (
              <div className="w-full md:w-auto min-w-0">
                <Label className="text-xs sm:text-sm font-medium mb-2 block">
                  Aplicar a
                </Label>
                <Select
                  value={configScope}
                  onValueChange={(v) =>
                    onConfigScopeChange(v as "global" | "branch")
                  }
                >
                  <SelectTrigger className="w-full md:w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Todas las sucursales</SelectItem>
                    <SelectItem value="branch">Sucursal actual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex-1 w-full md:min-w-0 min-w-0">
              <Label className="text-xs sm:text-sm font-medium mb-2 block">
                Filtrar por Categoría
              </Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {categoryNames[category] ||
                        category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-auto min-w-0 shrink-0">
              <Label className="text-xs sm:text-sm font-medium mb-2 block">
                Opciones
              </Label>
              <Button
                variant="outline"
                onClick={() => setShowSensitive(!showSensitive)}
                className="w-full md:w-auto rounded-xl border-epoch-primary/20 min-h-[44px] text-left justify-center sm:justify-center overflow-hidden"
              >
                {showSensitive ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate">
                      Ocultar Configuraciones Sensibles
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate">
                      Mostrar Configuraciones Sensibles
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization Settings Card - Special card for General category */}
      {categoryFilter === "all" || categoryFilter === "general" ? (
        <Card className="rounded-xl border border-border">
          <CardHeader className="p-4 sm:p-6 pb-0">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-display text-epoch-primary text-base sm:text-lg">
              <div className="flex items-center">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                Información de la Óptica (Header)
              </div>
              <Badge variant="default" className="text-[10px] sm:text-xs w-fit">
                Personalización
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-4">
            {loadingOrg ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-epoch-primary" />
              </div>
            ) : localOrgData ? (
              <div className="space-y-6">
                {/* Clinic Name */}
                <div className="space-y-2">
                  <Label htmlFor="clinic_name">
                    Nombre de la Óptica (Clínica) *
                  </Label>
                  <p className="text-xs text-epoch-primary/80">
                    Este nombre se mostrará en el header de las secciones
                  </p>
                  <Input
                    id="clinic_name"
                    type="text"
                    value={localOrgData.name}
                    onChange={(e) =>
                      setLocalOrgData({ ...localOrgData, name: e.target.value })
                    }
                    placeholder="Ej: Óptica Visión Premium"
                    className="w-full"
                  />
                </div>

                {/* Slogan */}
                <div className="space-y-2">
                  <Label htmlFor="slogan">Slogan (Opcional)</Label>
                  <p className="text-xs text-epoch-primary/80">
                    Slogan o tagline que aparecerá debajo del nombre en el
                    header
                  </p>
                  <Input
                    id="slogan"
                    type="text"
                    value={localOrgData.slogan}
                    onChange={(e) =>
                      setLocalOrgData({
                        ...localOrgData,
                        slogan: e.target.value,
                      })
                    }
                    placeholder="Ej: Tu visión, nuestra pasión"
                    className="w-full"
                  />
                </div>

                {/* Logo */}
                <div className="space-y-4">
                  <Label>Logo de la Clínica</Label>
                  <p className="text-xs text-epoch-primary/80">
                    Logo de la óptica que se mostrará en el header de todas las
                    sucursales.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="flex-1 w-full max-w-sm">
                      <ImageUpload
                        value={localOrgData.logo_url || ""}
                        onChange={(url) =>
                          setLocalOrgData({ ...localOrgData, logo_url: url })
                        }
                        folder="logos"
                      />
                    </div>

                    {localOrgData.logo_url && (
                      <div className="space-y-2">
                        <Label className="text-xs">Vista Previa Actual</Label>
                        <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-border bg-white shadow-sm flex items-center justify-center">
                          <Image
                            src={localOrgData.logo_url}
                            alt="Logo preview"
                            width={128}
                            height={128}
                            className="object-contain p-2"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-border">
                  <Button
                    onClick={handleSaveOrganization}
                    disabled={savingOrg}
                    className="min-w-[120px] rounded-xl min-h-[44px] w-full sm:w-auto"
                  >
                    {savingOrg ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Cambios
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Contacto - siempre antes de Recetas */}
      {configsByCategory.contact &&
        (categoryFilter === "all" || categoryFilter === "contact") &&
        (() => {
          const Icon = getCategoryIcon("contact");
          const categoryConfigs =
            configsByCategory.contact as SystemConfigType[];
          return (
            <Card key="contact" className="rounded-xl border border-border">
              <CardHeader className="p-4 sm:p-6 pb-0">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-display text-epoch-primary text-base sm:text-lg">
                  <div className="flex items-center">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                    {categoryNames.contact}
                  </div>
                  <Badge
                    variant="default"
                    className="text-[10px] sm:text-xs w-fit"
                  >
                    {categoryConfigs.length}{" "}
                    {categoryConfigs.length === 1
                      ? "configuración"
                      : "configuraciones"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-4">
                <div className="space-y-3 sm:space-y-4">
                  {categoryConfigs.map((config) => {
                    const localValue = localConfigValues[config.config_key];
                    const hasChanges = localValue !== config.config_value;
                    const isSaving = savingConfigKeys.has(config.config_key);
                    return (
                      <div
                        key={config.id}
                        className="p-3 sm:p-4 rounded-xl border border-border hover:border-epoch-primary/30 transition-colors"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h4 className="font-semibold text-epoch-primary text-sm sm:text-base">
                                  {translateConfigKey(config.config_key)}
                                </h4>
                                {config.is_sensitive && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] sm:text-xs shrink-0"
                                  >
                                    <Shield className="h-3 w-3 mr-1" /> Sensible
                                  </Badge>
                                )}
                                {config.is_public && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] sm:text-xs"
                                  >
                                    Público
                                  </Badge>
                                )}
                                {hasChanges && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] sm:text-xs bg-blue-50 border-blue-200 text-blue-700"
                                  >
                                    Sin guardar
                                  </Badge>
                                )}
                              </div>
                              {config.description && (
                                <p className="text-xs sm:text-sm text-epoch-primary/80 mt-1 break-words">
                                  {config.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                            <div className="flex-1 w-full min-w-0">
                              <Label className="text-[10px] sm:text-xs text-epoch-primary/70 mb-1 block">
                                Valor
                              </Label>
                              {config.value_type === "boolean" ? (
                                <Select
                                  value={
                                    localValue !== undefined
                                      ? localValue.toString()
                                      : config.config_value.toString()
                                  }
                                  onValueChange={(v) =>
                                    setLocalConfigValues({
                                      ...localConfigValues,
                                      [config.config_key]: v === "true",
                                    })
                                  }
                                  disabled={isUpdating || isSaving}
                                >
                                  <SelectTrigger className="w-full sm:w-[180px] rounded-xl">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">
                                      Verdadero
                                    </SelectItem>
                                    <SelectItem value="false">Falso</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : config.value_type === "number" ? (
                                <Input
                                  type="number"
                                  value={
                                    localValue !== undefined
                                      ? localValue
                                      : config.config_value
                                  }
                                  onChange={(e) =>
                                    setLocalConfigValues({
                                      ...localConfigValues,
                                      [config.config_key]:
                                        parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full sm:w-[200px] rounded-xl"
                                  disabled={isUpdating || isSaving}
                                />
                              ) : (
                                <Input
                                  type="text"
                                  value={
                                    localValue !== undefined
                                      ? localValue
                                      : config.config_value
                                  }
                                  onChange={(e) =>
                                    setLocalConfigValues({
                                      ...localConfigValues,
                                      [config.config_key]: e.target.value,
                                    })
                                  }
                                  placeholder={getContactPlaceholder(
                                    config.config_key,
                                  )}
                                  className="w-full sm:max-w-[400px] rounded-xl"
                                  disabled={isUpdating || isSaving}
                                />
                              )}
                            </div>
                            <div className="flex flex-col sm:items-end gap-2">
                              {hasChanges && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleSaveConfig(config.config_key)
                                  }
                                  disabled={isSaving}
                                  className="min-w-[100px] rounded-xl min-h-[44px] w-full sm:w-auto"
                                >
                                  {isSaving ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />{" "}
                                      Guardando...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="h-3 w-3 mr-1" /> Guardar
                                    </>
                                  )}
                                </Button>
                              )}
                              <div className="text-right">
                                <p className="text-[10px] sm:text-xs text-epoch-primary/70">
                                  Actualizado
                                </p>
                                <p className="text-xs font-medium">
                                  {new Date(
                                    config.updated_at,
                                  ).toLocaleDateString("es-AR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })()}

      {/* Recetas - siempre debajo de Contacto */}
      {(categoryFilter === "all" || categoryFilter === "prescriptions") && (
        <Card className="rounded-xl border border-border">
          <CardHeader className="p-4 sm:p-6 pb-0">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-display text-epoch-primary text-base sm:text-lg">
              <div className="flex items-center">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                Recetas
              </div>
              <Badge variant="default" className="text-[10px] sm:text-xs w-fit">
                Configuración
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-4">
            <p className="text-xs sm:text-sm text-epoch-primary/80 mb-4">
              Configura el tiempo de expiración por defecto de las recetas
              oftalmológicas. Al crear una receta, la fecha de vencimiento se
              calculará automáticamente sumando este valor a la fecha de
              creación.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 w-full sm:max-w-[200px]">
                <Label
                  htmlFor="prescription_expiration_months"
                  className="text-xs sm:text-sm"
                >
                  Tiempo de expiración por defecto (meses)
                </Label>
                <Input
                  id="prescription_expiration_months"
                  type="number"
                  min={1}
                  max={24}
                  value={
                    localConfigValues["prescription_expiration_months"] ??
                    configs.find(
                      (c) => c.config_key === "prescription_expiration_months",
                    )?.config_value ??
                    6
                  }
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10) || 6;
                    setLocalConfigValues((prev) => ({
                      ...prev,
                      prescription_expiration_months: value,
                    }));
                  }}
                  className="mt-2 rounded-xl"
                  disabled={
                    isUpdating ||
                    savingConfigKeys.has("prescription_expiration_months")
                  }
                />
              </div>
              <Button
                size="sm"
                onClick={() =>
                  handleSaveConfig("prescription_expiration_months")
                }
                disabled={
                  savingConfigKeys.has("prescription_expiration_months") ||
                  (localConfigValues["prescription_expiration_months"] ===
                    configs.find(
                      (c) => c.config_key === "prescription_expiration_months",
                    )?.config_value &&
                    !!configs.find(
                      (c) => c.config_key === "prescription_expiration_months",
                    ))
                }
                className="min-w-[100px] rounded-xl min-h-[44px] w-full sm:w-auto"
              >
                {savingConfigKeys.has("prescription_expiration_months") ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
            <p className="text-[10px] sm:text-xs text-epoch-primary/70 mt-2">
              Valor por defecto: 6 meses. Ejemplo: receta del 10/02 →
              vencimiento 10/08.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Configuraciones por Categoría (excluye contact y prescriptions, ya renderizados arriba) */}
      {Object.keys(configsByCategory).length === 0 ? (
        <Card className="rounded-xl border border-border">
          <CardContent className="p-6 sm:p-12 text-center">
            <Settings className="h-10 w-10 sm:h-12 sm:w-12 text-epoch-primary/40 mx-auto mb-4 opacity-50" />
            <p className="text-epoch-primary/80">
              No se encontraron configuraciones con los filtros seleccionados
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(configsByCategory)
          .filter(
            ([category]) => !["contact", "prescriptions"].includes(category),
          )
          .map(([category, categoryConfigs]) => {
            const Icon = getCategoryIcon(category);

            return (
              <Card key={category} className="rounded-xl border border-border">
                <CardHeader className="p-4 sm:p-6 pb-0">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-display text-epoch-primary text-base sm:text-lg">
                    <div className="flex items-center">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                      {categoryNames[category] ||
                        category.charAt(0).toUpperCase() + category.slice(1)}
                    </div>
                    <Badge
                      variant="default"
                      className="text-[10px] sm:text-xs w-fit"
                    >
                      {(categoryConfigs as SystemConfigType[]).length}{" "}
                      {(categoryConfigs as SystemConfigType[]).length === 1
                        ? "configuración"
                        : "configuraciones"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-4">
                  <div className="space-y-3 sm:space-y-4">
                    {(categoryConfigs as SystemConfigType[]).map((config) => {
                      const localValue = localConfigValues[config.config_key];
                      const hasChanges = localValue !== config.config_value;
                      const isSaving = savingConfigKeys.has(config.config_key);

                      return (
                        <div
                          key={config.id}
                          className="p-3 sm:p-4 rounded-xl border border-border hover:border-epoch-primary/30 transition-colors"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-epoch-primary">
                                    {translateConfigKey(config.config_key)}
                                  </h4>
                                  {config.is_sensitive && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-yellow-50 border-yellow-200"
                                    >
                                      <Shield className="h-3 w-3 mr-1" />
                                      Sensible
                                    </Badge>
                                  )}
                                  {config.is_public && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Público
                                    </Badge>
                                  )}
                                  {hasChanges && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-blue-50 border-blue-200 text-blue-700"
                                    >
                                      Sin guardar
                                    </Badge>
                                  )}
                                </div>
                                {config.description && (
                                  <p className="text-sm text-epoch-primary/80 mt-1">
                                    {config.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                              <div className="flex-1 w-full">
                                <Label className="text-[10px] sm:text-xs text-epoch-primary/70 mb-1 block">
                                  Valor
                                </Label>
                                {config.value_type === "boolean" ? (
                                  <Select
                                    value={
                                      localValue !== undefined
                                        ? localValue.toString()
                                        : config.config_value.toString()
                                    }
                                    onValueChange={(value) => {
                                      setLocalConfigValues({
                                        ...localConfigValues,
                                        [config.config_key]: value === "true",
                                      });
                                    }}
                                    disabled={isUpdating || isSaving}
                                  >
                                    <SelectTrigger className="w-full sm:w-[180px] rounded-xl">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="true">
                                        Verdadero
                                      </SelectItem>
                                      <SelectItem value="false">
                                        Falso
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : config.value_type === "number" ? (
                                  <Input
                                    type="number"
                                    value={
                                      localValue !== undefined
                                        ? localValue
                                        : config.config_value
                                    }
                                    onChange={(e) => {
                                      const value =
                                        parseFloat(e.target.value) || 0;
                                      setLocalConfigValues({
                                        ...localConfigValues,
                                        [config.config_key]: value,
                                      });
                                    }}
                                    className="w-full sm:w-[200px] rounded-xl"
                                    disabled={isUpdating || isSaving}
                                  />
                                ) : (
                                  <Input
                                    type="text"
                                    value={
                                      localValue !== undefined
                                        ? localValue
                                        : config.config_value
                                    }
                                    onChange={(e) => {
                                      setLocalConfigValues({
                                        ...localConfigValues,
                                        [config.config_key]: e.target.value,
                                      });
                                    }}
                                    placeholder={
                                      category === "contact"
                                        ? getContactPlaceholder(
                                            config.config_key,
                                          )
                                        : undefined
                                    }
                                    className="w-full sm:max-w-[400px] rounded-xl"
                                    disabled={isUpdating || isSaving}
                                  />
                                )}
                              </div>

                              <div className="flex flex-col sm:items-end gap-2">
                                {hasChanges && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleSaveConfig(config.config_key)
                                    }
                                    disabled={isSaving}
                                    className="min-w-[100px] rounded-xl min-h-[44px] w-full sm:w-auto"
                                  >
                                    {isSaving ? (
                                      <>
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        Guardando...
                                      </>
                                    ) : (
                                      <>
                                        <Save className="h-3 w-3 mr-1" />
                                        Guardar
                                      </>
                                    )}
                                  </Button>
                                )}
                                <div className="text-right">
                                  <p className="text-xs text-epoch-primary/80">
                                    Actualizado
                                  </p>
                                  <p className="text-xs font-medium">
                                    {new Date(
                                      config.updated_at,
                                    ).toLocaleDateString("es-AR", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
      )}
    </div>
  );
}

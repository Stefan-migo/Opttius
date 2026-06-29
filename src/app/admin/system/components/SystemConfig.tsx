"use client";

import {
  BarChart3,
  Database,
  Eye,
  EyeOff,
  FileText,
  HardDrive,
  Loader2,
  Mail,
  Package,
  Save,
  Server,
  Settings,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SystemConfig as SystemConfigType } from "../hooks/useSystemConfig";
import OrganizationInfoCard from "./_components/OrganizationInfoCard";
import ConfigItem from "./_components/ConfigItem";

interface SystemConfigProps {
  configs: SystemConfigType[];
  onUpdateConfig: (key: string, value: unknown) => Promise<void>;
  isUpdating?: boolean;
  configScope?: "global" | "branch";
  onConfigScopeChange?: (scope: "global" | "branch") => void;
  currentBranchId?: string | null;
  hasMultipleBranches?: boolean;
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, unknown> = {
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
    Record<string, unknown>
  >({});
  const [savingConfigKeys, setSavingConfigKeys] = useState<Set<string>>(
    new Set(),
  );

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
    return filteredConfigs.reduce((acc: unknown, config) => {
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
    const initialValues: Record<string, unknown> = {};
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
            <Badge className="text-[10px] sm:text-xs w-fit" variant="outline">
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
                className="w-full md:w-auto rounded-xl border-epoch-primary/20 min-h-[44px] text-left justify-center sm:justify-center overflow-hidden"
                variant="outline"
                onClick={() => setShowSensitive(!showSensitive)}
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

      {categoryFilter === "all" || categoryFilter === "general" ? (
        <OrganizationInfoCard />
      ) : null}

      {/* Contacto - siempre antes de Recetas */}
      {configsByCategory.contact &&
        (categoryFilter === "all" || categoryFilter === "contact") &&
        (() => {
          const Icon = getCategoryIcon("contact");
          const categoryConfigs =
            configsByCategory.contact as SystemConfigType[];
          return (
            <Card className="rounded-xl border border-border" key="contact">
              <CardHeader className="p-4 sm:p-6 pb-0">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-display text-epoch-primary text-base sm:text-lg">
                  <div className="flex items-center">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                    {categoryNames.contact}
                  </div>
                  <Badge
                    className="text-[10px] sm:text-xs w-fit"
                    variant="default"
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
                      <ConfigItem
                        config={config}
                        hasChanges={hasChanges}
                        isSaving={isSaving}
                        isUpdating={isUpdating}
                        key={config.id}
                        localValue={localValue}
                        placeholder={getContactPlaceholder(config.config_key)}
                        onSave={handleSaveConfig}
                        onValueChange={(key, value) =>
                          setLocalConfigValues((prev) => ({
                            ...prev,
                            [key]: value,
                          }))
                        }
                      />
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
              <Badge className="text-[10px] sm:text-xs w-fit" variant="default">
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
                  className="text-xs sm:text-sm"
                  htmlFor="prescription_expiration_months"
                >
                  Tiempo de expiración por defecto (meses)
                </Label>
                <Input
                  className="mt-2 rounded-xl"
                  disabled={
                    isUpdating ||
                    savingConfigKeys.has("prescription_expiration_months")
                  }
                  id="prescription_expiration_months"
                  max={24}
                  min={1}
                  type="number"
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
                />
              </div>
              <Button
                className="min-w-[100px] rounded-xl min-h-[44px] w-full sm:w-auto"
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
                size="sm"
                onClick={() =>
                  handleSaveConfig("prescription_expiration_months")
                }
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
              <Card className="rounded-xl border border-border" key={category}>
                <CardHeader className="p-4 sm:p-6 pb-0">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-display text-epoch-primary text-base sm:text-lg">
                    <div className="flex items-center">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                      {categoryNames[category] ||
                        category.charAt(0).toUpperCase() + category.slice(1)}
                    </div>
                    <Badge
                      className="text-[10px] sm:text-xs w-fit"
                      variant="default"
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
                        <ConfigItem
                          config={config}
                          hasChanges={hasChanges}
                          isSaving={isSaving}
                          isUpdating={isUpdating}
                          key={config.id}
                          localValue={localValue}
                          onSave={handleSaveConfig}
                          onValueChange={(key, value) =>
                            setLocalConfigValues((prev) => ({
                              ...prev,
                              [key]: value,
                            }))
                          }
                        />
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

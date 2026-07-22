"use client";

import { Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { SystemConfig as SystemConfigType } from "../hooks/useSystemConfig";
import ConfigItem from "./_components/ConfigItem";
import OrganizationInfoCard from "./_components/OrganizationInfoCard";
import SystemConfigCategoryCards from "./SystemConfigCategoryCards";
import SystemConfigFilters from "./SystemConfigFilters";
import {
  CATEGORY_NAMES,
  EXCLUDED_CATEGORIES,
  getCategoryIcon,
  getContactPlaceholder,
  REDUNDANCY_KEYS,
} from "./systemConfigHelpers";
import PrescriptionsConfig from "./SystemConfigPrescriptions";

interface SystemConfigProps {
  configs: SystemConfigType[];
  onUpdateConfig: (key: string, value: unknown) => Promise<void>;
  isUpdating?: boolean;
  configScope?: "global" | "branch";
  onConfigScopeChange?: (scope: "global" | "branch") => void;
  currentBranchId?: string | null;
  hasMultipleBranches?: boolean;
}

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
      if (EXCLUDED_CATEGORIES.includes(config.category)) return false;
      if (REDUNDANCY_KEYS.includes(config.config_key)) return false;

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

  const uniqueCategories = Array.from(
    new Set(
      configs
        .filter((c) => !EXCLUDED_CATEGORIES.includes(c.category))
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

      <SystemConfigFilters
        categoryFilter={categoryFilter}
        categoryNames={CATEGORY_NAMES}
        configScope={configScope}
        hasMultipleBranches={hasMultipleBranches}
        showSensitive={showSensitive}
        uniqueCategories={uniqueCategories}
        onCategoryFilterChange={setCategoryFilter}
        onConfigScopeChange={onConfigScopeChange}
        onToggleSensitive={() => setShowSensitive(!showSensitive)}
      />

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
                    {CATEGORY_NAMES.contact}
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

      {categoryFilter === "all" || categoryFilter === "prescriptions" ? (
        <PrescriptionsConfig
          hasChanges={
            localConfigValues["prescription_expiration_months"] !==
              configs.find(
                (c) => c.config_key === "prescription_expiration_months",
              )?.config_value &&
            !!configs.find(
              (c) => c.config_key === "prescription_expiration_months",
            )
          }
          isSaving={savingConfigKeys.has("prescription_expiration_months")}
          isUpdating={isUpdating}
          localValue={
            (localConfigValues["prescription_expiration_months"] as number) ??
            (configs.find(
              (c) => c.config_key === "prescription_expiration_months",
            )?.config_value as number) ??
            6
          }
          onSave={() => handleSaveConfig("prescription_expiration_months")}
          onValueChange={(value) =>
            setLocalConfigValues((prev) => ({
              ...prev,
              prescription_expiration_months: value,
            }))
          }
        />
      ) : null}

      <SystemConfigCategoryCards
        configsByCategory={configsByCategory}
        isUpdating={isUpdating}
        localConfigValues={localConfigValues}
        savingConfigKeys={savingConfigKeys}
        onSave={handleSaveConfig}
        onValueChange={(key, value) =>
          setLocalConfigValues((prev) => ({ ...prev, [key]: value }))
        }
      />
    </div>
  );
}

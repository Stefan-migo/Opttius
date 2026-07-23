"use client";

import { Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { SystemConfig as SystemConfigType } from "../hooks/useSystemConfig";
import ConfigItem from "./_components/ConfigItem";
import { CATEGORY_NAMES, getCategoryIcon } from "./systemConfigHelpers";

interface CategoryCardsProps {
  configsByCategory: Record<string, SystemConfigType[]>;
  localConfigValues: Record<string, unknown>;
  savingConfigKeys: Set<string>;
  isUpdating: boolean;
  onSave: (key: string) => void;
  onValueChange: (key: string, value: unknown) => void;
}

export default function SystemConfigCategoryCards({
  configsByCategory,
  localConfigValues,
  savingConfigKeys,
  isUpdating,
  onSave,
  onValueChange,
}: CategoryCardsProps) {
  const entries = Object.entries(configsByCategory).filter(
    ([category]) => !["contact", "prescriptions"].includes(category),
  );

  if (entries.length === 0) {
    return (
      <Card className="rounded-xl border border-border">
        <CardContent className="p-6 sm:p-12 text-center">
          <Settings className="h-10 w-10 sm:h-12 sm:w-12 text-epoch-primary/40 mx-auto mb-4 opacity-50" />
          <p className="text-epoch-primary/80">
            No se encontraron configuraciones con los filtros seleccionados
          </p>
        </CardContent>
      </Card>
    );
  }

  return entries.map(([category, categoryConfigs]) => {
    const Icon = getCategoryIcon(category);
    return (
      <Card className="rounded-xl border border-border" key={category}>
        <CardHeader className="p-4 sm:p-6 pb-0">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-display text-epoch-primary text-base sm:text-lg">
            <div className="flex items-center">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
              {CATEGORY_NAMES[category] ||
                category.charAt(0).toUpperCase() + category.slice(1)}
            </div>
            <Badge className="text-[10px] sm:text-xs w-fit" variant="default">
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
                  onSave={onSave}
                  onValueChange={onValueChange}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  });
}

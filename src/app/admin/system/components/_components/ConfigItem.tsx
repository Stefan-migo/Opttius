"use client";

import { Loader2, Save, Shield } from "lucide-react";

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

import type { SystemConfig } from "../../hooks/useSystemConfig";

interface ConfigItemProps {
  config: SystemConfig;
  localValue: unknown;
  hasChanges: boolean;
  isSaving: boolean;
  isUpdating: boolean;
  placeholder?: string;
  onValueChange: (key: string, value: unknown) => void;
  onSave: (key: string) => void;
}

function safeValue(v: unknown): string | number {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v;
  return String(v);
}

function translateConfigKey(key: string): string {
  const translations: Record<string, string> = {
    site_name: "Nombre del Sitio",
    site_description: "Descripción del Sitio",
    timezone: "Zona Horaria",
    date_format: "Formato de Fecha",
    time_format: "Formato de Hora",
    language: "Idioma Predeterminado",
    address: "Dirección",
    contact_email: "Email de Contacto",
    phone_number: "Número de Teléfono",
    support_email: "Email de Soporte",
    currency: "Moneda",
    currency_symbol: "Símbolo de Moneda",
    tax_rate: "Tasa de Impuesto (IVA)",
    shipping_cost: "Costo de Envío",
    free_shipping_threshold: "Umbral de Envío Gratis",
    invoice_footer_text: "Texto Pie de Factura",
    low_stock_threshold: "Umbral de Stock Bajo",
    auto_low_stock_alerts: "Alertas Automáticas de Stock",
    enable_negative_stock: "Permitir Stock Negativo",
    membership_trial_days: "Días de Prueba",
    membership_reminder_days: "Días de Recordatorio",
    smtp_host: "Servidor SMTP",
    smtp_port: "Puerto SMTP",
    smtp_username: "Usuario SMTP",
    smtp_password: "Contraseña SMTP",
    from_name: "Nombre Remitente",
    from_email: "Email Remitente",
    maintenance_mode: "Modo Mantenimiento",
    debug_mode: "Modo Depuración",
    session_timeout: "Tiempo de Expiración de Sesión (min)",
    max_login_attempts: "Intentos Máximos de Login",
    password_expiry_days: "Expiración de Contraseña (días)",
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
}

export default function ConfigItem({
  config,
  localValue,
  hasChanges,
  isSaving,
  isUpdating,
  placeholder,
  onValueChange,
  onSave,
}: ConfigItemProps) {
  return (
    <div className="p-3 sm:p-4 rounded-xl border border-border hover:border-epoch-primary/30 transition-colors">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h4 className="font-semibold text-epoch-primary text-sm sm:text-base">
                {translateConfigKey(config.config_key)}
              </h4>
              {config.is_sensitive && (
                <Badge className="text-[10px] sm:text-xs shrink-0" variant="outline">
                  <Shield className="h-3 w-3 mr-1" /> Sensible
                </Badge>
              )}
              {config.is_public && (
                <Badge className="text-[10px] sm:text-xs" variant="outline">
                  Público
                </Badge>
              )}
              {hasChanges && (
                <Badge className="text-[10px] sm:text-xs bg-blue-50 border-blue-200 text-blue-700" variant="outline">
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
            <Label className="text-[10px] sm:text-xs text-epoch-primary/70 mb-1 block">Valor</Label>
            {config.value_type === "boolean" ? (
              <Select
                disabled={isUpdating || isSaving}
                value={String(localValue !== undefined ? localValue : config.config_value)}
                onValueChange={(v) => onValueChange(config.config_key, v === "true")}
              >
                <SelectTrigger className="w-full sm:w-[180px] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Verdadero</SelectItem>
                  <SelectItem value="false">Falso</SelectItem>
                </SelectContent>
              </Select>
            ) : config.value_type === "number" ? (
              <Input
                className="w-full sm:w-[200px] rounded-xl"
                disabled={isUpdating || isSaving}
                type="number"
                value={localValue !== undefined ? (localValue as number) : (config.config_value as number)}
                onChange={(e) => onValueChange(config.config_key, parseFloat(e.target.value) || 0)}
              />
            ) : (
              <Input
                className="w-full sm:max-w-[400px] rounded-xl"
                disabled={isUpdating || isSaving}
                placeholder={placeholder}
                type="text"
                value={safeValue(localValue !== undefined ? localValue : config.config_value)}
                onChange={(e) => onValueChange(config.config_key, e.target.value)}
              />
            )}
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            {hasChanges && (
              <Button
                className="min-w-[100px] rounded-xl min-h-[44px] w-full sm:w-auto"
                disabled={isSaving}
                size="sm"
                onClick={() => onSave(config.config_key)}
              >
                {isSaving ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Guardando...</>
                ) : (
                  <><Save className="h-3 w-3 mr-1" />Guardar</>
                )}
              </Button>
            )}
            <div className="text-right">
              <p className="text-[10px] sm:text-xs text-epoch-primary/70">Actualizado</p>
              <p className="text-xs font-medium">
                {new Date(config.updated_at).toLocaleDateString("es-AR", {
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
}

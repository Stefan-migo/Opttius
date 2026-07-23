"use client";

import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Save,
  XCircle,
} from "lucide-react";

import { useNotificationSettings } from "@/components/admin/_hooks/useNotificationSettings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/notifications/constants";

interface NotificationSetting {
  id: string;
  notification_type: string;
  enabled: boolean;
  priority: "low" | "medium" | "high" | "urgent" | null;
  notify_all_admins: boolean;
  notify_specific_roles: string[] | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

interface NotificationSettingsProps {
  branchId?: string | null;
  organizationId?: string | null;
  branchName?: string;
  configScope?: "global" | "branch";
  onConfigScopeChange?: (scope: "global" | "branch") => void;
  hasMultipleBranches?: boolean;
}

/**
 * Configuración de notificaciones por tipo (quote_new, work_order_new, low_stock, etc.).
 * Soporta scope org o branch. Usa /api/admin/notifications/settings.
 *
 * @param props.branchId - Scope branch (opcional)
 * @param props.organizationId - Scope org
 * @param props.configScope - "global" (org) o "branch"
 * @param props.onConfigScopeChange - Callback al cambiar scope
 */
export default function NotificationSettings({
  branchId,
  organizationId,
  branchName,
  configScope = "global",
  onConfigScopeChange,
  hasMultipleBranches = false,
}: NotificationSettingsProps) {
  const {
    settings, loading, saving, hasChanges, tableNotFound,
    migrationSQL, loadingSQL, fetchMigrationSQL, copySQLToClipboard,
    fetchSettings, updateSetting, saveSettings, toggleAll,
  } = useNotificationSettings({ branchId, organizationId });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-epoch-primary/60" />
      </div>
    );
  }

  // Group settings by category
  const opticalSettings = settings.filter((s) =>
    [
      "quote_new",
      "quote_status_change",
      "quote_converted",
      "work_order_new",
      "work_order_status_change",
      "work_order_completed",
      "appointment_new",
      "appointment_cancelled",
    ].includes(s.notification_type),
  );

  const generalSettings = settings.filter((s) =>
    ["new_customer", "sale_new", "order_new", "order_status_change"].includes(
      s.notification_type,
    ),
  );

  const systemSettings = settings.filter((s) =>
    [
      "low_stock",
      "out_of_stock",
      "payment_received",
      "payment_failed",
      "support_ticket_new",
      "support_ticket_update",
      "system_alert",
      "system_update",
      "security_alert",
      "custom",
    ].includes(s.notification_type),
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="rounded-xl border border-border overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div>
              <CardTitle className="flex items-center font-display text-epoch-primary text-base sm:text-lg">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                Configuración de Notificaciones
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-epoch-primary/80 mt-1">
                {branchName
                  ? `Configuración para sucursal: ${branchName}`
                  : branchId
                    ? "Configuración para la sucursal seleccionada"
                    : "Configuración global de notificaciones. Activa o desactiva y personaliza prioridad."}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2 flex-wrap">
              {hasMultipleBranches && onConfigScopeChange && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <Label className="text-xs sm:text-sm text-epoch-primary/80">
                    Alcance:
                  </Label>
                  <Select
                    value={configScope}
                    onValueChange={(v) =>
                      onConfigScopeChange(v as "global" | "branch")
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[140px] rounded-xl min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Organización</SelectItem>
                      <SelectItem value="branch">Sucursal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                className="rounded-xl min-h-[44px] w-full sm:w-auto"
                size="sm"
                variant="outline"
                onClick={() => toggleAll(true)}
              >
                Activar Todas
              </Button>
              <Button
                className="rounded-xl min-h-[44px] w-full sm:w-auto"
                size="sm"
                variant="outline"
                onClick={() => toggleAll(false)}
              >
                Desactivar Todas
              </Button>
              <Button
                className="rounded-xl min-h-[44px] w-full sm:w-auto"
                disabled={!hasChanges || saving}
                onClick={saveSettings}
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
        </CardHeader>
        <CardContent className="space-y-6">
          {tableNotFound && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                    Tabla de configuración no encontrada
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                    La tabla{" "}
                    <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">
                      notification_settings
                    </code>{" "}
                    no existe en la base de datos.
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                    Por favor, ejecuta la migración de base de datos en Supabase
                    Studio.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={loadingSQL}
                      size="sm"
                      variant="outline"
                      onClick={copySQLToClipboard}
                    >
                      {loadingSQL ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Cargando...
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar SQL
                        </>
                      )}
                    </Button>
                    <Button
                      disabled={loadingSQL}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!migrationSQL) {
                          fetchMigrationSQL().then(() => {
                            setTimeout(() => {
                              const sqlTextarea =
                                document.getElementById("migration-sql");
                              if (sqlTextarea) {
                                sqlTextarea.scrollIntoView({
                                  behavior: "smooth",
                                });
                              }
                            }, 100);
                          });
                        } else {
                          const sqlTextarea =
                            document.getElementById("migration-sql");
                          if (sqlTextarea) {
                            sqlTextarea.scrollIntoView({ behavior: "smooth" });
                          }
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver SQL
                    </Button>
                  </div>
                  {migrationSQL && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium mb-2 block">
                        SQL de la migración:
                      </Label>
                      <textarea
                        readOnly
                        className="w-full h-64 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md font-mono text-xs overflow-auto"
                        id="migration-sql"
                        value={migrationSQL}
                        onClick={(e) => {
                          (e.target as HTMLTextAreaElement).select();
                          copySQLToClipboard();
                        }}
                      />
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                        💡 Haz clic en el área de texto para seleccionar todo y
                        copiar. Luego pégalo en Supabase Studio → SQL Editor.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {settings.length === 0 && !tableNotFound && (
            <div className="text-center py-8 text-muted-foreground">
              No hay configuraciones de notificaciones disponibles.
            </div>
          )}

          {settings.length > 0 && (
            <>
              {/* Optical Shop Settings */}
              <div>
                <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">
                  Óptica
                </h3>
                <div className="space-y-2">
                  {opticalSettings.map((setting) => (
                    <div
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 sm:p-3 border border-border rounded-lg overflow-hidden"
                      key={setting.id}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Label className="font-medium text-xs sm:text-sm truncate">
                          {NOTIFICATION_TYPE_LABELS[
                            setting.notification_type
                          ] || setting.notification_type}
                        </Label>
                        {setting.enabled ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-epoch-primary/40 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <Switch
                          checked={setting.enabled}
                          className="scale-90 sm:scale-100"
                          onCheckedChange={(checked) =>
                            updateSetting(
                              setting.notification_type,
                              "enabled",
                              checked,
                            )
                          }
                        />
                        <Select
                          value={setting.priority || "medium"}
                          onValueChange={(value) =>
                            updateSetting(
                              setting.notification_type,
                              "priority",
                              value,
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-24 sm:w-28 rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baja</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Settings */}
              <div>
                <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">
                  General
                </h3>
                <div className="space-y-2">
                  {generalSettings.map((setting) => (
                    <div
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 sm:p-3 border border-border rounded-lg overflow-hidden"
                      key={setting.id}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Label className="font-medium text-xs sm:text-sm truncate">
                          {NOTIFICATION_TYPE_LABELS[
                            setting.notification_type
                          ] || setting.notification_type}
                        </Label>
                        {setting.enabled ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-epoch-primary/40 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <Switch
                          checked={setting.enabled}
                          className="scale-90 sm:scale-100"
                          onCheckedChange={(checked) =>
                            updateSetting(
                              setting.notification_type,
                              "enabled",
                              checked,
                            )
                          }
                        />
                        <Select
                          value={setting.priority || "medium"}
                          onValueChange={(value) =>
                            updateSetting(
                              setting.notification_type,
                              "priority",
                              value,
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-24 sm:w-28 rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baja</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Settings */}
              <div>
                <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">
                  Sistema
                </h3>
                <div className="space-y-2">
                  {systemSettings.map((setting) => (
                    <div
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 sm:p-3 border border-border rounded-lg overflow-hidden"
                      key={setting.id}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Label className="font-medium text-xs sm:text-sm truncate">
                          {NOTIFICATION_TYPE_LABELS[
                            setting.notification_type
                          ] || setting.notification_type}
                        </Label>
                        {setting.enabled ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-epoch-primary/40 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <Switch
                          checked={setting.enabled}
                          className="scale-90 sm:scale-100"
                          onCheckedChange={(checked) =>
                            updateSetting(
                              setting.notification_type,
                              "enabled",
                              checked,
                            )
                          }
                        />
                        <Select
                          value={setting.priority || "medium"}
                          onValueChange={(value) =>
                            updateSetting(
                              setting.notification_type,
                              "priority",
                              value,
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-24 sm:w-28 rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baja</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

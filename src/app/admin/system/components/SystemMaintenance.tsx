"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Server,
  Database,
  Trash2,
  RefreshCw,
  Shield,
  Mail,
  Monitor,
} from "lucide-react";
import BackupManager from "./BackupManager";

interface SystemMaintenanceProps {
  onMaintenanceAction: (action: string) => Promise<void>;
  maintenanceLoading: boolean;
  currentAction: string | null;
  backups: any[];
  loadingBackups: boolean;
  onRefreshBackups: () => void;
  onCreateBackup: () => Promise<any>;
  onRestoreBackup: (backup: any) => Promise<void>;
  onDeleteBackup: (backup: any) => Promise<void>;
  onViewBackupDetails: (backup: any) => Promise<void>;
  restoringBackup: boolean;
  deletingBackup: boolean;
}

/**
 * Herramientas de mantenimiento: backup, logs, auditoría, test email, estado del sistema.
 * Incluye BackupManager para listar, restaurar y eliminar backups.
 *
 * @param props.onMaintenanceAction - Ejecuta acción (backup_database, clean_logs, etc.)
 * @param props.backups - Lista de backups disponibles
 * @param props.onCreateBackup - Crear nuevo backup
 * @param props.onRestoreBackup - Restaurar backup seleccionado
 * @param props.onDeleteBackup - Eliminar backup
 */
export default function SystemMaintenance({
  onMaintenanceAction,
  maintenanceLoading,
  currentAction,
  backups,
  loadingBackups,
  onRefreshBackups,
  onCreateBackup,
  onRestoreBackup,
  onDeleteBackup,
  onViewBackupDetails,
  restoringBackup,
  deletingBackup,
}: SystemMaintenanceProps) {
  const maintenanceActions = [
    {
      id: "backup_database",
      label: "Backup Base de Datos",
      description: "Crear copia de seguridad",
      icon: Database,
    },
    {
      id: "clean_logs",
      label: "Limpiar Logs",
      description: "Eliminar logs antiguos",
      icon: Trash2,
    },
    {
      id: "optimize_database",
      label: "Optimizar DB",
      description: "Optimizar rendimiento",
      icon: RefreshCw,
    },
    {
      id: "security_audit",
      label: "Verificar Seguridad",
      description:
        "Auditoría: admins inactivos, cantidad mínima de admins activos y políticas de seguridad",
      icon: Shield,
    },
    {
      id: "test_email",
      label: "Test Email",
      description: "Probar configuración email",
      icon: Mail,
    },
    {
      id: "system_status",
      label: "Estado Sistema",
      description: "Reporte completo",
      icon: Monitor,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Maintenance Actions */}
      <Card className="rounded-xl border border-border overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-0">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 font-display text-epoch-primary text-base sm:text-lg break-words">
            <Server className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Herramientas de Mantenimiento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {maintenanceActions.map((action) => {
              const Icon = action.icon;
              const isActive =
                currentAction === action.id && maintenanceLoading;

              return (
                <Button
                  key={action.id}
                  variant="outline"
                  className="justify-start h-auto p-3 sm:p-4 flex-col items-start rounded-xl border-epoch-primary/20 min-h-[44px] min-w-0 w-full overflow-hidden"
                  onClick={() => onMaintenanceAction(action.id)}
                  disabled={maintenanceLoading}
                >
                  <div className="flex items-center space-x-2 mb-1 sm:mb-2 w-full min-w-0">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span className="font-medium text-xs sm:text-sm truncate">
                      {action.label}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-epoch-primary/70 text-left break-words w-full overflow-hidden line-clamp-2">
                    {action.description}
                  </p>
                  {isActive && (
                    <RefreshCw className="h-3 w-3 animate-spin mt-2 shrink-0" />
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Backup Manager */}
      <BackupManager
        backups={backups}
        loading={loadingBackups}
        onRefresh={onRefreshBackups}
        onCreateBackup={onCreateBackup}
        onRestoreBackup={onRestoreBackup}
        onDeleteBackup={onDeleteBackup}
        onViewBackupDetails={onViewBackupDetails}
        restoring={restoringBackup}
        deleting={deletingBackup}
      />
    </div>
  );
}

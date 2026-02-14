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
    <div className="space-y-6">
      {/* Maintenance Actions */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="h-5 w-5 mr-2" />
            Herramientas de Mantenimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {maintenanceActions.map((action) => {
              const Icon = action.icon;
              const isActive =
                currentAction === action.id && maintenanceLoading;

              return (
                <Button
                  key={action.id}
                  variant="outline"
                  className="justify-start h-auto p-4 flex-col items-start"
                  onClick={() => onMaintenanceAction(action.id)}
                  disabled={maintenanceLoading}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{action.label}</span>
                  </div>
                  <p className="text-sm text-tierra-media">
                    {action.description}
                  </p>
                  {isActive && (
                    <RefreshCw className="h-3 w-3 animate-spin mt-2" />
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

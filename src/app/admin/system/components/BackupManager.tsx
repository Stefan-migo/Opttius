"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Database,
  Calendar,
  Clock,
  RefreshCw,
  Eye,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Backup } from "../hooks/useBackups";

interface BackupManagerProps {
  backups: Backup[];
  loading: boolean;
  onRefresh: () => void;
  onCreateBackup: () => Promise<any>;
  onRestoreBackup: (backup: Backup) => Promise<void>;
  onDeleteBackup: (backup: Backup) => Promise<void>;
  onViewBackupDetails: (backup: Backup) => Promise<void>;
  restoring: boolean;
  deleting: boolean;
}

export default function BackupManager({
  backups,
  loading,
  onRefresh,
  onCreateBackup,
  onRestoreBackup,
  onDeleteBackup,
  onViewBackupDetails,
  restoring,
  deleting,
}: BackupManagerProps) {
  return (
    <Card className="rounded-xl border border-border overflow-hidden">
      <CardHeader className="p-4 sm:p-6 pb-0">
        <CardTitle className="flex items-center justify-between font-display text-epoch-primary text-base sm:text-lg">
          <div className="flex items-center min-w-0">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            <span className="truncate">Backups Disponibles</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-xl min-h-[44px] min-w-[44px] shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-4">
        {loading ? (
          <div className="text-center py-6 sm:py-8">
            <RefreshCw className="h-8 w-8 text-epoch-primary/40 mx-auto mb-4 animate-spin" />
            <p className="text-xs sm:text-sm text-epoch-primary/80">
              Cargando backups...
            </p>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-epoch-primary/40 mx-auto mb-3 sm:mb-4 opacity-50" />
            <p className="text-xs sm:text-sm text-epoch-primary/80 mb-2">
              No hay backups disponibles
            </p>
            <p className="text-[10px] sm:text-xs text-epoch-primary/70">
              Crea un backup usando el botón &quot;Backup Base de Datos&quot;
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="p-3 sm:p-4 rounded-xl border border-border hover:border-epoch-primary/30 transition-colors overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Database className="h-4 w-4 text-epoch-primary shrink-0" />
                      <span className="font-semibold text-xs sm:text-sm text-epoch-primary truncate">
                        {backup.id}
                      </span>
                      {backup.filename.includes("safety_backup") && (
                        <Badge
                          variant="outline"
                          className="text-[10px] sm:text-xs shrink-0"
                        >
                          Backup de Seguridad
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] sm:text-xs text-epoch-primary/70">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {backup.created_at
                            ? new Date(backup.created_at).toLocaleDateString(
                                "es-AR",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                },
                              )
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{backup.size_mb} MB</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {backup.created_at
                            ? new Date(backup.created_at).toLocaleTimeString(
                                "es-AR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 col-span-2 sm:col-span-1">
                        <span className="font-mono text-[10px] sm:text-xs truncate">
                          {backup.filename}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-4 shrink-0 flex-wrap sm:flex-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewBackupDetails(backup)}
                      disabled={restoring || deleting}
                      className="h-9 w-9 p-0 rounded-lg border-epoch-primary/20 shrink-0"
                      title="Ver detalles y descargar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRestoreBackup(backup)}
                      disabled={restoring || deleting}
                      className="h-9 px-2 sm:px-3 text-xs rounded-lg border-epoch-primary/20 shrink-0"
                    >
                      <RotateCcw
                        className={`h-3.5 w-3.5 mr-1 shrink-0 ${restoring ? "animate-spin" : ""}`}
                      />
                      Restaurar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteBackup(backup)}
                      disabled={restoring || deleting}
                      className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 rounded-lg shrink-0"
                      title="Eliminar backup"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

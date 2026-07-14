"use client";

import { CheckCircle, Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { BackupResult } from "../../hooks/useBackups";

interface BackupDialogProps {
  showBackupDialog: boolean;
  setShowBackupDialog: (open: boolean) => void;
  backupResult: BackupResult | null;
  handleDownloadBackup: (downloadUrl: string, fileName: string) => void;
}

export function BackupDialog({
  showBackupDialog,
  setShowBackupDialog,
  backupResult,
  handleDownloadBackup,
}: BackupDialogProps) {
  return (
    <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
            <span className="flex items-center gap-2">
              <Database className="h-5 w-5 shrink-0" />
              {backupResult?.duration_seconds &&
              backupResult.duration_seconds !== "N/A"
                ? "Backup de Base de Datos Completado"
                : "Detalles del Backup"}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {backupResult?.duration_seconds &&
            backupResult.duration_seconds !== "N/A"
              ? "El backup se ha guardado exitosamente en el almacenamiento"
              : "Información del backup y opción de descarga"}
          </DialogDescription>
        </DialogHeader>

        {backupResult && (
          <div className="space-y-4">
            {/* Success Message */}
            {backupResult.duration_seconds &&
              backupResult.duration_seconds !== "N/A" && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800 dark:text-green-300">
                      Backup creado exitosamente
                    </span>
                  </div>
                </div>
              )}

            {/* Backup Information */}
            <Card className="rounded-xl border border-border">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-epoch-primary/80">
                      ID del Backup:
                    </span>
                    <span className="font-mono text-[10px] sm:text-xs break-all">
                      {backupResult.backup_id}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-epoch-primary/80">Archivo:</span>
                    <span className="font-medium break-all">
                      {backupResult.backup_file}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-epoch-primary/80">
                      Tablas respaldadas:
                    </span>
                    <span className="font-medium">
                      {backupResult.tables_count}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-epoch-primary/80">
                      Total de registros:
                    </span>
                    <span className="font-medium">
                      {backupResult.total_records.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-epoch-primary/80">Tamaño:</span>
                    <span className="font-medium">
                      {backupResult.backup_size_mb} MB
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-epoch-primary/80">
                      Tiempo de ejecución:
                    </span>
                    <span className="font-medium">
                      {backupResult.duration_seconds}s
                    </span>
                  </div>
                  {backupResult.download_url_expires_at && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-epoch-primary/80">
                        URL expira:
                      </span>
                      <span className="font-medium text-xs">
                        {new Date(
                          backupResult.download_url_expires_at,
                        ).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Download Section */}
            {backupResult.download_url ? (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                  El backup está guardado en el almacenamiento. Puedes
                  descargarlo ahora o más tarde desde Supabase Storage.
                </p>
                <Button
                  className="w-full rounded-xl min-h-[44px]"
                  onClick={() =>
                    handleDownloadBackup(
                      backupResult.download_url!,
                      backupResult.backup_file,
                    )
                  }
                >
                  <Database className="h-4 w-4 mr-2" />
                  Descargar Backup Ahora
                </Button>
                {backupResult.download_url_expires_at && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center">
                    La URL de descarga expira en{" "}
                    {Math.round(
                      (new Date(
                        backupResult.download_url_expires_at,
                      ).getTime() -
                        Date.now()) /
                        1000 /
                        60,
                    )}{" "}
                    minutos
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  El backup se guardó correctamente, pero no se pudo generar
                  la URL de descarga. Puedes acceder al backup desde Supabase
                  Storage.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            className="w-full sm:w-auto rounded-xl min-h-[44px]"
            variant="outline"
            onClick={() => setShowBackupDialog(false)}
          >
            Cerrar
          </Button>
          {backupResult?.download_url && (
            <Button
              className="w-full sm:w-auto rounded-xl min-h-[44px]"
              onClick={() =>
                handleDownloadBackup(
                  backupResult.download_url!,
                  backupResult.backup_file,
                )
              }
            >
              <Database className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

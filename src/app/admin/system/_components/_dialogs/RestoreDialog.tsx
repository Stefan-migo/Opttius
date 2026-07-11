"use client";

import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

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

interface RestoreDialogProps {
  showRestoreDialog: boolean;
  setShowRestoreDialog: (open: boolean) => void;
  selectedBackup: unknown | null;
  confirmRestoreBackup: () => void;
  isRestoring: boolean;
}

export function RestoreDialog({
  showRestoreDialog,
  setShowRestoreDialog,
  selectedBackup,
  confirmRestoreBackup,
  isRestoring,
}: RestoreDialogProps) {
  return (
    <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Confirmar Restauración de Backup
          </DialogTitle>
          <DialogDescription>
            Esta acción restaurará la base de datos a un punto anterior. Se
            creará un backup de seguridad automático antes de restaurar.
          </DialogDescription>
        </DialogHeader>

        {!!selectedBackup && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                    ⚠️ Advertencia Importante
                  </p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1 list-disc list-inside">
                    <li>
                      Se creará un backup de seguridad automático antes de
                      restaurar
                    </li>
                    <li>
                      Todos los datos actuales serán reemplazados por los del
                      backup
                    </li>
                    <li>Esta acción no se puede deshacer fácilmente</li>
                    <li>
                      Asegúrate de tener un backup reciente antes de continuar
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <Card className="bg-admin-bg-tertiary">
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      ID del Backup:
                    </span>
                    <span className="font-mono text-xs">
                      {(selectedBackup as { id: string }).id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">Archivo:</span>
                    <span className="font-medium">
                      {(selectedBackup as { filename: string }).filename}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">Tamaño:</span>
                    <span className="font-medium">
                      {(selectedBackup as { size_mb: number }).size_mb} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      Fecha de creación:
                    </span>
                    <span className="font-medium">
                      {(selectedBackup as { created_at: string }).created_at
                        ? new Date(
                            (
                              selectedBackup as {
                                created_at: string;
                              }
                            ).created_at,
                          ).toLocaleString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowRestoreDialog(false)}
          >
            Cancelar
          </Button>
          <Button
            disabled={isRestoring}
            variant="destructive"
            onClick={confirmRestoreBackup}
          >
            {isRestoring ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Restaurando...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Confirmar Restauración
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

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

interface DeleteBackupDialogProps {
  showDeleteBackupDialog: boolean;
  setShowDeleteBackupDialog: (open: boolean) => void;
  selectedBackup: unknown | null;
  isDeleting: boolean;
  confirmDeleteBackup: () => void;
}

export function DeleteBackupDialog({
  showDeleteBackupDialog,
  setShowDeleteBackupDialog,
  selectedBackup,
  isDeleting,
  confirmDeleteBackup,
}: DeleteBackupDialogProps) {
  return (
    <Dialog
      open={showDeleteBackupDialog}
      onOpenChange={setShowDeleteBackupDialog}
    >
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Confirmar Eliminación de Backup
          </DialogTitle>
          <DialogDescription>
            Esta acción eliminará permanentemente el archivo de backup. Esta
            acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        {selectedBackup && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 dark:text-red-300 mb-2">
                    ⚠️ Advertencia
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    El backup será eliminado permanentemente del
                    almacenamiento. Asegúrate de haber descargado el backup si
                    lo necesitas más tarde.
                  </p>
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
                      {selectedBackup.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">Archivo:</span>
                    <span className="font-medium">
                      {selectedBackup.filename}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">Tamaño:</span>
                    <span className="font-medium">
                      {selectedBackup.size_mb} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      Fecha de creación:
                    </span>
                    <span className="font-medium">
                      {selectedBackup.created_at
                        ? new Date(selectedBackup.created_at).toLocaleString(
                            "es-AR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
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
            onClick={() => setShowDeleteBackupDialog(false)}
          >
            Cancelar
          </Button>
          <Button
            disabled={isDeleting}
            variant="destructive"
            onClick={confirmDeleteBackup}
          >
            {isDeleting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Backup
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

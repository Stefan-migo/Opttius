"use client";

import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

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

interface RestoreResultsDialogProps {
  showRestoreResultsDialog: boolean;
  setShowRestoreResultsDialog: (open: boolean) => void;
  restoreResults: unknown | null;
}

export function RestoreResultsDialog({
  showRestoreResultsDialog,
  setShowRestoreResultsDialog,
  restoreResults,
}: RestoreResultsDialogProps) {
  return (
    <Dialog
      open={showRestoreResultsDialog}
      onOpenChange={setShowRestoreResultsDialog}
    >
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Resultados de Restauración
          </DialogTitle>
          <DialogDescription>
            Restauración de backup completada
          </DialogDescription>
        </DialogHeader>

        {restoreResults && (
          <div className="space-y-4">
            {/* Success Message */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800 dark:text-green-300">
                  Restauración completada exitosamente
                </span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                {restoreResults.total_records_restored} registros restaurados
                en {restoreResults.tables_restored} tablas
              </p>
            </div>

            {/* Summary Information */}
            <Card className="bg-admin-bg-tertiary">
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      Backup restaurado:
                    </span>
                    <span className="font-medium">
                      {restoreResults.backup_file}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      Backup ID:
                    </span>
                    <span className="font-mono text-xs">
                      {restoreResults.backup_id}
                    </span>
                  </div>
                  {restoreResults.safety_backup_id && (
                    <div className="flex justify-between">
                      <span className="text-admin-text-tertiary">
                        Backup de seguridad creado:
                      </span>
                      <span className="font-mono text-xs">
                        {restoreResults.safety_backup_id}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      Tablas restauradas:
                    </span>
                    <span className="font-medium">
                      {restoreResults.tables_restored}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      Total de registros:
                    </span>
                    <span className="font-medium">
                      {restoreResults.total_records_restored.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      Tiempo de ejecución:
                    </span>
                    <span className="font-medium">
                      {restoreResults.duration_seconds}s
                    </span>
                  </div>
                  {restoreResults.errors > 0 && (
                    <div className="flex justify-between">
                      <span className="text-admin-text-tertiary">
                        Errores:
                      </span>
                      <span className="font-medium text-red-600">
                        {restoreResults.errors}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Detailed Results by Table */}
            {restoreResults.restore_results && (
              <Card className="bg-admin-bg-tertiary">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {Object.entries(restoreResults.restore_results).map(
                      ([tableName, result]: [string, unknown]) => (
                        <div
                          className={`p-3 rounded-lg border ${
                            result.status === "success"
                              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                              : result.status === "error"
                                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                          }`}
                          key={tableName}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {result.status === "success" && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              {result.status === "error" && (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              {(result.status === "partial" ||
                                result.status === "skipped") && (
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              )}
                              <span className="font-medium text-sm capitalize">
                                {tableName}
                              </span>
                            </div>
                            <div className="text-xs text-admin-text-tertiary">
                              {result.status === "success" && (
                                <span className="text-green-700 dark:text-green-400">
                                  {result.records_restored} registros
                                </span>
                              )}
                              {result.status === "partial" && (
                                <span className="text-yellow-700 dark:text-yellow-400">
                                  {result.records_restored}/
                                  {result.records_total} registros
                                </span>
                              )}
                              {result.status === "skipped" && (
                                <span className="text-admin-text-tertiary">
                                  {result.reason}
                                </span>
                              )}
                              {result.status === "error" && (
                                <span className="text-red-700 dark:text-red-400">
                                  Error
                                </span>
                              )}
                            </div>
                          </div>
                          {result.note && (
                            <div className="mt-2 ml-6 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-400">
                              ℹ️ {result.note}
                            </div>
                          )}
                          {result.error && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 ml-6">
                              {result.error}
                            </p>
                          )}
                          {result.error_message && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 ml-6 font-semibold">
                              Error: {result.error_message}
                            </p>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => setShowRestoreResultsDialog(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

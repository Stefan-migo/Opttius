"use client";

import { AlertTriangle, CheckCircle, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SecurityAuditDialogProps {
  showSecurityAuditDialog: boolean;
  setShowSecurityAuditDialog: (open: boolean) => void;
  securityAuditResults: {
    issues: string[];
    issues_count: number;
  } | null;
}

export function SecurityAuditDialog({
  showSecurityAuditDialog,
  setShowSecurityAuditDialog,
  securityAuditResults,
}: SecurityAuditDialogProps) {
  return (
    <Dialog
      open={showSecurityAuditDialog}
      onOpenChange={setShowSecurityAuditDialog}
    >
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Resultados de Auditoría de Seguridad
          </DialogTitle>
          <DialogDescription>
            La auditoría revisa: administradores inactivos, cantidad mínima de
            admins activos y otras políticas de seguridad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {securityAuditResults && securityAuditResults.issues_count > 0 ? (
            <>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-800 dark:text-yellow-300">
                    Se encontraron {securityAuditResults.issues_count}{" "}
                    {securityAuditResults.issues_count === 1
                      ? "problema"
                      : "problemas"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Problemas Detectados:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {securityAuditResults.issues.map((issue, index) => (
                    <li
                      className="text-sm text-admin-text-tertiary pl-2"
                      key={index}
                    >
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800 dark:text-green-300">
                  No se encontraron problemas de seguridad
                </span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                El sistema está configurado correctamente desde el punto de
                vista de seguridad.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => setShowSecurityAuditDialog(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import {
  AlertTriangle,
  Database,
  Monitor,
  Receipt,
  Shield,
  Users,
} from "lucide-react";

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

interface SystemStatusDialogProps {
  showSystemStatusDialog: boolean;
  setShowSystemStatusDialog: (open: boolean) => void;
  systemStatusReport: unknown;
}

export function SystemStatusDialog({
  showSystemStatusDialog,
  setShowSystemStatusDialog,
  systemStatusReport,
}: SystemStatusDialogProps) {
  return (
    <Dialog
      open={showSystemStatusDialog}
      onOpenChange={setShowSystemStatusDialog}
    >
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Reporte de Estado del Sistema
          </DialogTitle>
          <DialogDescription>
            Información completa del estado actual del sistema
          </DialogDescription>
        </DialogHeader>

        {systemStatusReport && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-admin-bg-tertiary">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="h-4 w-4 text-epoch-primary" />
                    <span className="text-xs text-admin-text-tertiary">
                      Usuarios Totales
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    {systemStatusReport.total_users || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-admin-bg-tertiary">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-admin-success" />
                    <span className="text-xs text-admin-text-tertiary">
                      Admins Activos
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    {systemStatusReport.active_admins || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-admin-bg-tertiary">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-admin-accent-tertiary" />
                    <span className="text-xs text-admin-text-tertiary">
                      Productos
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    {systemStatusReport.total_products || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-admin-bg-tertiary">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs text-admin-text-tertiary">
                      Actividad 24h
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    {systemStatusReport.activity_24h || 0}
                  </p>
                </CardContent>
              </Card>
              {systemStatusReport.total_orders != null && (
                <Card className="bg-admin-bg-tertiary">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt className="h-4 w-4 text-epoch-primary" />
                      <span className="text-xs text-admin-text-tertiary">
                        Órdenes
                      </span>
                    </div>
                    <p className="text-2xl font-bold">
                      {systemStatusReport.total_orders}
                    </p>
                  </CardContent>
                </Card>
              )}
              {systemStatusReport.total_customers != null && (
                <Card className="bg-admin-bg-tertiary">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-admin-success" />
                      <span className="text-xs text-admin-text-tertiary">
                        Clientes
                      </span>
                    </div>
                    <p className="text-2xl font-bold">
                      {systemStatusReport.total_customers}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Detailed Information */}
            <Card className="bg-admin-bg-tertiary">
              <CardContent className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      Fecha del Reporte:
                    </span>
                    <span className="font-medium">
                      {systemStatusReport.timestamp
                        ? new Date(
                            systemStatusReport.timestamp,
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
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      Usuarios Registrados:
                    </span>
                    <span className="font-medium">
                      {systemStatusReport.total_users || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      Administradores Activos:
                    </span>
                    <span className="font-medium">
                      {systemStatusReport.active_admins || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      Productos en Sistema:
                    </span>
                    <span className="font-medium">
                      {systemStatusReport.total_products || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      Actividad Admin (últimas 24h):
                    </span>
                    <span className="font-medium">
                      {systemStatusReport.activity_24h || 0} acciones
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => setShowSystemStatusDialog(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

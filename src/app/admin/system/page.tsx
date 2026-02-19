"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Monitor,
  Mail,
  Bell,
  Database,
  Shield,
  RotateCcw,
  Trash2,
  Download,
  Receipt,
  Users,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/hooks/useBranch";
import { BranchSelector } from "@/components/admin/BranchSelector";
import EmailTemplatesManager from "@/components/admin/EmailTemplatesManager";
import NotificationSettings from "@/components/admin/NotificationSettings";
import { useSystemConfig } from "./hooks/useSystemConfig";
import { useSystemHealth } from "./hooks/useSystemHealth";
import { useBackups, BackupResult } from "./hooks/useBackups";
import SystemOverview from "./components/SystemOverview";
import SystemConfig from "./components/SystemConfig";
import SystemHealth from "./components/SystemHealth";
import SystemMaintenance from "./components/SystemMaintenance";
import FormOptionsConfig from "./components/FormOptionsConfig";
import dynamic from "next/dynamic";

const POSBillingSettings = dynamic(
  () => import("./pos-billing-settings/page").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className="p-8 text-center">Cargando...</div>,
  },
);

export default function SystemAdministrationPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const {
    currentBranchId,
    isSuperAdmin,
    branches,
    organizationId,
    currentBranchName,
  } = useBranch();
  const [configScope, setConfigScope] = useState<"global" | "branch">("global");
  const configBranchId =
    configScope === "branch" && currentBranchId ? currentBranchId : null;
  const [activeTab, setActiveTab] = useState(
    tabFromUrl &&
      [
        "overview",
        "config",
        "email",
        "notifications",
        "billing",
        "formularios",
        "health",
        "maintenance",
      ].includes(tabFromUrl)
      ? tabFromUrl
      : "overview",
  );

  useEffect(() => {
    if (
      tabFromUrl &&
      [
        "overview",
        "config",
        "email",
        "notifications",
        "billing",
        "formularios",
        "health",
        "maintenance",
      ].includes(tabFromUrl)
    ) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Dialogs for maintenance results
  const [showSecurityAuditDialog, setShowSecurityAuditDialog] = useState(false);
  const [securityAuditResults, setSecurityAuditResults] = useState<{
    issues: string[];
    issues_count: number;
  } | null>(null);
  const [showSystemStatusDialog, setShowSystemStatusDialog] = useState(false);
  const [systemStatusReport, setSystemStatusReport] = useState<any>(null);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);

  // Backup restoration states
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<any | null>(null);
  const [showRestoreResultsDialog, setShowRestoreResultsDialog] =
    useState(false);
  const [restoreResults, setRestoreResults] = useState<any | null>(null);
  const [showDeleteBackupDialog, setShowDeleteBackupDialog] = useState(false);

  // Hooks with React Query
  const {
    configs,
    isLoading: configsLoading,
    updateConfig,
    isUpdating,
  } = useSystemConfig({ branchId: configBranchId });

  const {
    healthMetrics,
    healthStatus,
    isLoading: healthLoading,
    refreshHealth,
    clearMemory,
    refreshing,
    clearingMemory,
  } = useSystemHealth();

  const {
    backups,
    isLoading: backupsLoading,
    refetch: refetchBackups,
    createBackup,
    restoreBackup: restoreBackupMutation,
    deleteBackup: deleteBackupMutation,
    getBackupDetails,
    isRestoring,
    isDeleting,
  } = useBackups();

  // Maintenance action handler
  const handleMaintenanceAction = async (action: string) => {
    try {
      const body: { action: string; branch_id?: string } = { action };
      if (
        (action === "backup_database" || action === "system_status") &&
        currentBranchId
      ) {
        body.branch_id = currentBranchId;
      }
      const response = await fetch("/api/admin/system/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Error al ejecutar acción de mantenimiento",
        );
      }

      const data = await response.json();
      toast.success(data.message || "Acción de mantenimiento completada");

      // Show detailed results for specific actions
      if (action === "security_audit" && data.issues) {
        setSecurityAuditResults({
          issues: data.issues || [],
          issues_count: data.issues_count || 0,
        });
        setShowSecurityAuditDialog(true);
      } else if (action === "system_status" && data.report) {
        setSystemStatusReport(data.report);
        setShowSystemStatusDialog(true);
      } else if (action === "backup_database" && data.backup_id) {
        const result: BackupResult = {
          backup_id: data.backup_id,
          backup_file: data.backup_file,
          download_url: data.download_url || null,
          download_url_expires_at: data.download_url_expires_at || null,
          tables_count: data.tables_count || 0,
          total_records: data.total_records || 0,
          backup_size_mb: data.backup_size_mb || "0",
          duration_seconds: data.duration_seconds || "0",
        };
        setBackupResult(result);
        setShowBackupDialog(true);
      }

      // Refresh system data after maintenance
      refreshHealth();
      refetchBackups();
    } catch (error) {
      console.error("Error executing maintenance action:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al ejecutar acción de mantenimiento",
      );
    }
  };

  // Backup handlers
  const handleCreateBackup = async () => {
    try {
      const result = await createBackup();
      setBackupResult(result);
      setShowBackupDialog(true);
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleViewBackupDetails = async (backup: any) => {
    try {
      const result = await getBackupDetails(backup);
      setBackupResult(result);
      setShowBackupDialog(true);
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleRestoreBackup = async (backup: any) => {
    setSelectedBackup(backup);
    setShowRestoreDialog(true);
  };

  const confirmRestoreBackup = async () => {
    if (!selectedBackup) return;

    try {
      setShowRestoreDialog(false);
      const result = await restoreBackupMutation(selectedBackup);
      setRestoreResults(result);
      setShowRestoreResultsDialog(true);
      setSelectedBackup(null);
    } catch (error) {
      // Error already handled in hook
      setSelectedBackup(null);
    }
  };

  const handleDeleteBackup = async (backup: any) => {
    setSelectedBackup(backup);
    setShowDeleteBackupDialog(true);
  };

  const confirmDeleteBackup = async () => {
    if (!selectedBackup) return;

    try {
      await deleteBackupMutation(selectedBackup);
      setShowDeleteBackupDialog(false);
      setSelectedBackup(null);
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleDownloadBackup = (downloadUrl: string, fileName: string) => {
    if (!downloadUrl) {
      toast.error("URL de descarga no disponible");
      return;
    }

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Descarga iniciada");
  };

  const getHealthStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string; icon: any }> = {
      healthy: { variant: "default", label: "Saludable", icon: CheckCircle },
      warning: {
        variant: "secondary",
        label: "Advertencias",
        icon: AlertTriangle,
      },
      critical: { variant: "destructive", label: "Crítico", icon: XCircle },
    };

    const statusConfig = config[status] || config["healthy"];
    const Icon = statusConfig.icon;

    return (
      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  const loading = configsLoading || healthLoading;
  const error = null; // Errors are handled in hooks

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-azul-profundo">
              Administración del Sistema
            </h1>
            <p className="text-tierra-media">
              Cargando configuración del sistema...
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-azul-profundo">
              Administración del Sistema
            </h1>
            <p className="text-tierra-media">Error al cargar los datos</p>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-16">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Error al cargar sistema
            </h3>
            <p className="text-tierra-media mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1
            className="text-3xl font-bold text-azul-profundo"
            data-tour="system-header"
          >
            Administración del Sistema
          </h1>
          <p className="text-tierra-media">
            Configuración, monitoreo y mantenimiento del sistema de gestión
            óptica
          </p>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => refreshHealth()}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Actualizar Estado
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-tierra-media">Estado del Sistema</p>
                {healthStatus && getHealthStatusBadge(healthStatus.status)}
              </div>
              <Monitor className="h-8 w-8 text-azul-profundo" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm text-tierra-media">Advertencias</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {healthStatus?.warnings || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm text-tierra-media">Críticos</p>
                <p className="text-2xl font-bold text-red-600">
                  {healthStatus?.criticals || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-verde-suave" />
              <div className="ml-4">
                <p className="text-sm text-tierra-media">Última Verificación</p>
                <p className="text-sm font-medium text-verde-suave">
                  {healthStatus?.last_check
                    ? new Date(healthStatus.last_check).toLocaleTimeString(
                        "es-AR",
                      )
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="flex w-full justify-between gap-1 h-auto">
          <TabsTrigger value="overview" className="flex-1">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="config" className="flex-1">
            Configuración
          </TabsTrigger>
          <TabsTrigger value="email" className="flex-1">
            <Mail className="h-4 w-4 mr-1" />
            Email
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1">
            <Bell className="h-4 w-4 mr-1" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex-1">
            <Receipt className="h-4 w-4 mr-1" />
            Boletas y Facturas
          </TabsTrigger>
          <TabsTrigger value="formularios" className="flex-1">
            <FileText className="h-4 w-4 mr-1" />
            Formularios
          </TabsTrigger>
          <TabsTrigger value="health" className="flex-1">
            Salud
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex-1">
            Mantenimiento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SystemOverview
            healthStatus={healthStatus}
            onTabChange={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <SystemConfig
            configs={configs}
            onUpdateConfig={updateConfig}
            isUpdating={isUpdating}
            configScope={configScope}
            onConfigScopeChange={setConfigScope}
            currentBranchId={currentBranchId}
            hasMultipleBranches={(branches?.length ?? 0) > 1}
          />
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <EmailTemplatesManager />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings
            branchId={configScope === "branch" ? currentBranchId : null}
            organizationId={organizationId ?? undefined}
            branchName={
              configScope === "branch" ? currentBranchName : undefined
            }
            configScope={configScope}
            onConfigScopeChange={setConfigScope}
            hasMultipleBranches={(branches?.length ?? 0) > 1}
          />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <POSBillingSettings />
        </TabsContent>

        <TabsContent value="formularios" className="space-y-6">
          <FormOptionsConfig />
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <SystemHealth
            healthMetrics={healthMetrics}
            healthStatus={healthStatus}
            onRefresh={refreshHealth}
            onClearMemory={clearMemory}
            refreshing={refreshing}
            clearingMemory={clearingMemory}
          />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <SystemMaintenance
            onMaintenanceAction={handleMaintenanceAction}
            maintenanceLoading={false}
            currentAction={null}
            backups={backups}
            loadingBackups={backupsLoading}
            onRefreshBackups={refetchBackups}
            onCreateBackup={handleCreateBackup}
            onRestoreBackup={handleRestoreBackup}
            onDeleteBackup={handleDeleteBackup}
            onViewBackupDetails={handleViewBackupDetails}
            restoringBackup={isRestoring}
            deletingBackup={isDeleting}
          />
        </TabsContent>
      </Tabs>

      {/* Security Audit Results Dialog */}
      <Dialog
        open={showSecurityAuditDialog}
        onOpenChange={setShowSecurityAuditDialog}
      >
        <DialogContent className="max-w-2xl">
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
                        key={index}
                        className="text-sm text-tierra-media pl-2"
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

      {/* System Status Report Dialog */}
      <Dialog
        open={showSystemStatusDialog}
        onOpenChange={setShowSystemStatusDialog}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
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
                      <Monitor className="h-4 w-4 text-azul-profundo" />
                      <span className="text-xs text-tierra-media">
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
                      <Shield className="h-4 w-4 text-verde-suave" />
                      <span className="text-xs text-tierra-media">
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
                      <span className="text-xs text-tierra-media">
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
                      <span className="text-xs text-tierra-media">
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
                        <Receipt className="h-4 w-4 text-azul-profundo" />
                        <span className="text-xs text-tierra-media">
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
                        <Users className="h-4 w-4 text-verde-suave" />
                        <span className="text-xs text-tierra-media">
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
                      <span className="text-tierra-media">
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
                      <span className="text-tierra-media">
                        Usuarios Registrados:
                      </span>
                      <span className="font-medium">
                        {systemStatusReport.total_users || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">
                        Administradores Activos:
                      </span>
                      <span className="font-medium">
                        {systemStatusReport.active_admins || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">
                        Productos en Sistema:
                      </span>
                      <span className="font-medium">
                        {systemStatusReport.total_products || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">
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

      {/* Backup Results Dialog */}
      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {backupResult?.duration_seconds &&
              backupResult.duration_seconds !== "N/A"
                ? "Backup de Base de Datos Completado"
                : "Detalles del Backup"}
            </DialogTitle>
            <DialogDescription>
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
              <Card className="bg-admin-bg-tertiary">
                <CardContent className="p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-tierra-media">ID del Backup:</span>
                      <span className="font-mono text-xs">
                        {backupResult.backup_id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">Archivo:</span>
                      <span className="font-medium">
                        {backupResult.backup_file}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">
                        Tablas respaldadas:
                      </span>
                      <span className="font-medium">
                        {backupResult.tables_count}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">
                        Total de registros:
                      </span>
                      <span className="font-medium">
                        {backupResult.total_records.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">Tamaño:</span>
                      <span className="font-medium">
                        {backupResult.backup_size_mb} MB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">
                        Tiempo de ejecución:
                      </span>
                      <span className="font-medium">
                        {backupResult.duration_seconds}s
                      </span>
                    </div>
                    {backupResult.download_url_expires_at && (
                      <div className="flex justify-between">
                        <span className="text-tierra-media">URL expira:</span>
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
                    onClick={() =>
                      handleDownloadBackup(
                        backupResult.download_url!,
                        backupResult.backup_file,
                      )
                    }
                    className="w-full"
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBackupDialog(false)}
            >
              Cerrar
            </Button>
            {backupResult?.download_url && (
              <Button
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

      {/* Restore Backup Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="max-w-2xl">
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

          {selectedBackup && (
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
                      <span className="text-tierra-media">ID del Backup:</span>
                      <span className="font-mono text-xs">
                        {selectedBackup.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">Archivo:</span>
                      <span className="font-medium">
                        {selectedBackup.filename}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">Tamaño:</span>
                      <span className="font-medium">
                        {selectedBackup.size_mb} MB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">
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
              onClick={() => setShowRestoreDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRestoreBackup}
              disabled={isRestoring}
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

      {/* Restore Results Dialog */}
      <Dialog
        open={showRestoreResultsDialog}
        onOpenChange={setShowRestoreResultsDialog}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
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
                      <span className="text-tierra-media">
                        Backup restaurado:
                      </span>
                      <span className="font-medium">
                        {restoreResults.backup_file}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">Backup ID:</span>
                      <span className="font-mono text-xs">
                        {restoreResults.backup_id}
                      </span>
                    </div>
                    {restoreResults.safety_backup_id && (
                      <div className="flex justify-between">
                        <span className="text-tierra-media">
                          Backup de seguridad creado:
                        </span>
                        <span className="font-mono text-xs">
                          {restoreResults.safety_backup_id}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-tierra-media">
                        Tablas restauradas:
                      </span>
                      <span className="font-medium">
                        {restoreResults.tables_restored}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">
                        Total de registros:
                      </span>
                      <span className="font-medium">
                        {restoreResults.total_records_restored.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">
                        Tiempo de ejecución:
                      </span>
                      <span className="font-medium">
                        {restoreResults.duration_seconds}s
                      </span>
                    </div>
                    {restoreResults.errors > 0 && (
                      <div className="flex justify-between">
                        <span className="text-tierra-media">Errores:</span>
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
                        ([tableName, result]: [string, any]) => (
                          <div
                            key={tableName}
                            className={`p-3 rounded-lg border ${
                              result.status === "success"
                                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                : result.status === "error"
                                  ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                  : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                            }`}
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
                              <div className="text-xs text-tierra-media">
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
                                  <span className="text-tierra-media">
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

      {/* Delete Backup Confirmation Dialog */}
      <Dialog
        open={showDeleteBackupDialog}
        onOpenChange={setShowDeleteBackupDialog}
      >
        <DialogContent className="max-w-lg">
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
                      <span className="text-tierra-media">ID del Backup:</span>
                      <span className="font-mono text-xs">
                        {selectedBackup.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">Archivo:</span>
                      <span className="font-medium">
                        {selectedBackup.filename}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">Tamaño:</span>
                      <span className="font-medium">
                        {selectedBackup.size_mb} MB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tierra-media">
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
              variant="destructive"
              onClick={confirmDeleteBackup}
              disabled={isDeleting}
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
    </div>
  );
}

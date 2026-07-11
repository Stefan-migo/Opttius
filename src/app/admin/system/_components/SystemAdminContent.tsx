"use client";

import {
  AlertTriangle,
  Bell,
  CheckCircle,
  FileText,
  Mail,
  MessageCircle,
  Receipt,
  RefreshCw,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import EmailConfigCard from "@/components/admin/EmailConfigCard";
import EmailTemplatesManager from "@/components/admin/EmailTemplatesManager";
import NotificationSettings from "@/components/admin/NotificationSettings";
import SurveysConfig from "@/components/admin/SurveysConfig";
import WhatsAppSettingsCard from "@/components/admin/WhatsAppSettingsCard";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/hooks/useBranch";

import { SecurityAuditDialog } from "./_dialogs/SecurityAuditDialog";
import { SystemStatusDialog } from "./_dialogs/SystemStatusDialog";
import { BackupDialog } from "./_dialogs/BackupDialog";
import { RestoreDialog } from "./_dialogs/RestoreDialog";
import { SystemHeader } from "./SystemHeader";
import { SystemHealthCards } from "./SystemHealthCards";
import FormOptionsConfig from "../components/FormOptionsConfig";
import SystemConfig from "../components/SystemConfig";
import SystemHealth from "../components/SystemHealth";
import SystemMaintenance from "../components/SystemMaintenance";
import SystemOverview from "../components/SystemOverview";
import { BackupResult, useBackups } from "../hooks/useBackups";
import { useSystemConfig } from "../hooks/useSystemConfig";
import { useSystemHealth } from "../hooks/useSystemHealth";

const POSBillingSettings = dynamic(
  () => import("../pos-billing-settings/page").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className="p-8 text-center">Cargando...</div>,
  },
);

export default function SystemAdminContent() {
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
  const validTabs = [
    "overview",
    "config",
    "email",
    "notifications",
    "billing",
    "formularios",
    "whatsapp",
    "encuestas",
    "health",
    "maintenance",
  ];
  const [activeTab, setActiveTab] = useState(
    tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : "overview",
  );

  useEffect(() => {
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
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
  const [systemStatusReport, setSystemStatusReport] = useState<unknown>(null);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);

  // Backup restoration states
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<unknown | null>(null);
  const [showRestoreResultsDialog, setShowRestoreResultsDialog] =
    useState(false);
  const [restoreResults, setRestoreResults] = useState<unknown | null>(null);
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

  const handleViewBackupDetails = async (backup: unknown) => {
    try {
      const result = await getBackupDetails(backup);
      setBackupResult(result);
      setShowBackupDialog(true);
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleRestoreBackup = async (backup: unknown) => {
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

  const handleDeleteBackup = async (backup: unknown) => {
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

  const loading = configsLoading || healthLoading;
  const error = null; // Errors are handled in hooks

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-epoch-background min-h-screen">
        <div className="flex flex-col gap-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-epoch-primary">
            Administración del Sistema
          </h1>
          <p className="text-sm text-epoch-primary/80">
            Cargando configuración del sistema...
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card
              className="rounded-xl border border-border animate-pulse"
              key={i}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="h-3 bg-epoch-primary/10 rounded w-3/4 mb-2" />
                <div className="h-6 bg-epoch-primary/10 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-epoch-background min-h-screen">
        <div className="flex flex-col gap-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-epoch-primary">
            Administración del Sistema
          </h1>
          <p className="text-sm text-epoch-primary/80">
            Error al cargar los datos
          </p>
        </div>
        <Card className="rounded-xl border border-border">
          <CardContent className="text-center py-8 sm:py-16">
            <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-red-700 mb-2">
              Error al cargar sistema
            </h3>
            <p className="text-sm text-epoch-primary/80 mb-4">{error}</p>
            <Button
              className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white min-h-[44px]"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-epoch-background min-h-screen">
      <SystemHeader refreshing={refreshing} onRefresh={refreshHealth} />

      <SystemHealthCards healthStatus={healthStatus} />

      {/* Main Content Tabs - scroll horizontal para móvil */}
      <Tabs
        className="space-y-4 sm:space-y-6"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="flex w-full justify-start md:justify-center gap-1 sm:gap-2 h-auto p-1 overflow-x-auto overflow-y-hidden min-w-0 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-epoch-primary/30 rounded-xl border border-epoch-primary/10 bg-epoch-background/50">
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="overview"
          >
            Resumen
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="config"
          >
            Configuración
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="email"
          >
            <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 shrink-0" />
            Email
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="notifications"
          >
            <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 shrink-0" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="billing"
          >
            <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 shrink-0" />
            Boletas
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="formularios"
          >
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 shrink-0" />
            Formularios
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="whatsapp"
          >
            <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 shrink-0" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="encuestas"
          >
            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 shrink-0" />
            Encuestas
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="health"
          >
            Salud
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="maintenance"
          >
            Mantenimiento
          </TabsTrigger>
        </TabsList>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="overview"
        >
          <SystemOverview
            healthStatus={healthStatus}
            onTabChange={setActiveTab}
          />
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="config"
        >
          <SystemConfig
            configs={configs}
            configScope={configScope}
            currentBranchId={currentBranchId}
            hasMultipleBranches={(branches?.length ?? 0) > 1}
            isUpdating={isUpdating}
            onConfigScopeChange={setConfigScope}
            onUpdateConfig={updateConfig}
          />
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="email"
        >
          <EmailTemplatesManager organizationId={organizationId ?? undefined} />
          <EmailConfigCard configs={configs} />
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="notifications"
        >
          <p className="text-xs sm:text-sm text-epoch-primary/80">
            Para ver qué emails se envían automáticamente a los clientes,
            consulta la pestaña{" "}
            <button
              className="text-epoch-accent font-medium hover:underline"
              type="button"
              onClick={() => setActiveTab("email")}
            >
              Email
            </button>
            .
          </p>
          <NotificationSettings
            branchId={configScope === "branch" ? currentBranchId : null}
            branchName={
              configScope === "branch" ? currentBranchName : undefined
            }
            configScope={configScope}
            hasMultipleBranches={(branches?.length ?? 0) > 1}
            organizationId={organizationId ?? undefined}
            onConfigScopeChange={setConfigScope}
          />
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="billing"
        >
          <POSBillingSettings />
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="formularios"
        >
          <FormOptionsConfig />
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="whatsapp"
        >
          <WhatsAppSettingsCard />
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="encuestas"
        >
          <SurveysConfig />
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="health"
        >
          <SystemHealth
            clearingMemory={clearingMemory}
            healthMetrics={healthMetrics}
            healthStatus={healthStatus}
            refreshing={refreshing}
            onClearMemory={clearMemory}
            onRefresh={refreshHealth}
          />
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="maintenance"
        >
          <SystemMaintenance
            backups={backups}
            currentAction={null}
            deletingBackup={isDeleting}
            loadingBackups={backupsLoading}
            maintenanceLoading={false}
            restoringBackup={isRestoring}
            onCreateBackup={handleCreateBackup}
            onDeleteBackup={handleDeleteBackup}
            onMaintenanceAction={handleMaintenanceAction}
            onRefreshBackups={refetchBackups}
            onRestoreBackup={handleRestoreBackup}
            onViewBackupDetails={handleViewBackupDetails}
          />
        </TabsContent>
      </Tabs>


      <SecurityAuditDialog
        showSecurityAuditDialog={showSecurityAuditDialog}
        setShowSecurityAuditDialog={setShowSecurityAuditDialog}
        securityAuditResults={securityAuditResults}
      />

      <SystemStatusDialog
        showSystemStatusDialog={showSystemStatusDialog}
        setShowSystemStatusDialog={setShowSystemStatusDialog}
        systemStatusReport={systemStatusReport}
      />

      <BackupDialog
        showBackupDialog={showBackupDialog}
        setShowBackupDialog={setShowBackupDialog}
        backupResult={backupResult}
        handleDownloadBackup={handleDownloadBackup}
      />

      <RestoreDialog
        showRestoreDialog={showRestoreDialog}
        setShowRestoreDialog={setShowRestoreDialog}
        selectedBackup={selectedBackup}
        confirmRestoreBackup={confirmRestoreBackup}
        isRestoring={isRestoring}
      />
      {/* Restore Results Dialog */}
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

      {/* Delete Backup Confirmation Dialog */}
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
    </div>
  );
}

"use client";

import {
  AlertTriangle,
  Bell,
  FileText,
  Mail,
  MessageCircle,
  Receipt,
  Star,
} from "lucide-react";
import dynamic from "next/dynamic";

import EmailConfigCard from "@/components/admin/EmailConfigCard";
import EmailTemplatesManager from "@/components/admin/EmailTemplatesManager";
import NotificationSettings from "@/components/admin/NotificationSettings";
import SurveysConfig from "@/components/admin/SurveysConfig";
import WhatsAppSettingsCard from "@/components/admin/WhatsAppSettingsCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import FormOptionsConfig from "../components/FormOptionsConfig";
import SystemConfig from "../components/SystemConfig";
import SystemHealth from "../components/SystemHealth";
import SystemMaintenance from "../components/SystemMaintenance";
import SystemOverview from "../components/SystemOverview";
import { BackupDialog } from "./_dialogs/BackupDialog";
import { DeleteBackupDialog } from "./_dialogs/DeleteBackupDialog";
import { RestoreDialog } from "./_dialogs/RestoreDialog";
import { RestoreResultsDialog } from "./_dialogs/RestoreResultsDialog";
import { SecurityAuditDialog } from "./_dialogs/SecurityAuditDialog";
import { SystemStatusDialog } from "./_dialogs/SystemStatusDialog";
import { SystemHeader } from "./SystemHeader";
import { SystemHealthCards } from "./SystemHealthCards";
import { useSystemAdmin } from "./useSystemAdmin";

const POSBillingSettings = dynamic(
  () => import("../pos-billing-settings/page").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className="p-8 text-center">Cargando...</div>,
  },
);

export default function SystemAdminContent() {
  const {
    configScope,
    setConfigScope,
    activeTab,
    setActiveTab,
    currentBranchId,
    branches,
    organizationId,
    currentBranchName,
    configs,
    updateConfig,
    isUpdating,
    healthMetrics,
    healthStatus,
    refreshHealth,
    clearMemory,
    refreshing,
    clearingMemory,
    backups,
    backupsLoading,
    refetchBackups,
    showSecurityAuditDialog,
    setShowSecurityAuditDialog,
    securityAuditResults,
    showSystemStatusDialog,
    setShowSystemStatusDialog,
    systemStatusReport,
    showBackupDialog,
    setShowBackupDialog,
    backupResult,
    showRestoreDialog,
    setShowRestoreDialog,
    selectedBackup,
    confirmRestoreBackup,
    isRestoring,
    showRestoreResultsDialog,
    setShowRestoreResultsDialog,
    restoreResults,
    showDeleteBackupDialog,
    setShowDeleteBackupDialog,
    isDeleting,
    handleMaintenanceAction,
    handleCreateBackup,
    handleViewBackupDetails,
    handleRestoreBackup,
    handleDeleteBackup,
    confirmDeleteBackup,
    handleDownloadBackup,
  } = useSystemAdmin();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <SystemHeader
        configScope={configScope}
        hasMultipleBranches={(branches?.length ?? 0) > 1}
        onConfigScopeChange={setConfigScope}
      />

      <SystemHealthCards
        healthMetrics={healthMetrics}
        healthStatus={healthStatus}
      />

      <Tabs className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 sm:gap-2">
          <TabsTrigger
            className="flex items-center gap-1 sm:gap-2"
            value="overview"
          >
            <Star className="h-4 w-4" /> Resumen
          </TabsTrigger>
          <TabsTrigger
            className="flex items-center gap-1 sm:gap-2"
            value="config"
          >
            <AlertTriangle className="h-4 w-4" /> Configuración
          </TabsTrigger>
          <TabsTrigger
            className="flex items-center gap-1 sm:gap-2"
            value="email"
          >
            <Mail className="h-4 w-4" /> Email
          </TabsTrigger>
          <TabsTrigger
            className="flex items-center gap-1 sm:gap-2"
            value="notifications"
          >
            <Bell className="h-4 w-4" /> Notificaciones
          </TabsTrigger>
          <TabsTrigger
            className="flex items-center gap-1 sm:gap-2"
            value="billing"
          >
            <Receipt className="h-4 w-4" /> Facturación POS
          </TabsTrigger>
          <TabsTrigger
            className="flex items-center gap-1 sm:gap-2"
            value="formularios"
          >
            <FileText className="h-4 w-4" /> Formularios
          </TabsTrigger>
          <TabsTrigger
            className="flex items-center gap-1 sm:gap-2"
            value="whatsapp"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger
            className="flex items-center gap-1 sm:gap-2"
            value="encuestas"
          >
            <Star className="h-4 w-4" /> Encuestas
          </TabsTrigger>
          <TabsTrigger
            className="flex items-center gap-1 sm:gap-2"
            value="health"
          >
            Salud del Sistema
          </TabsTrigger>
          <TabsTrigger
            className="flex items-center gap-1 sm:gap-2"
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
        securityAuditResults={securityAuditResults}
        setShowSecurityAuditDialog={setShowSecurityAuditDialog}
        showSecurityAuditDialog={showSecurityAuditDialog}
      />
      <SystemStatusDialog
        setShowSystemStatusDialog={setShowSystemStatusDialog}
        showSystemStatusDialog={showSystemStatusDialog}
        systemStatusReport={systemStatusReport}
      />
      <BackupDialog
        backupResult={backupResult}
        handleDownloadBackup={handleDownloadBackup}
        setShowBackupDialog={setShowBackupDialog}
        showBackupDialog={showBackupDialog}
      />
      <RestoreDialog
        confirmRestoreBackup={confirmRestoreBackup}
        isRestoring={isRestoring}
        selectedBackup={selectedBackup}
        setShowRestoreDialog={setShowRestoreDialog}
        showRestoreDialog={showRestoreDialog}
      />
      <RestoreResultsDialog
        restoreResults={restoreResults}
        setShowRestoreResultsDialog={setShowRestoreResultsDialog}
        showRestoreResultsDialog={showRestoreResultsDialog}
      />
      <DeleteBackupDialog
        confirmDeleteBackup={confirmDeleteBackup}
        isDeleting={isDeleting}
        selectedBackup={selectedBackup}
        setShowDeleteBackupDialog={setShowDeleteBackupDialog}
        showDeleteBackupDialog={showDeleteBackupDialog}
      />
    </div>
  );
}

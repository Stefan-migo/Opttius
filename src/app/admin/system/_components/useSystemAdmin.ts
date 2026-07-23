"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useBranch } from "@/hooks/useBranch";

import { BackupResult, useBackups } from "../hooks/useBackups";
import { useSystemConfig } from "../hooks/useSystemConfig";
import { useSystemHealth } from "../hooks/useSystemHealth";

export function useSystemAdmin() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const {
    currentBranchId,
    isSuperAdmin,
    branches,
    organizationId,
    currentBranchName,
  } = useBranch();

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

  const [configScope, setConfigScope] = useState<"global" | "branch">("global");
  const [activeTab, setActiveTab] = useState(
    tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : "overview",
  );

  useEffect(() => {
    if (tabFromUrl && validTabs.includes(tabFromUrl)) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const configBranchId =
    configScope === "branch" && currentBranchId ? currentBranchId : null;

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

  const [showSecurityAuditDialog, setShowSecurityAuditDialog] = useState(false);
  const [securityAuditResults, setSecurityAuditResults] = useState<{
    issues: string[];
    issues_count: number;
  } | null>(null);
  const [showSystemStatusDialog, setShowSystemStatusDialog] = useState(false);
  const [systemStatusReport, setSystemStatusReport] = useState<unknown>(null);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<unknown | null>(null);
  const [showRestoreResultsDialog, setShowRestoreResultsDialog] =
    useState(false);
  const [restoreResults, setRestoreResults] = useState<unknown | null>(null);
  const [showDeleteBackupDialog, setShowDeleteBackupDialog] = useState(false);

  const handleMaintenanceAction = async (action: string) => {
    try {
      const body: { action: string; branch_id?: string } = { action };
      if (
        (action === "backup_database" || action === "system_status") &&
        currentBranchId
      )
        body.branch_id = currentBranchId;
      const response = await fetch("/api/admin/system/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok)
        throw new Error(
          (await response.json()).error || "Error al ejecutar acción",
        );
      const data = await response.json();
      toast.success(data.message || "Acción completada");

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
        setBackupResult({
          backup_id: data.backup_id,
          backup_file: data.backup_file,
          download_url: data.download_url || null,
          download_url_expires_at: data.download_url_expires_at || null,
          tables_count: data.tables_count || 0,
          total_records: data.total_records || 0,
          backup_size_mb: data.backup_size_mb || "0",
          duration_seconds: data.duration_seconds || "0",
        });
        setShowBackupDialog(true);
      }
      refreshHealth();
      refetchBackups();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al ejecutar acción",
      );
    }
  };

  const handleCreateBackup = async () => {
    try {
      const result = await createBackup();
      setBackupResult(result as BackupResult);
      setShowBackupDialog(true);
    } catch {
      /* handled */
    }
  };
  const handleViewBackupDetails = async (backup: unknown) => {
    try {
      const result = await getBackupDetails(backup);
      setBackupResult(result as BackupResult);
      setShowBackupDialog(true);
    } catch {
      /* handled */
    }
  };
  const handleRestoreBackup = (backup: unknown) => {
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
    } catch {
      setSelectedBackup(null);
    }
  };
  const handleDeleteBackup = (backup: unknown) => {
    setSelectedBackup(backup);
    setShowDeleteBackupDialog(true);
  };
  const confirmDeleteBackup = async () => {
    if (!selectedBackup) return;
    try {
      await deleteBackupMutation(selectedBackup);
      setShowDeleteBackupDialog(false);
      setSelectedBackup(null);
    } catch {
      /* handled */
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

  return {
    configScope,
    setConfigScope,
    activeTab,
    setActiveTab,
    currentBranchId,
    isSuperAdmin,
    branches,
    organizationId,
    currentBranchName,
    configs,
    configsLoading,
    updateConfig,
    isUpdating,
    healthMetrics,
    healthStatus,
    healthLoading,
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
  };
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Backup {
  id: string;
  filename: string;
  size_mb: number;
  created_at: string;
}

export interface BackupResult {
  backup_id: string;
  backup_file: string;
  download_url: string | null;
  download_url_expires_at: string | null;
  tables_count: number;
  total_records: number;
  backup_size_mb: string;
  duration_seconds: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  tables_restored: number;
  total_records_restored: number;
  duration_seconds: string;
  errors: number;
  restore_results?: Record<string, unknown>;
}

const fetchBackups = async (): Promise<Backup[]> => {
  const response = await fetch("/api/admin/system/backups");
  if (!response.ok) {
    // Silently fail if endpoint doesn't exist (403/404)
    if (response.status === 403 || response.status === 404) {
      return [];
    }
    throw new Error("Error al cargar backups");
  }
  const data = await response.json();
  return data.backups || [];
};

export function useBackups() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["systemBackups"],
    queryFn: fetchBackups,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const createBackupMutation = useMutation({
    mutationFn: async (): Promise<BackupResult> => {
      const response = await fetch("/api/admin/system/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "backup_database" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear backup");
      }

      const data = await response.json();
      return {
        backup_id: data.backup_id,
        backup_file: data.backup_file,
        download_url: data.download_url || null,
        download_url_expires_at: data.download_url_expires_at || null,
        tables_count: data.tables_count || 0,
        total_records: data.total_records || 0,
        backup_size_mb: data.backup_size_mb || "0",
        duration_seconds: data.duration_seconds || "0",
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemBackups"] });
      toast.success("Backup creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear backup");
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async (backup: Backup): Promise<RestoreResult> => {
      const response = await fetch("/api/admin/system/backups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          backup_filename: backup.filename,
          create_safety_backup: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al restaurar backup");
      }

      const data = await response.json();
      toast.success(data.message || "Backup restaurado exitosamente");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemBackups"] });
      queryClient.invalidateQueries({ queryKey: ["systemConfig"] });
      queryClient.invalidateQueries({ queryKey: ["systemHealth"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al restaurar backup");
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (backup: Backup): Promise<void> => {
      const response = await fetch(
        `/api/admin/system/backups?filename=${encodeURIComponent(backup.filename)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al eliminar backup");
      }

      const data = await response.json();
      toast.success(data.message || "Backup eliminado exitosamente");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemBackups"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar backup");
    },
  });

  const getBackupDetailsMutation = useMutation({
    mutationFn: async (backup: Backup): Promise<BackupResult> => {
      const response = await fetch(
        `/api/admin/system/backups?filename=${encodeURIComponent(backup.filename)}&action=details`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Error al cargar detalles del backup",
        );
      }

      const data = await response.json();
      return {
        backup_id: data.backup_id,
        backup_file: data.backup_file,
        download_url: data.download_url || null,
        download_url_expires_at: data.download_url_expires_at || null,
        tables_count: data.tables_count || 0,
        total_records: data.total_records || 0,
        backup_size_mb: data.backup_size_mb || "0",
        duration_seconds: "N/A",
      };
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al cargar detalles del backup");
    },
  });

  return {
    backups: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createBackup: createBackupMutation.mutateAsync,
    restoreBackup: restoreBackupMutation.mutateAsync,
    deleteBackup: deleteBackupMutation.mutateAsync,
    getBackupDetails: getBackupDetailsMutation.mutateAsync,
    isCreating: createBackupMutation.isPending,
    isRestoring: restoreBackupMutation.isPending,
    isDeleting: deleteBackupMutation.isPending,
    isLoadingDetails: getBackupDetailsMutation.isPending,
  };
}

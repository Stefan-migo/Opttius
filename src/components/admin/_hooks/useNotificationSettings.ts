"use client";

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

interface NotificationSetting {
  id: string;
  notification_type: string;
  enabled: boolean;
  priority: string | null;
  notify_all_admins: boolean;
  notify_specific_roles: string[] | null;
  organization_id: string | null;
  branch_id: string | null;
  [key: string]: unknown;
}

interface NotificationSettingsProps {
  branchId?: string | null;
  organizationId?: string | null;
}

export function useNotificationSettings({
  branchId,
  organizationId,
}: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [tableNotFound, setTableNotFound] = useState(false);
  const [migrationSQL, setMigrationSQL] = useState<string | null>(null);
  const [loadingSQL, setLoadingSQL] = useState(false);

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, organizationId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (organizationId) params.set("organization_id", organizationId);
      if (branchId) params.set("branch_id", branchId);
      const url = `/api/admin/notifications/settings${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        if (data.message?.includes("does not exist")) {
          setTableNotFound(true);
          toast.error("La tabla de configuración de notificaciones no existe. Por favor, ejecuta la migración de base de datos.", { duration: 8000 });
          setSettings([]);
          return;
        }
        throw new Error(data.error || "Error al cargar configuración");
      }
      setTableNotFound(false);
      setSettings(data.settings || []);
      setHasChanges(false);
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      toast.error("Error al cargar la configuración de notificaciones");
      setSettings([]);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = useCallback((type: string, field: string, value: unknown) => {
    setSettings((prev) => {
      const updated = prev.map((setting) => {
        if (setting.notification_type === type) {
          return { ...setting, [field]: value };
        }
        return setting;
      });
      setHasChanges(true);
      return updated;
    });
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      const updates = settings.map((s) => ({
        notification_type: s.notification_type,
        enabled: s.enabled,
        priority: s.priority,
        notify_all_admins: s.notify_all_admins,
        notify_specific_roles: s.notify_specific_roles,
      }));

      const response = await fetch("/api/admin/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates, organization_id: organizationId, branch_id: branchId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar");
      }

      toast.success("Configuración guardada exitosamente");
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast.error("Error al guardar la configuración de notificaciones");
    } finally {
      setSaving(false);
    }
  };

  const toggleAll = useCallback((enabled: boolean) => {
    setSettings((prev) => prev.map((s) => ({ ...s, enabled })));
    setHasChanges(true);
  }, []);

  const fetchMigrationSQL = async () => {
    try {
      setLoadingSQL(true);
      const response = await fetch("/api/admin/system/migrate-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const data = await response.json();
      if (data.success) {
        setMigrationSQL(data.migrationSQL || data.sql || "No SQL generated");
      }
    } catch (err) {
      console.error("Error fetching migration SQL:", err);
    } finally {
      setLoadingSQL(false);
    }
  };

  const copySQLToClipboard = async () => {
    if (migrationSQL) {
      try {
        await navigator.clipboard.writeText(migrationSQL);
        toast.success("SQL copiado al portapapeles");
      } catch {
        toast.error("Error al copiar SQL");
      }
    }
  };

  return {
    settings, loading, saving, hasChanges, tableNotFound,
    migrationSQL, loadingSQL, fetchMigrationSQL, copySQLToClipboard,
    fetchSettings, updateSetting, saveSettings, toggleAll,
    setTableNotFound,
  };
}

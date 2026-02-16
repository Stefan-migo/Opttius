import { useState, useEffect } from "react";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import { useAuthContext } from "@/contexts/AuthContext";

interface ScheduleSettings {
  id: string;
  organization_id: string;
  branch_id: string;
  working_days: string[];
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  default_appointment_duration: number;
  min_advance_booking_hours: number;
  max_advance_booking_days: number;
  created_at: string;
  updated_at: string;
}

interface UseScheduleSettingsReturn {
  settings: ScheduleSettings | null;
  loading: boolean;
  loadSettings: () => Promise<void>;
  getMinDate: () => string;
  getMaxDate: () => string;
}

export function useScheduleSettings(): UseScheduleSettingsReturn {
  const { user, loading: authLoading } = useAuthContext();
  const { currentBranchId } = useBranch();
  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSettings = async () => {
    if (!user || authLoading) return;

    setLoading(true);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...getBranchHeader(currentBranchId),
      };

      const response = await fetch("/api/admin/schedule-settings", { headers });
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data ?? data.settings);
      }
    } catch (error) {
      console.error("Error fetching schedule settings:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load schedule settings when branch or auth changes
  useEffect(() => {
    if (!authLoading && user) {
      loadSettings();
    }
  }, [currentBranchId, authLoading, user]);

  const getMinDate = (): string => {
    if (!settings) return new Date().toISOString().split("T")[0];
    const minHours = settings.min_advance_booking_hours || 2;
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + minHours);
    return minDate.toISOString().split("T")[0];
  };

  const getMaxDate = (): string => {
    if (!settings) {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);
      return maxDate.toISOString().split("T")[0];
    }
    const maxDays = settings.max_advance_booking_days || 90;
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxDays);
    return maxDate.toISOString().split("T")[0];
  };

  return {
    settings,
    loading,
    loadSettings,
    getMinDate,
    getMaxDate,
  };
}

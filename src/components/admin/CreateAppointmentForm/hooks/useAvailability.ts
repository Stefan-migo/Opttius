import { useState } from "react";
import { toast } from "sonner";

import { useBranch } from "@/hooks/useBranch";
import { appLogger } from '@/lib/logger';
import { getBranchHeader } from "@/lib/utils/branch";

interface TimeSlot {
  time_slot: string;
  available: boolean;
}

interface UseAvailabilityReturn {
  availableSlots: TimeSlot[];
  loading: boolean;
  fetchAvailability: (date: string, duration: number) => Promise<void>;
  isSlotAvailable: (timeSlot: string) => boolean;
  clearSlots: () => void;
}

interface UseAvailabilityProps {
  scheduleSettings: unknown;
  effectiveBranchId?: string | null;
}

export function useAvailability({
  scheduleSettings,
  effectiveBranchId,
}: UseAvailabilityProps): UseAvailabilityReturn {
  const { currentBranchId } = useBranch();
  const branchIdForRequest =
    effectiveBranchId !== undefined ? effectiveBranchId : currentBranchId;
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAvailability = async (date: string, duration: number) => {
    if (!date) {
      appLogger.info("No date selected, clearing availability");
      setAvailableSlots([]);
      return;
    }

    if (!scheduleSettings) {
      appLogger.info(
        "Schedule settings not loaded yet, skipping availability fetch",
      );
      return;
    }

    const selectedDate = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = selectedDate.getTime() === today.getTime();

    appLogger.info("🔍 Fetching availability for:", {
      date,
      duration,
      isToday,
      scheduleSettings: scheduleSettings ? "loaded" : "not loaded",
      minAdvanceHours: scheduleSettings?.min_advance_booking_hours || 0,
    });

    setLoading(true);
    try {
      const params = new URLSearchParams({
        date,
        duration: duration.toString(),
      });

      const headers = {
        "Content-Type": "application/json",
        ...getBranchHeader(branchIdForRequest),
      };

      const response = await fetch(
        `/api/admin/appointments/availability?${params}`,
        { headers },
      );

      if (response.ok) {
        const data = await response.json();
        appLogger.info("✅ Available slots response:", data);
        appLogger.info("📊 Total slots:", data.slots?.length || 0);
        const availableCount =
          data.slots?.filter((s: unknown) => s.available === true).length || 0;
        appLogger.info("📊 Available slots:", availableCount);
        appLogger.info("📋 First few slots:", data.slots?.slice(0, 5));

        if (data.slots && data.slots.length > 0) {
          appLogger.info(
            "✅ Setting available slots:",
            data.slots.length,
            "total,",
            availableCount,
            "available",
          );
          setAvailableSlots(data.slots);
        } else {
          appLogger.warn("⚠️ No slots returned from API - empty array");
          setAvailableSlots([]);
        }
      } else {
        const errorData = await response.json();
        appLogger.error("Error fetching availability:", errorData);
        toast.error(errorData.error || "Error al cargar disponibilidad");
        setAvailableSlots([]);
      }
    } catch (error) {
      appLogger.error("Error fetching availability:", error);
      toast.error("Error al cargar disponibilidad");
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const isSlotAvailable = (timeSlot: string) => {
    const slot = availableSlots.find((s) => s.time_slot === timeSlot);
    return slot?.available || false;
  };

  const clearSlots = () => {
    setAvailableSlots([]);
  };

  return {
    availableSlots,
    loading,
    fetchAvailability,
    isSlotAvailable,
    clearSlots,
  };
}

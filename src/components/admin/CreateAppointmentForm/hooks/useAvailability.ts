import { useState, useEffect } from "react";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import { toast } from "sonner";

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
  scheduleSettings: any;
}

export function useAvailability({ scheduleSettings }: UseAvailabilityProps): UseAvailabilityReturn {
  const { currentBranchId } = useBranch();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAvailability = async (date: string, duration: number) => {
    if (!date) {
      console.log("No date selected, clearing availability");
      setAvailableSlots([]);
      return;
    }

    if (!scheduleSettings) {
      console.log("Schedule settings not loaded yet, skipping availability fetch");
      return;
    }

    const selectedDate = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = selectedDate.getTime() === today.getTime();

    console.log("🔍 Fetching availability for:", {
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
        ...getBranchHeader(currentBranchId),
      };

      const response = await fetch(
        `/api/admin/appointments/availability?${params}`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Available slots response:", data);
        console.log("📊 Total slots:", data.slots?.length || 0);
        const availableCount =
          data.slots?.filter((s: any) => s.available === true).length || 0;
        console.log("📊 Available slots:", availableCount);
        console.log("📋 First few slots:", data.slots?.slice(0, 5));

        if (data.slots && data.slots.length > 0) {
          console.log(
            "✅ Setting available slots:",
            data.slots.length,
            "total,",
            availableCount,
            "available"
          );
          setAvailableSlots(data.slots);
        } else {
          console.warn("⚠️ No slots returned from API - empty array");
          setAvailableSlots([]);
        }
      } else {
        const errorData = await response.json();
        console.error("Error fetching availability:", errorData);
        toast.error(errorData.error || "Error al cargar disponibilidad");
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
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
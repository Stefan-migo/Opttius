"use client";

import { useEffect, useState } from "react";

import { customerService } from "@/lib/api/services";
import { appLogger } from '@/lib/logger';
import type { Customer, Prescription } from "@/lib/api/services/customerTypes";

export function usePrescriptionSelection(
  selectedCustomer: Customer | null,
  initialPrescriptionId?: string,
) {
  // Prescription selection
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [showCreatePrescription, setShowCreatePrescription] = useState(false);

  // Load prescriptions when customer is selected
  const fetchPrescriptionsAction = async (customerId: string) => {
    try {
      setLoadingPrescriptions(true);
      const result = await customerService.getPrescriptions(customerId);
      setPrescriptions(result);
    } catch (error) {
      appLogger.error("Error fetching prescriptions:", error);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  useEffect(() => {
    if (selectedCustomer?.id) {
      fetchPrescriptionsAction(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  // Load prescription if initialPrescriptionId provided
  useEffect(() => {
    if (initialPrescriptionId && prescriptions.length > 0) {
      const prescription = prescriptions.find(
        (p: unknown) => p.id === initialPrescriptionId,
      );
      if (prescription) setSelectedPrescription(prescription);
    }
  }, [initialPrescriptionId, prescriptions]);

  return {
    prescriptions,
    setPrescriptions,
    selectedPrescription,
    setSelectedPrescription,
    loadingPrescriptions,
    showCreatePrescription,
    setShowCreatePrescription,
    fetchPrescriptions: fetchPrescriptionsAction,
  };
}

"use client";

import { useEffect, useState } from "react";

import { customerService } from "@/lib/api/services";

export function usePrescriptionSelection(
  selectedCustomer: unknown,
  initialPrescriptionId?: string,
) {
  // Prescription selection
  const [prescriptions, setPrescriptions] = useState<unknown[]>([]);
  const [selectedPrescription, setSelectedPrescription] =
    useState<unknown>(null);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [showCreatePrescription, setShowCreatePrescription] = useState(false);

  // Load prescriptions when customer is selected
  const fetchPrescriptionsAction = async (customerId: string) => {
    try {
      setLoadingPrescriptions(true);
      const result = await customerService.getPrescriptions(customerId);
      setPrescriptions(result);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  useEffect(() => {
    if ((selectedCustomer as unknown)?.id) {
      fetchPrescriptionsAction((selectedCustomer as unknown).id);
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

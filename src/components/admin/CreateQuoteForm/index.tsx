"use client";

import { CheckCircle, Loader2, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import CreatePrescriptionForm from "@/components/admin/CreatePrescriptionForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBranch } from "@/hooks/useBranch";
import {
  getDefaultPresbyopiaSolution,
  hasAddition,
  type PresbyopiaSolution,
} from "@/lib/presbyopia-helpers";
import { getBranchHeader } from "@/lib/utils/branch";

// Local imports
import { useFrameSearch, useQuoteForm } from "./hooks";
import { CustomerSelection, PrescriptionSelection } from "./sections";
import {
  CreateQuoteFormProps,
  Customer,
  Prescription,
} from "./types/quote.types";

export default function CreateQuoteForm({
  onSuccess,
  onCancel,
  initialCustomerId,
  initialPrescriptionId,
}: CreateQuoteFormProps) {
  // Branch context
  const { currentBranchId } = useBranch();

  // Form hooks
  const {
    formData,
    loading,
    saving,
    quoteSettings,
    loadingSettings,
    taxPercentage,
    presbyopiaSolution,
    lensType,
    discountType,
    updateField,
    updateFields,
    resetForm,
    setSaving,
    setLoading,
    setPresbyopiaSolution,
    setLensType,
    setDiscountType,
    setTaxPercentage,
    calculateTotals,
  } = useQuoteForm(initialCustomerId, initialPrescriptionId);

  // Search hooks
  const {
    search: frameSearch,
    setSearch: setFrameSearch,
    results: frameResults,
    selected: selectedFrame,
    loading: searchingFrames,
    selectFrame,
    clearFrame,
  } = useFrameSearch();

  // State for customer and prescriptions
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
  const [showCreatePrescription, setShowCreatePrescription] = useState(false);

  // Frame ownership states
  const [customerOwnFrame, setCustomerOwnFrame] = useState<boolean>(false);
  const [customerOwnNearFrame, setCustomerOwnNearFrame] =
    useState<boolean>(false);
  const [manualLensPrice, setManualLensPrice] = useState<boolean>(false);

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedPrescription(null);
  };

  const handleCustomerClear = () => {
    setSelectedCustomer(null);
    setSelectedPrescription(null);
  };

  // Handle prescription selection
  const handlePrescriptionSelect = (prescription: Prescription) => {
    setSelectedPrescription(prescription);

    // Auto-detect presbyopia solution
    const hasAdd = hasAddition(prescription);
    if (hasAdd && presbyopiaSolution === "none") {
      const defaultSolution = getDefaultPresbyopiaSolution(prescription);
      setPresbyopiaSolution(defaultSolution);
      updateField("presbyopia_solution", defaultSolution);

      if (["progressive", "bifocal", "trifocal"].includes(defaultSolution)) {
        updateField("lens_type", defaultSolution);
      }
    } else if (!hasAdd) {
      setPresbyopiaSolution("none");
      updateField("presbyopia_solution", "none");
    }
  };

  const handlePrescriptionClear = () => {
    setSelectedPrescription(null);
  };

  // Handle presbyopia solution change
  const handlePresbyopiaSolutionChange = (solution: string) => {
    const newSolution = solution as PresbyopiaSolution;
    setPresbyopiaSolution(newSolution);
    updateField("presbyopia_solution", newSolution);

    if (["progressive", "bifocal", "trifocal"].includes(newSolution)) {
      updateField("lens_type", newSolution);
    }

    // Reset lens families and second frame when changing solution
    if (newSolution !== "two_separate") {
      updateFields({
        far_lens_family_id: "",
        near_lens_family_id: "",
        far_lens_cost: 0,
        near_lens_cost: 0,
      });
      setCustomerOwnNearFrame(false);
    }
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validation would go here

      // Prepare form data for submission
      const submitData = {
        ...formData,
        customer_id: selectedCustomer?.id,
        prescription_id: selectedPrescription?.id,
        branch_id: currentBranchId,
      };

      const response = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getBranchHeader(currentBranchId),
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error("Failed to create quote");
      }

      const result = await response.json();
      toast.success("Cotización creada exitosamente");
      onSuccess();
    } catch (error) {
      console.error("Error creating quote:", error);
      toast.error("Error al crear la cotización");
    } finally {
      setSaving(false);
    }
  };

  // Render the form
  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Customer Selection Section */}
      <CustomerSelection
        initialCustomerId={initialCustomerId}
        selectedCustomer={selectedCustomer}
        onCustomerClear={handleCustomerClear}
        onCustomerSelect={handleCustomerSelect}
      />

      {/* Prescription Selection Section */}
      {selectedCustomer && (
        <PrescriptionSelection
          customerId={selectedCustomer.id}
          customerName={
            `${selectedCustomer.first_name || ""} ${selectedCustomer.last_name || ""}`.trim() ||
            undefined
          }
          presbyopiaSolution={presbyopiaSolution}
          selectedPrescription={selectedPrescription}
          onCreateNewPrescription={() => setShowCreatePrescription(true)}
          onPresbyopiaSolutionChange={handlePresbyopiaSolutionChange}
          onPrescriptionClear={handlePrescriptionClear}
          onPrescriptionSelect={handlePrescriptionSelect}
        />
      )}

      {/* Frame Selection Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            {presbyopiaSolution === "two_separate"
              ? "Marco para Lejos"
              : "Marco"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Frame selection UI would go here */}
          <div className="text-muted-foreground">
            Frame selection component coming soon...
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          disabled={saving}
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          disabled={saving || !selectedCustomer || !selectedPrescription}
          type="submit"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Crear Cotización
            </>
          )}
        </Button>
      </div>

      {/* Create Prescription Dialog */}
      <Dialog
        open={showCreatePrescription}
        onOpenChange={setShowCreatePrescription}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-7xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle>Crear Nueva Receta</DialogTitle>
            <DialogDescription>
              Ingresa los datos de la nueva receta para el cliente
            </DialogDescription>
          </DialogHeader>
          <CreatePrescriptionForm
            customerId={selectedCustomer?.id || ""}
            onCancel={() => setShowCreatePrescription(false)}
            onSuccess={() => {
              // The prescription will be passed through some other mechanism
              setShowCreatePrescription(false);
              // We'll need to refetch prescriptions or handle this differently
            }}
          />
        </DialogContent>
      </Dialog>
    </form>
  );
}

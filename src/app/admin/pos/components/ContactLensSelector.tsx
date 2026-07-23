/**
 * ContactLensSelector - Selector de Lentes de Contacto para POS
 *
 * Componente simplificado para evitar infinite loops
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

import {
  type ContactLensOrderConfig,
  type ContactLensPrescription,
  useContactLensSelector,
} from "./useContactLensSelector";

export type { ContactLensOrderConfig, ContactLensPrescription };

import { ContactLensEncargoDialog } from "./ContactLensEncargoDialog";
import { ContactLensFamilySelector } from "./ContactLensFamilySelector";
import { ContactLensPrescriptionSection } from "./ContactLensPrescriptionSection";
import { ContactLensPriceStock } from "./ContactLensPriceStock";

// Props del componente
interface ContactLensSelectorProps {
  prescription?: ContactLensPrescription | null;
  branchId: string | null;
  onSelect: (config: ContactLensOrderConfig | null) => void;
  selectedConfig: ContactLensOrderConfig | null;
  // Customer info for encargos
  customer?: {
    id: string;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    rut?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
}

export function ContactLensSelector({
  prescription,
  branchId,
  onSelect,
  selectedConfig,
  customer,
}: ContactLensSelectorProps) {
  const {
    families,
    loadingFamilies,
    selectedFamilyId,
    handleFamilySelect,
    selectedFamily,
    manualPrescription,
    setManualPrescription,
    activePrescription,
    quantity,
    setQuantity,
    stockInfo,
    loadingPrice,
    priceResult,
    showEncargoDialog,
    setShowEncargoDialog,
    submittingEncargo,
    handleCreateEncargo,
    sphereOptions,
    cylinderOptions,
    axisOptions,
  } = useContactLensSelector(prescription, branchId, onSelect, customer);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>Lentes de Contacto</span>
          {selectedConfig && (
            <Badge className="ml-auto" variant="default">
              Configurado
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ContactLensFamilySelector
          families={families}
          loadingFamilies={loadingFamilies}
          selectedFamily={selectedFamily}
          selectedFamilyId={selectedFamilyId}
          onSelect={handleFamilySelect}
        />

        {selectedFamily && (
          <ContactLensPrescriptionSection
            cylinderOptions={cylinderOptions}
            manualPrescription={manualPrescription}
            prescription={prescription}
            sphereOptions={sphereOptions}
            onManualChange={(p) => setManualPrescription(p)}
          />
        )}

        {selectedFamily && (
          <ContactLensPriceStock
            loadingPrice={loadingPrice}
            priceResult={priceResult}
            quantity={quantity}
            stockInfo={stockInfo}
            onQuantityChange={setQuantity}
            onRequestEncargo={() => setShowEncargoDialog(true)}
          />
        )}

        {/* Resumen */}
        {selectedConfig && (
          <div className="mt-4 p-3 border border-primary/20 rounded-lg bg-primary/5">
            <div className="text-sm font-medium mb-2">Resumen:</div>
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Producto:</span>{" "}
                {selectedConfig.family_name}
              </div>
              <div>
                <span className="text-muted-foreground">Cantidad:</span>{" "}
                {selectedConfig.quantity} caja(s)
              </div>
              <div className="font-medium text-primary mt-2">
                Total: {formatCurrency(selectedConfig.price)}
              </div>
            </div>
          </div>
        )}

        <ContactLensEncargoDialog
          family={selectedFamily}
          open={showEncargoDialog}
          quantity={quantity}
          submitting={submittingEncargo}
          onConfirm={handleCreateEncargo}
          onOpenChange={setShowEncargoDialog}
        />
      </CardContent>
    </Card>
  );
}

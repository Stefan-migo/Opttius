export interface CreateQuoteFormLensSectionProps {
  lensType: "optical" | "contact";
  presbyopiaSolution: string;
  formData: {
    lens_family_id: string; lens_type: string; lens_material: string; lens_index: number | null;
    lens_treatments: string[]; lens_tint_color: string; lens_tint_percentage: number;
    lens_sourcing_type: "stock" | "surfaced"; lens_cost: number;
    contact_lens_family_id: string; contact_lens_quantity: number; contact_lens_price: number; contact_lens_cost: number;
    far_lens_family_id: string; near_lens_family_id: string; far_lens_cost: number; near_lens_cost: number; treatments_cost: number;
  };
  lensFamilies: unknown[]; loadingFamilies: boolean;
  contactLensFamilies: unknown[]; loadingContactLensFamilies: boolean;
  farLensFamilyId: string; nearLensFamilyId: string; farLensCost: number; nearLensCost: number;
  selectedPrescription: unknown;
  availableTreatments: { value: string; label: string; cost: number; enabled: boolean }[];
  calculatingPrice: boolean; calculatingContactLensPrice: boolean; manualLensPrice: boolean;
  onLensTypeChange: (v: "optical" | "contact") => void;
  onLensFamilyChange: (v: string) => void;
  onContactLensFamilyChange: (v: string) => void;
  onContactLensQuantityChange: (v: number) => void;
  onContactLensPriceChange: (v: number) => void;
  onFarLensFamilyChange: (v: string) => void;
  onNearLensFamilyChange: (v: string) => void;
  onLensCostChange: (v: number) => void;
  onManualLensPriceToggle: () => void;
  onSourcingTypeChange: (v: "stock" | "surfaced") => void;
  onLensFormDataChange: (field: string, value: any) => void;
  onTreatmentToggle: (treatment: { value: string; label: string; cost: number; enabled: boolean }) => void;
}

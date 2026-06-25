/**
 * CreateQuoteForm — Complete Quote Creation Form
 *
 * Handles optical quote creation with customer, frame, lens, and pricing sections.
 * State managed via useCreateQuoteForm hook; rendering delegated to 4 section components.
 */
"use client";

import type { CreateQuoteFormProps } from "./CreateQuoteForm/CreateQuoteForm.types";
import {
  MATERIAL_INDICES,
  DEFAULT_QUOTE_SETTINGS,
  UUID_REGEX,
  formatPrice,
  roundCurrency,
} from "./CreateQuoteForm/CreateQuoteForm.constants";
import {
  getTreatmentPrice,
  isTreatmentEnabled,
} from "./CreateQuoteForm/quotePricingUtils";
import {
  validateQuoteForm,
  buildNearFramePayload,
  buildQuotePayload,
  submitQuote,
} from "./CreateQuoteForm/quoteSubmitHandler";
import { useCreateQuoteForm } from "./CreateQuoteForm/useCreateQuoteForm";
import { CreateQuoteFormCustomerSection } from "./CreateQuoteForm/CreateQuoteFormCustomerSection";
import { CreateQuoteFormFrameSection } from "./CreateQuoteForm/CreateQuoteFormFrameSection";
import { CreateQuoteFormLensSection } from "./CreateQuoteForm/CreateQuoteFormLensSection";
import { CreateQuoteFormPricingSection } from "./CreateQuoteForm/CreateQuoteFormPricingSection";

export default function CreateQuoteForm(props: CreateQuoteFormProps) {
  const {
    formData,
    selectedCustomer,
    selectedPrescription,
    customerSearch,
    customerResults,
    searchingCustomers,
    prescriptions,
    loadingPrescriptions,
    presbyopiaSolution,
    showCreatePrescription,
    frameSearch,
    frameResults,
    selectedFrame,
    searchingFrames,
    nearFrameSearch,
    nearFrameResults,
    selectedNearFrame,
    searchingNearFrames,
    customerOwnFrame,
    customerOwnNearFrame,
    lensType,
    lensFamilies,
    loadingFamilies,
    contactLensFamilies,
    loadingContactLensFamilies,
    farLensFamilyId,
    nearLensFamilyId,
    farLensCost,
    nearLensCost,
    availableTreatments,
    calculatingPrice,
    calculatingContactLensPrice,
    manualLensPrice,
    discountType,
    saving,
    effectiveBranchId,
    loadingSettings,
    setCustomerSearch,
    setSelectedCustomer,
    setSelectedPrescription,
    setShowCreatePrescription,
    setFrameSearch,
    setSelectedFrame,
    setNearFrameSearch,
    setSelectedNearFrame,
    setCustomerOwnFrame,
    setCustomerOwnNearFrame,
    setManualLensPrice,
    setLensType,
    setPresbyopiaSolution,
    setFarLensFamilyId,
    setNearLensFamilyId,
    setDiscountType,
    setFormData,
    handleTreatmentToggle,
    handleFrameSelect,
    handleNearFrameSelect,
    handleSubmit,
    calculateTotal,
    fetchPrescriptions,
  } = useCreateQuoteForm(props);

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <CreateQuoteFormCustomerSection
        customerSearch={customerSearch}
        customerResults={customerResults}
        selectedCustomer={selectedCustomer}
        searchingCustomers={searchingCustomers}
        prescriptions={prescriptions}
        selectedPrescription={selectedPrescription}
        loadingPrescriptions={loadingPrescriptions}
        presbyopiaSolution={presbyopiaSolution}
        showCreatePrescription={showCreatePrescription}
        loadingSettings={loadingSettings}
        onCustomerSearchChange={setCustomerSearch}
        onCustomerSelect={(c) => {
          setSelectedCustomer(c);
          setCustomerSearch("");
          setCustomerResults([]);
        }}
        onCustomerClear={() => {
          setSelectedCustomer(null);
          setSelectedPrescription(null);
          setPrescriptions([]);
        }}
        onPrescriptionSelect={(p) => {
          setSelectedPrescription(p);
        }}
        onPresbyopiaSolutionChange={(v) => {
          setPresbyopiaSolution(v);
          setFormData((prev) => ({ ...prev, presbyopia_solution: v }));
          if (["progressive", "bifocal", "trifocal"].includes(v)) {
            setFormData((prev) => ({ ...prev, lens_type: v }));
          }
          if (v !== "two_separate") {
            setFarLensFamilyId("");
            setNearLensFamilyId("");
            setSelectedNearFrame(null);
            setCustomerOwnNearFrame(false);
            setNearFrameSearch("");
            setNearFrameResults([]);
            setFormData((prev) => ({
              ...prev,
              far_lens_family_id: "",
              near_lens_family_id: "",
              far_lens_cost: 0,
              near_lens_cost: 0,
              near_frame_product_id: "",
              near_frame_name: "",
              near_frame_brand: "",
              near_frame_model: "",
              near_frame_color: "",
              near_frame_size: "",
              near_frame_sku: "",
              near_frame_price: 0,
              near_frame_price_includes_tax: false,
              near_frame_cost: 0,
            }));
          }
        }}
        onOpenCreatePrescription={() => setShowCreatePrescription(true)}
        onCloseCreatePrescription={() => setShowCreatePrescription(false)}
        onPrescriptionCreated={(customerId) => fetchPrescriptions(customerId)}
      />

      <CreateQuoteFormFrameSection
        presbyopiaSolution={presbyopiaSolution}
        customerOwnFrame={customerOwnFrame}
        selectedFrame={selectedFrame}
        frameSearch={frameSearch}
        frameResults={frameResults}
        searchingFrames={searchingFrames}
        customerOwnNearFrame={customerOwnNearFrame}
        selectedNearFrame={selectedNearFrame}
        nearFrameSearch={nearFrameSearch}
        nearFrameResults={nearFrameResults}
        searchingNearFrames={searchingNearFrames}
        formData={formData}
        onCustomerOwnFrameChange={(checked) => {
          setCustomerOwnFrame(checked);
          if (checked) {
            setSelectedFrame(null);
            setFormData((prev) => ({
              ...prev,
              customer_own_frame: true,
              frame_product_id: "",
              frame_price: 0,
              frame_cost: 0,
            }));
          } else {
            setFormData((prev) => ({ ...prev, customer_own_frame: false }));
          }
        }}
        onFrameSearchChange={setFrameSearch}
        onFrameSelect={(frame) => {
          setSelectedFrame(frame);
          const f = frame as any;
          setFormData((prev) => ({
            ...prev,
            frame_product_id: f.id,
            frame_name: f.name,
            frame_brand: f.frame_brand || "",
            frame_model: f.frame_model || "",
            frame_color: f.frame_color || "",
            frame_size: f.frame_size || "",
            frame_sku: f.sku || "",
            frame_price: f.price || 0,
            frame_price_includes_tax: f.price_includes_tax || false,
            frame_cost: f.price || 0,
          }));
          setFrameSearch("");
          setFrameResults([]);
        }}
        onFrameClear={() => {
          setSelectedFrame(null);
          setFormData((prev) => ({
            ...prev,
            frame_product_id: "",
            frame_name: "",
            frame_brand: "",
            frame_model: "",
            frame_color: "",
            frame_size: "",
            frame_sku: "",
            frame_price: 0,
            frame_cost: 0,
          }));
        }}
        onFrameFormDataChange={(field, value) => {
          setFormData((prev) => ({ ...prev, [field]: value }));
        }}
        onCustomerOwnNearFrameChange={setCustomerOwnNearFrame}
        onNearFrameSearchChange={setNearFrameSearch}
        onNearFrameSelect={(frame) => {
          setSelectedNearFrame(frame);
          const f = frame as any;
          setFormData((prev) => ({
            ...prev,
            near_frame_product_id: f.id,
            near_frame_name: f.name,
            near_frame_brand: f.frame_brand || "",
            near_frame_model: f.frame_model || "",
            near_frame_color: f.frame_color || "",
            near_frame_size: f.frame_size || "",
            near_frame_sku: f.sku || "",
            near_frame_price: f.price || 0,
            near_frame_price_includes_tax: f.price_includes_tax || false,
            near_frame_cost: f.price || 0,
          }));
          setNearFrameSearch("");
          setNearFrameResults([]);
        }}
        onNearFrameClear={() => {
          setSelectedNearFrame(null);
          setFormData((prev) => ({
            ...prev,
            near_frame_product_id: "",
            near_frame_name: "",
            near_frame_brand: "",
            near_frame_model: "",
            near_frame_color: "",
            near_frame_size: "",
            near_frame_sku: "",
            near_frame_price: 0,
            near_frame_cost: 0,
          }));
        }}
        onNearFrameFormDataChange={(field, value) => {
          setFormData((prev) => ({ ...prev, [field]: value }));
        }}
      />

      {selectedPrescription && (
        <CreateQuoteFormLensSection
          lensType={lensType}
          presbyopiaSolution={presbyopiaSolution}
          formData={formData}
          lensFamilies={lensFamilies}
          loadingFamilies={loadingFamilies}
          contactLensFamilies={contactLensFamilies}
          loadingContactLensFamilies={loadingContactLensFamilies}
          farLensFamilyId={farLensFamilyId}
          nearLensFamilyId={nearLensFamilyId}
          farLensCost={farLensCost}
          nearLensCost={nearLensCost}
          selectedPrescription={selectedPrescription}
          availableTreatments={availableTreatments}
          calculatingPrice={calculatingPrice}
          calculatingContactLensPrice={calculatingContactLensPrice}
          manualLensPrice={manualLensPrice}
          onLensTypeChange={(v) => {
            setLensType(v);
            if (v === "optical") {
              setFormData((prev) => ({
                ...prev,
                contact_lens_family_id: "",
                contact_lens_quantity: 1,
                contact_lens_cost: 0,
                contact_lens_price: 0,
              }));
            } else {
              setFormData((prev) => ({
                ...prev,
                lens_family_id: "",
                lens_cost: 0,
              }));
            }
          }}
          onLensFamilyChange={(v) => {
            setFormData((prev) => ({
              ...prev,
              lens_family_id: v,
              lens_cost: 0,
            }));
          }}
          onContactLensFamilyChange={(v) => {
            setFormData((prev) => ({
              ...prev,
              contact_lens_family_id: v,
              contact_lens_cost: 0,
              contact_lens_price: 0,
            }));
          }}
          onContactLensQuantityChange={(q) => {
            setFormData((prev) => ({ ...prev, contact_lens_quantity: q }));
          }}
          onContactLensPriceChange={(p) => {
            setFormData((prev) => ({ ...prev, contact_lens_price: p }));
          }}
          onFarLensFamilyChange={(v) => {
            setFarLensFamilyId(v);
            setFormData((prev) => ({ ...prev, far_lens_family_id: v }));
          }}
          onNearLensFamilyChange={(v) => {
            setNearLensFamilyId(v);
            setFormData((prev) => ({ ...prev, near_lens_family_id: v }));
          }}
          onLensCostChange={(v) => {
            setFormData((prev) => ({ ...prev, lens_cost: v }));
          }}
          onManualLensPriceToggle={() => setManualLensPrice((v) => !v)}
          onSourcingTypeChange={(v) => {
            setFormData((prev) => ({ ...prev, lens_sourcing_type: v }));
          }}
          onLensFormDataChange={(field, value) => {
            setFormData((prev) => ({ ...prev, [field]: value }));
          }}
          onTreatmentToggle={handleTreatmentToggle}
        />
      )}

      <CreateQuoteFormPricingSection
        formData={formData}
        discountType={discountType}
        presbyopiaSolution={presbyopiaSolution}
        manualLensPrice={manualLensPrice}
        saving={saving}
        onDiscountTypeChange={(v) => {
          setDiscountType(v);
          if (v === "percentage") {
            setFormData((prev) => ({ ...prev, discount_amount: 0 }));
          } else {
            setFormData((prev) => ({ ...prev, discount_percentage: 0 }));
          }
          setTimeout(() => calculateTotal(), 0);
        }}
        onDiscountChange={(field, value) => {
          setFormData((prev) => ({ ...prev, [field]: value }));
        }}
        onFrameCostChange={(v) => {
          setFormData((prev) => ({ ...prev, frame_cost: v }));
        }}
        onLensCostChange={(v) => {
          setFormData((prev) => ({ ...prev, lens_cost: v }));
        }}
        onLaborCostChange={(v) => {
          setFormData((prev) => ({ ...prev, labor_cost: v }));
        }}
        onExpirationDaysChange={(v) => {
          setFormData((prev) => ({ ...prev, expiration_days: v }));
        }}
        onNotesChange={(notes, customerNotes) => {
          setFormData((prev) => ({
            ...prev,
            notes,
            customer_notes: customerNotes,
          }));
        }}
        onCancel={props.onCancel}
        onSubmit={handleSubmit}
      />
    </form>
  );
}

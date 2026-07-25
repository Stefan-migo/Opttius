/**
 * CreateQuoteForm — Complete Quote Creation Form
 *
 * Handles optical quote creation with customer, frame, lens, and pricing sections.
 * State managed via useCreateQuoteForm hook; rendering delegated to 4 section components.
 */
"use client";



import type { CreateQuoteFormProps } from "./CreateQuoteForm/CreateQuoteForm.types";
import { CreateQuoteFormCustomerSection } from "./CreateQuoteForm/CreateQuoteFormCustomerSection";
import { CreateQuoteFormFrameSection } from "./CreateQuoteForm/CreateQuoteFormFrameSection";
import { CreateQuoteFormLensSection } from "./CreateQuoteForm/CreateQuoteFormLensSection";
import { CreateQuoteFormPricingSection } from "./CreateQuoteForm/CreateQuoteFormPricingSection";
import { useCreateQuoteForm } from "./CreateQuoteForm/useCreateQuoteForm";

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
        customerResults={customerResults}
        customerSearch={customerSearch}
        loadingPrescriptions={loadingPrescriptions}
        loadingSettings={loadingSettings}
        presbyopiaSolution={presbyopiaSolution}
        prescriptions={prescriptions}
        searchingCustomers={searchingCustomers}
        selectedCustomer={selectedCustomer}
        selectedPrescription={selectedPrescription}
        showCreatePrescription={showCreatePrescription}
        onCloseCreatePrescription={() => setShowCreatePrescription(false)}
        onCustomerClear={() => {
          setSelectedCustomer(null);
          setSelectedPrescription(null);
          setPrescriptions([]);
        }}
        onCustomerSearchChange={setCustomerSearch}
        onCustomerSelect={(c) => {
          setSelectedCustomer(c);
          setCustomerSearch("");
          setCustomerResults([]);
        }}
        onOpenCreatePrescription={() => setShowCreatePrescription(true)}
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
        onPrescriptionCreated={(customerId) => fetchPrescriptions(customerId)}
        onPrescriptionSelect={(p) => {
          setSelectedPrescription(p);
        }}
      />

      <CreateQuoteFormFrameSection
        customerOwnFrame={customerOwnFrame}
        customerOwnNearFrame={customerOwnNearFrame}
        formData={formData}
        frameResults={frameResults}
        frameSearch={frameSearch}
        nearFrameResults={nearFrameResults}
        nearFrameSearch={nearFrameSearch}
        presbyopiaSolution={presbyopiaSolution}
        searchingFrames={searchingFrames}
        searchingNearFrames={searchingNearFrames}
        selectedFrame={selectedFrame}
        selectedNearFrame={selectedNearFrame}
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
        onCustomerOwnNearFrameChange={setCustomerOwnNearFrame}
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
        onFrameSearchChange={setFrameSearch}
        onFrameSelect={(frame) => {
          setSelectedFrame(frame);
          setFormData((prev) => ({
            ...prev,
            frame_product_id: frame.id,
            frame_name: frame.name,
            frame_brand: frame.frame_brand || "",
            frame_model: frame.frame_model || "",
            frame_color: frame.frame_color || "",
            frame_size: frame.frame_size || "",
            frame_sku: frame.sku || "",
            frame_price: frame.price || 0,
            frame_price_includes_tax: frame.price_includes_tax || false,
            frame_cost: frame.price || 0,
          }));
          setFrameSearch("");
          setFrameResults([]);
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
        onNearFrameSearchChange={setNearFrameSearch}
        onNearFrameSelect={(frame) => {
          setSelectedNearFrame(frame);
          setFormData((prev) => ({
            ...prev,
            near_frame_product_id: frame.id,
            near_frame_name: frame.name,
            near_frame_brand: frame.frame_brand || "",
            near_frame_model: frame.frame_model || "",
            near_frame_color: frame.frame_color || "",
            near_frame_size: frame.frame_size || "",
            near_frame_sku: frame.sku || "",
            near_frame_price: frame.price || 0,
            near_frame_price_includes_tax: f.price_includes_tax || false,
            near_frame_cost: f.price || 0,
          }));
          setNearFrameSearch("");
          setNearFrameResults([]);
        }}
      />

      {selectedPrescription && (
        <CreateQuoteFormLensSection
          availableTreatments={availableTreatments}
          calculatingContactLensPrice={calculatingContactLensPrice}
          calculatingPrice={calculatingPrice}
          contactLensFamilies={contactLensFamilies}
          farLensCost={farLensCost}
          farLensFamilyId={farLensFamilyId}
          formData={formData}
          lensFamilies={lensFamilies}
          lensType={lensType}
          loadingContactLensFamilies={loadingContactLensFamilies}
          loadingFamilies={loadingFamilies}
          manualLensPrice={manualLensPrice}
          nearLensCost={nearLensCost}
          nearLensFamilyId={nearLensFamilyId}
          presbyopiaSolution={presbyopiaSolution}
          selectedPrescription={selectedPrescription}
          onContactLensFamilyChange={(v) => {
            setFormData((prev) => ({
              ...prev,
              contact_lens_family_id: v,
              contact_lens_cost: 0,
              contact_lens_price: 0,
            }));
          }}
          onContactLensPriceChange={(p) => {
            setFormData((prev) => ({ ...prev, contact_lens_price: p }));
          }}
          onContactLensQuantityChange={(q) => {
            setFormData((prev) => ({ ...prev, contact_lens_quantity: q }));
          }}
          onFarLensFamilyChange={(v) => {
            setFarLensFamilyId(v);
            setFormData((prev) => ({ ...prev, far_lens_family_id: v }));
          }}
          onLensCostChange={(v) => {
            setFormData((prev) => ({ ...prev, lens_cost: v }));
          }}
          onLensFamilyChange={(v) => {
            setFormData((prev) => ({
              ...prev,
              lens_family_id: v,
              lens_cost: 0,
            }));
          }}
          onLensFormDataChange={(field, value) => {
            setFormData((prev) => ({ ...prev, [field]: value }));
          }}
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
          onManualLensPriceToggle={() => setManualLensPrice((v) => !v)}
          onNearLensFamilyChange={(v) => {
            setNearLensFamilyId(v);
            setFormData((prev) => ({ ...prev, near_lens_family_id: v }));
          }}
          onSourcingTypeChange={(v) => {
            setFormData((prev) => ({ ...prev, lens_sourcing_type: v }));
          }}
          onTreatmentToggle={handleTreatmentToggle}
        />
      )}

      <CreateQuoteFormPricingSection
        discountType={discountType}
        formData={formData}
        manualLensPrice={manualLensPrice}
        presbyopiaSolution={presbyopiaSolution}
        saving={saving}
        onCancel={props.onCancel}
        onDiscountChange={(field, value) => {
          setFormData((prev) => ({ ...prev, [field]: value }));
        }}
        onDiscountTypeChange={(v) => {
          setDiscountType(v);
          if (v === "percentage") {
            setFormData((prev) => ({ ...prev, discount_amount: 0 }));
          } else {
            setFormData((prev) => ({ ...prev, discount_percentage: 0 }));
          }
          setTimeout(() => calculateTotal(), 0);
        }}
        onExpirationDaysChange={(v) => {
          setFormData((prev) => ({ ...prev, expiration_days: v }));
        }}
        onFrameCostChange={(v) => {
          setFormData((prev) => ({ ...prev, frame_cost: v }));
        }}
        onLaborCostChange={(v) => {
          setFormData((prev) => ({ ...prev, labor_cost: v }));
        }}
        onLensCostChange={(v) => {
          setFormData((prev) => ({ ...prev, lens_cost: v }));
        }}
        onNotesChange={(notes, customerNotes) => {
          setFormData((prev) => ({
            ...prev,
            notes,
            customer_notes: customerNotes,
          }));
        }}
        onSubmit={handleSubmit}
      />
    </form>
  );
}

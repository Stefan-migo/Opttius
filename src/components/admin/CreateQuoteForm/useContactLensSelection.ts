"use client";

import { useState } from "react";
import type React from "react";

import type { QuoteFormData } from "./CreateQuoteForm.types";

export function useContactLensSelection(
  setFormData: React.Dispatch<React.SetStateAction<QuoteFormData>>,
) {
  const [contactLensFamilyId, setContactLensFamilyId] = useState("");
  const [contactLensQuantity, setContactLensQuantity] = useState(1);
  const [contactLensTypeData, setContactLensTypeData] = useState<unknown>(null);
  const [selectedContactLensType, setSelectedContactLensType] =
    useState<unknown>(null);

  const handleContactLensFamilyChange = (familyId: string) => {
    setContactLensFamilyId(familyId);
    setFormData((prev) => ({
      ...prev,
      contact_lens_family_id: familyId,
      contact_lens_cost: 0,
      contact_lens_price: 0,
    }));
  };

  const handleContactLensQuantityChange = (quantity: number) => {
    setContactLensQuantity(quantity);
    setFormData((prev) => ({ ...prev, contact_lens_quantity: quantity }));
  };

  const handleContactLensTypeChange = (type: unknown) => {
    setSelectedContactLensType(type);
    setContactLensTypeData(type);
  };

  const handleContactLensPriceChange = (price: number) => {
    setFormData((prev) => ({ ...prev, contact_lens_price: price }));
  };

  return {
    contactLensFamilyId,
    setContactLensFamilyId,
    contactLensQuantity,
    setContactLensQuantity,
    contactLensTypeData,
    setContactLensTypeData,
    selectedContactLensType,
    setSelectedContactLensType,
    handleContactLensFamilyChange,
    handleContactLensQuantityChange,
    handleContactLensTypeChange,
    handleContactLensPriceChange,
  };
}

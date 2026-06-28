"use client";

import { useEffect, useState } from "react";
import type React from "react";

import { productService } from "@/lib/api/services";

import type { QuoteFormData } from "./CreateQuoteForm.types";

export function useFrameSelection(
  effectiveBranchId: string | undefined,
  initialFieldOperationId: string | undefined,
  setFormData: React.Dispatch<React.SetStateAction<QuoteFormData>>,
) {
  // Frame selection
  const [frameSearch, setFrameSearch] = useState("");
  const [frameResults, setFrameResults] = useState<unknown[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<unknown>(null);
  const [searchingFrames, setSearchingFrames] = useState(false);

  // Second frame for two separate lenses (near vision)
  const [nearFrameSearch, setNearFrameSearch] = useState("");
  const [nearFrameResults, setNearFrameResults] = useState<unknown[]>([]);
  const [selectedNearFrame, setSelectedNearFrame] = useState<unknown>(null);
  const [searchingNearFrames, setSearchingNearFrames] = useState(false);
  const [customerOwnFrame, setCustomerOwnFrame] = useState<boolean>(false);
  const [customerOwnNearFrame, setCustomerOwnNearFrame] =
    useState<boolean>(false);

  // Search frames
  useEffect(() => {
    const searchFrames = async () => {
      if (frameSearch.length < 2) {
        setFrameResults([]);
        return;
      }
      setSearchingFrames(true);
      try {
        const frames = await productService.searchProducts(
          frameSearch,
          effectiveBranchId,
          "frame",
          initialFieldOperationId,
        );
        setFrameResults(frames || []);
      } catch (error) {
        console.error("Error searching frames:", error);
      } finally {
        setSearchingFrames(false);
      }
    };
    const debounce = setTimeout(searchFrames, 300);
    return () => clearTimeout(debounce);
  }, [frameSearch, effectiveBranchId, initialFieldOperationId]);

  // Search near frames
  useEffect(() => {
    const searchNearFrames = async () => {
      if (nearFrameSearch.length < 2) {
        setNearFrameResults([]);
        return;
      }
      setSearchingNearFrames(true);
      try {
        const results = await productService.searchProducts(
          nearFrameSearch,
          effectiveBranchId,
          "frame",
          initialFieldOperationId,
        );
        setNearFrameResults(results || []);
      } catch (error) {
        console.error("Error searching near frames:", error);
      } finally {
        setSearchingNearFrames(false);
      }
    };
    const debounce = setTimeout(searchNearFrames, 300);
    return () => clearTimeout(debounce);
  }, [nearFrameSearch, effectiveBranchId, initialFieldOperationId]);

  const handleFrameSelect = (frame: unknown) => {
    setSelectedFrame(frame);
    setFormData((prev) => ({
      ...prev,
      frame_product_id: (frame as Record<string, unknown>).id as string,
      frame_name: (frame as Record<string, unknown>).name as string,
      frame_brand: ((frame as Record<string, unknown>).frame_brand as string) || "",
      frame_model: ((frame as Record<string, unknown>).frame_model as string) || "",
      frame_color: ((frame as Record<string, unknown>).frame_color as string) || "",
      frame_size: ((frame as Record<string, unknown>).frame_size as string) || "",
      frame_sku: ((frame as Record<string, unknown>).sku as string) || "",
      frame_price: ((frame as Record<string, unknown>).price as number) || 0,
      frame_price_includes_tax:
        ((frame as Record<string, unknown>).price_includes_tax as boolean) || false,
      frame_cost: ((frame as Record<string, unknown>).price as number) || 0,
    }));
    setFrameSearch("");
    setFrameResults([]);
  };

  const handleNearFrameSelect = (frame: unknown) => {
    setSelectedNearFrame(frame);
    const nearFrameCost = (frame as Record<string, unknown>).price as number || 0;
    setFormData((prev) => ({
      ...prev,
      near_frame_product_id: (frame as Record<string, unknown>).id as string,
      near_frame_name: (frame as Record<string, unknown>).name as string,
      near_frame_brand: ((frame as Record<string, unknown>).frame_brand as string) || "",
      near_frame_model: ((frame as Record<string, unknown>).frame_model as string) || "",
      near_frame_color: ((frame as Record<string, unknown>).frame_color as string) || "",
      near_frame_size: ((frame as Record<string, unknown>).frame_size as string) || "",
      near_frame_sku: ((frame as Record<string, unknown>).sku as string) || "",
      near_frame_price: ((frame as Record<string, unknown>).price as number) || 0,
      near_frame_price_includes_tax:
        ((frame as Record<string, unknown>).price_includes_tax as boolean) || false,
      near_frame_cost: nearFrameCost,
    }));
    setNearFrameSearch("");
    setNearFrameResults([]);
  };

  return {
    frameSearch,
    setFrameSearch,
    frameResults,
    setFrameResults,
    selectedFrame,
    setSelectedFrame,
    searchingFrames,
    setSearchingFrames,
    nearFrameSearch,
    setNearFrameSearch,
    nearFrameResults,
    setNearFrameResults,
    selectedNearFrame,
    setSelectedNearFrame,
    searchingNearFrames,
    setSearchingNearFrames,
    customerOwnFrame,
    setCustomerOwnFrame,
    customerOwnNearFrame,
    setCustomerOwnNearFrame,
    handleFrameSelect,
    handleNearFrameSelect,
  };
}

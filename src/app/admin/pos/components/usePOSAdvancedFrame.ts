/**
 * usePOSAdvancedFrame — frame search state and effects for POSAdvancedSale.
 *
 * Extracted from usePOSAdvancedSale.ts to reduce file size.
 * Owns frame search state, debounced effects, and search action factories.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

import { searchProducts } from "@/lib/api/services/productService";

import type { POSProduct } from "../types";
import { createSearchFramesAction } from "./posDataLoader";

export interface UsePOSAdvancedFrameProps {
  branchId: string | null;
}

export interface UsePOSAdvancedFrameReturn {
  frameSearchTerm: string;
  setFrameSearchTerm: (v: string) => void;
  frameResults: POSProduct[];
  frameLoading: boolean;
  selectedFrame: POSProduct | null;
  setSelectedFrame: (v: POSProduct | null) => void;
  nearFrameSearchTerm: string;
  setNearFrameSearchTerm: (v: string) => void;
  nearFrameResults: POSProduct[];
  nearFrameLoading: boolean;
  selectedNearFrame: POSProduct | null;
  setSelectedNearFrame: (v: POSProduct | null) => void;
  customerOwnNearFrame: boolean;
  setCustomerOwnNearFrame: (v: boolean) => void;
}

export function usePOSAdvancedFrame({
  branchId,
}: UsePOSAdvancedFrameProps): UsePOSAdvancedFrameReturn {
  const [frameSearchTerm, setFrameSearchTerm] = useState("");
  const [frameResults, setFrameResults] = useState<POSProduct[]>([]);
  const [frameLoading, setFrameLoading] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<POSProduct | null>(null);

  const [nearFrameSearchTerm, setNearFrameSearchTerm] = useState("");
  const [nearFrameResults, setNearFrameResults] = useState<POSProduct[]>([]);
  const [nearFrameLoading, setNearFrameLoading] = useState(false);
  const [selectedNearFrame, setSelectedNearFrame] = useState<POSProduct | null>(
    null,
  );
  const [customerOwnNearFrame, setCustomerOwnNearFrame] = useState(false);

  const searchFrames = useCallback(
    createSearchFramesAction(
      branchId,
      setFrameResults,
      setFrameLoading,
      searchProducts,
    ),
    [branchId],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      searchFrames(frameSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [frameSearchTerm, searchFrames]);

  const searchNearFrames = useCallback(
    createSearchFramesAction(
      branchId,
      setNearFrameResults,
      setNearFrameLoading,
      searchProducts,
    ),
    [branchId],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      searchNearFrames(nearFrameSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [nearFrameSearchTerm, searchNearFrames]);

  return {
    frameSearchTerm,
    setFrameSearchTerm,
    frameResults,
    frameLoading,
    selectedFrame,
    setSelectedFrame,
    nearFrameSearchTerm,
    setNearFrameSearchTerm,
    nearFrameResults,
    nearFrameLoading,
    selectedNearFrame,
    setSelectedNearFrame,
    customerOwnNearFrame,
    setCustomerOwnNearFrame,
  };
}

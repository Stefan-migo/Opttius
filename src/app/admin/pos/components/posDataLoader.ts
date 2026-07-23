/**
 * posDataLoader — Data loading hooks for the Optical Sale form.
 *
 * Contains hook-based data loading functions that interact with
 * Supabase services. Co-located here to reduce megafile size.
 */


import type { Prescription } from "@/lib/api/services/customerService";
import type { QuoteSettings } from "@/lib/api/services/quoteSettingsService";

import type { Treatment } from "./POSAdvancedSale.types";
import { type CreateQuoteParams,handleCreateQuoteAction } from "./posCreateQuote";

export type { CreateQuoteParams };
export { handleCreateQuoteAction };

export interface DataLoaderParams {
  customer: { id: string } | null;
  branchId: string | null;
  quoteSettingsService: { get: () => Promise<QuoteSettings | null> };
  getPrescriptions: (id: string) => Promise<Prescription[]>;
  searchProducts: (
    search: string,
    branchId: string,
    productType?: string,
  ) => Promise<unknown[]>;
  onSettingsLoaded: (settings: QuoteSettings) => void;
  onUpdateTreatments: (updater: (prev: Treatment[]) => Treatment[]) => void;
  onSetLaborCost: (cost: number) => void;
  onPrescriptionsLoaded: (prescriptions: Prescription[]) => void;
  onCurrentPrescriptionFound: (prescription: Prescription) => void;
  onSetLoadingPrescriptions: (loading: boolean) => void;
}

export async function loadSettingsAction(
  quoteSettingsService: { get: () => Promise<QuoteSettings | null> },
  onSettingsLoaded: (settings: QuoteSettings) => void,
  onUpdateTreatments: (updater: (prev: Treatment[]) => Treatment[]) => void,
  onSetLaborCost: (cost: number) => void,
): Promise<void> {
  const settings = await quoteSettingsService.get();
  if (!settings) return;

  onSettingsLoaded(settings);

  if (settings.treatment_prices) {
    const tp = settings.treatment_prices;
    onUpdateTreatments((prev) => {
      const updated = prev.map((t) => {
        const tpValue = tp[t.value as keyof typeof tp];
        const price =
          typeof tpValue === "number"
            ? tpValue
            : (tpValue as { price?: number })?.price;
        return price !== undefined && price > 0 ? { ...t, cost: price } : t;
      });

      if (tp.custom_service?.enabled) {
        updated.push({
          id: "t-custom",
          label: tp.custom_service.name || "Servicio Extra",
          value: "custom_service",
          cost: tp.custom_service.price || 0,
          category: "coating",
          editable: true,
        });
      }
      return updated;
    });
  }

  if (settings?.default_labor_cost && settings.default_labor_cost > 0) {
    onSetLaborCost(settings.default_labor_cost);
  }
}

export async function loadPrescriptionsAction(
  customerId: string | undefined,
  getPrescriptionsFn: (id: string) => Promise<Prescription[]>,
  onPrescriptionsLoaded: (prescriptions: Prescription[]) => void,
  onCurrentPrescriptionFound: (prescription: Prescription) => void,
  onSetLoadingPrescriptions: (loading: boolean) => void,
): Promise<void> {
  if (!customerId) {
    onPrescriptionsLoaded([]);
    return;
  }

  onSetLoadingPrescriptions(true);
  try {
    const data = await getPrescriptionsFn(customerId);
    onPrescriptionsLoaded(data || []);
    const current = data?.find((p) => p.is_current);
    if (current) {
      onCurrentPrescriptionFound(current);
    }
  } catch {
    onPrescriptionsLoaded([]);
  } finally {
    onSetLoadingPrescriptions(false);
  }
}

export function createSearchFramesAction(
  branchId: string | null,
  setResults: (results: unknown[]) => void,
  setLoading: (loading: boolean) => void,
  searchProductsFn: (
    search: string,
    branchId: string,
    productType?: string,
  ) => Promise<unknown[]>,
) {
  return async (search: string) => {
    if (!branchId || search.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const products = await searchProductsFn(search, branchId, "frame");
      const frames = products.filter(
        (p: unknown) =>
          p.product_type === "frame" ||
          p.name?.toLowerCase().includes("marco") ||
          p.name?.toLowerCase().includes("armazón") ||
          p.name?.toLowerCase().includes("anteojo"),
      );
      setResults(frames);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };
}

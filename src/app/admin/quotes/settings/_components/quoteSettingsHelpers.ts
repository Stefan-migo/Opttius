import type { QuoteSettings } from "@/lib/api/services";

export const TREATMENT_LABELS: Record<string, string> = {
  anti_reflective: "Anti-reflejante",
  scratch_resistant: "Anti-rayas",
  tint: "Tinte",
  custom_service: "Servicio Personalizado",
};

export const TREATMENT_KEYS = ["anti_reflective", "scratch_resistant", "tint"];

export type TreatmentPrice = { price: number; enabled: boolean };

export function getTreatmentPrice(value: TreatmentPrice | number): number {
  return typeof value === "number" ? value : value.price;
}

export function getTreatmentEnabled(value: TreatmentPrice | number): boolean {
  return typeof value === "number" ? true : value.enabled;
}

export function normalizeTreatmentValue(
  value: TreatmentPrice | number,
  price?: number,
  enabled?: boolean,
): TreatmentPrice {
  return {
    price: price ?? getTreatmentPrice(value),
    enabled: enabled ?? getTreatmentEnabled(value),
  };
}

export interface FormQuoteSettings extends Omit<QuoteSettings, "treatment_prices"> {
  treatment_prices: Record<string, TreatmentPrice | number>;
}

export function buildUpdateSettingHandler<T extends QuoteSettings>(
  settings: FormQuoteSettings | null,
  setSettings: (s: FormQuoteSettings) => void,
  setHasChanges: (v: boolean) => void,
) {
  return <K extends keyof QuoteSettings>(key: K, value: QuoteSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };
}

export function buildUpdateNestedHandler(
  settings: FormQuoteSettings | null,
  setSettings: (s: FormQuoteSettings) => void,
  setHasChanges: (v: boolean) => void,
) {
  return <K extends keyof QuoteSettings>(key: K, nestedKey: string, value: unknown) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: { ...(settings[key] as Record<string, unknown>), [nestedKey]: value },
    } as FormQuoteSettings);
    setHasChanges(true);
  };
}

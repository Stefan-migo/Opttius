/**
 * Location and Currency Resolution
 *
 * Pure functions for resolving location and currency from organization settings.
 * Extracted from OrganizationalMemory to keep the main class thin.
 */

export function countryFromCurrency(code: string): string | null {
  const map: Record<string, string> = {
    CLP: "Chile",
    ARS: "Argentina",
    MXN: "México",
    EUR: "España",
    COP: "Colombia",
    PEN: "Perú",
    USD: "Estados Unidos",
  };
  return map[code] ?? null;
}

export function currencyFromCountry(country: string): string | null {
  const c = country.toLowerCase();
  if (c.includes("chile")) return "CLP";
  if (c.includes("argentina")) return "ARS";
  if (c.includes("méxico") || c.includes("mexico")) return "MXN";
  if (c.includes("españa") || c.includes("espa")) return "EUR";
  if (c.includes("colombia")) return "COP";
  if (c.includes("perú") || c.includes("peru")) return "PEN";
  return null;
}

/**
 * Resolve location and currency from multiple sources (no hardcoding).
 * Priority: 1) organization_settings explicit, 2) system_config, 3) quote_settings, 4) heuristics (phone/address/docType).
 */
export function resolveLocationAndCurrency(settings: Record<string, unknown>): {
  location: string;
  currency: string;
} {
  const phone = String(settings.business_phone || "").trim();
  const address = String(settings.business_address || "").toLowerCase();
  const docType = String(settings.default_document_type || "").toLowerCase();
  const explicitCountry = String(settings.country || "").trim();
  const explicitCurrency = String(settings.currency || "")
    .trim()
    .toUpperCase();

  // 1) Explicit organization_settings (highest priority)
  if (explicitCurrency && explicitCurrency.length >= 3) {
    const country = countryFromCurrency(explicitCurrency);
    return {
      location: explicitCountry || country || "No especificado",
      currency: explicitCurrency,
    };
  }
  if (explicitCountry) {
    const currency = currencyFromCountry(explicitCountry);
    if (currency) {
      return { location: explicitCountry, currency };
    }
  }

  // 2) Heuristics from phone, address, document type
  if (
    phone.startsWith("+56") ||
    address.includes("chile") ||
    docType === "boleta"
  ) {
    return { location: "Chile", currency: "CLP" };
  }
  if (phone.startsWith("+54") || address.includes("argentina")) {
    return { location: "Argentina", currency: "ARS" };
  }
  if (phone.startsWith("+34") || address.includes("españa")) {
    return { location: "España", currency: "EUR" };
  }
  if (
    address.includes("méxico") ||
    address.includes("mexico") ||
    phone.startsWith("+52")
  ) {
    return { location: "México", currency: "MXN" };
  }
  if (phone.startsWith("+57") || address.includes("colombia")) {
    return { location: "Colombia", currency: "COP" };
  }
  if (
    phone.startsWith("+51") ||
    address.includes("perú") ||
    address.includes("peru")
  ) {
    return { location: "Perú", currency: "PEN" };
  }

  return { location: "No especificado", currency: "USD" };
}

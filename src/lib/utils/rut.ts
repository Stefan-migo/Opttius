/**
 * Utility functions for Chilean RUT (Rol Único Tributario) formatting and validation
 */

/**
 * Formats a Chilean RUT to the standard format: xx.xxx.xxx-x
 * Accepts RUT in any format (with or without dots/dashes) and normalizes it
 *
 * @param rut - RUT string in any format (e.g., "123456789", "12.345.678-9", "12345678-9")
 * @returns Formatted RUT string in format "xx.xxx.xxx-x" or empty string if invalid
 *
 * @example
 * formatRUT("123456789") // Returns "12.345.678-9"
 * formatRUT("12.345.678-9") // Returns "12.345.678-9"
 * formatRUT("12345678-9") // Returns "12.345.678-9"
 */
export function formatRUT(rut: string): string {
  if (!rut) return "";

  // Remove all non-numeric characters except K (verification digit can be K)
  const cleanRUT = rut.replace(/[^0-9Kk]/g, "");

  if (cleanRUT.length === 0) return "";

  // Extract verification digit (last character)
  const verificationDigit = cleanRUT.slice(-1).toUpperCase();
  // Extract numbers (everything except last character)
  const numbers = cleanRUT.slice(0, -1);

  if (numbers.length === 0) return verificationDigit;

  // Format numbers with dots (Chilean format: thousands separator)
  // This regex adds dots every 3 digits from right to left
  const formatted = numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Add dash and verification digit
  return `${formatted}-${verificationDigit}`;
}

/**
 * Normalizes a RUT by removing all formatting (dots, dashes, spaces)
 * Useful for database storage or comparison
 *
 * @param rut - RUT string in any format
 * @returns RUT string without formatting (e.g., "123456789")
 */
export function normalizeRUT(rut: string): string {
  if (!rut) return "";
  return rut.replace(/[.\-\s]/g, "").toUpperCase();
}

/**
 * Computes the Chilean RUT verification digit (dígito verificador)
 *
 * @param rutBody - RUT body (digits only, without verification digit)
 * @returns The verification digit as string ("0"-"9" or "K")
 */
export function computeRUTVerificationDigit(rutBody: string): string {
  if (!rutBody || !/^\d+$/.test(rutBody)) return "";

  const digits = rutBody.split("").map(Number).reverse();
  const multipliers = [2, 3, 4, 5, 6, 7];
  let sum = 0;
  digits.forEach((d, i) => {
    sum += d * multipliers[i % multipliers.length];
  });
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

/**
 * Completes RUT with verification digit if only body digits are provided
 *
 * @param rut - RUT string (with or without verification digit)
 * @returns RUT with verification digit, or original if already complete/invalid
 */
export function completeRUTIfNeeded(rut: string): string {
  if (!rut || typeof rut !== "string") return rut;
  const normalized = normalizeRUT(rut);
  // Already has 9 chars (7-8 digits + 1 DV)
  if (/^[0-9]{7,8}[0-9Kk]$/.test(normalized)) return normalized;
  // Has 7 or 8 digits only - compute and append DV
  if (/^[0-9]{7,8}$/.test(normalized)) {
    const dv = computeRUTVerificationDigit(normalized);
    return normalized + dv;
  }
  return rut;
}

/**
 * Formats RUT as the user types (dynamic formatting).
 * Handles partial input: "1234567" → "1.234.567", "123456789" → "12.345.678-9"
 *
 * @param rut - RUT string (digits, may include K for DV)
 * @returns Formatted RUT string
 */
export function formatRUTAsYouType(rut: string): string {
  if (!rut) return "";

  const clean = rut.replace(/[^0-9Kk]/g, "");
  if (clean.length === 0) return "";

  // If we have 9+ chars, last is DV - format as xx.xxx.xxx-x
  if (clean.length >= 9) {
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1).toUpperCase();
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formatted}-${dv}`;
  }

  // Partial: only digits, add dots as thousands separator
  const formatted = clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return formatted;
}

/**
 * Validates if a RUT has a valid format (basic format check, not verification digit validation)
 *
 * @param rut - RUT string to validate
 * @returns true if format is valid, false otherwise
 */
export function isValidRUTFormat(rut: string): boolean {
  if (!rut) return false;

  const normalized = normalizeRUT(rut);
  // RUT should have 7-8 digits + 1 verification digit (K or 0-9)
  return /^[0-9]{7,8}[0-9Kk]$/.test(normalized);
}

/**
 * Full RUT validation: format + verification digit algorithm.
 * Handles any input format (with/without dots, dashes, spaces).
 *
 * @param rut - RUT string to validate
 * @returns true if RUT is valid
 */
export function isValidRUT(rut: string): boolean {
  if (!rut || typeof rut !== "string") return false;

  // Remove all non-digit, non-K characters (handles spaces, dots, dashes, etc.)
  const clean = rut.replace(/[^0-9Kk]/g, "");
  if (clean.length < 8 || clean.length > 9) return false;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();

  const computed = computeRUTVerificationDigit(body);
  return computed === dv;
}

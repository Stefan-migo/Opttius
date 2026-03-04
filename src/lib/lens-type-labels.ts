/**
 * Centralized lens type slug → Spanish label mapping.
 * Used in quotes, work orders, and other optical modules.
 */

export const LENS_TYPE_LABELS: Record<string, string> = {
  single_vision: "Monofocal",
  bifocal: "Bifocal",
  trifocal: "Trifocal",
  progressive: "Progresivo",
  reading: "Lectura",
  computer: "Computadora",
  sports: "Deportivo",
  "Lentes de contacto": "Lentes de contacto",
};

/**
 * Get human-readable Spanish label for a lens type slug.
 * @param slug - The lens type value (e.g. "single_vision", "progressive")
 * @returns The translated label or the original value if not found
 */
export function getLensTypeLabel(slug: string | null | undefined): string {
  if (!slug) return "—";
  return LENS_TYPE_LABELS[slug] || slug;
}

/**
 * Suggestion text for lens matrix configuration panel.
 */

export const OPTICAL_MATRIX_SUGGESTION_TITLE =
  "Configuración sugerida para una familia completa";

export const OPTICAL_MATRIX_SUGGESTION_DESCRIPTION =
  "Una familia de lentes completa suele incluir estas matrices. Si no configuras todas, asegúrate de tener al menos el Fallback para evitar recetas sin precio.";

export const OPTICAL_MATRIX_SUGGESTION_ROWS = [
  { name: "Rango base", range: "Esf -6 a +6, Cil -4 a 0" },
  { name: "Alta miopía", range: "Esf -20 a -6.25, Cil -4 a 0" },
  { name: "Alta hipermetropía", range: "Esf +6.25 a +20, Cil -4 a 0" },
  { name: "Astigmatismo alto", range: "Esf -6 a +6, Cil -8 a -4.25" },
  {
    name: "Alta miopía + astigmatismo",
    range: "Esf -20 a -6.25, Cil -8 a -4.25",
  },
  {
    name: "Alta hipermetropía + astigmatismo",
    range: "Esf +6.25 a +20, Cil -8 a -4.25",
  },
  { name: "Fallback", range: "Esf -20 a +20, Cil -8 a 0 (precio máximo)" },
];

export const CONTACT_LENS_MATRIX_SUGGESTION_TITLE =
  "Configuración sugerida para matrices de lentes de contacto";

export const CONTACT_LENS_MATRIX_SUGGESTION_DESCRIPTION =
  "Define rangos de esfera, cilindro, eje y adición según la modalidad (esférico, tórico, multifocal). Incluye un Fallback para recetas fuera de rango.";

export const CONTACT_LENS_MATRIX_SUGGESTION_ROWS = [
  {
    name: "Rango base",
    range: "Esf -20 a +20, Cil -6 a 0, Eje 0-180, Add 0-4",
  },
  { name: "Fallback", range: "Esf -20 a +20, Cil -6 a 0 (precio máximo)" },
];

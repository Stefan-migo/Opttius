/**
 * POSAdvancedSale — Default constants for the Optical Sale form.
 */

import type { Treatment } from "./POSAdvancedSale.types";

// Default lens families (these should come from settings/config in production)
export const DEFAULT_LENS_FAMILIES = [
  { id: "lf-1", name: "Lente Standard CR-39", lens_type: "vision" },
  { id: "lf-2", name: "Lente Alto Índice 1.67", lens_type: "vision" },
  { id: "lf-3", name: "Lente Alto Índice 1.74", lens_type: "vision" },
  { id: "lf-4", name: "Lente Policarbonato", lens_type: "vision" },
  { id: "lf-5", name: "Lente Progresivo Standard", lens_type: "vision" },
  { id: "lf-6", name: "Lente Progresivo Premium", lens_type: "vision" },
  { id: "lf-7", name: "Lente Progresivo Personalizado", lens_type: "vision" },
  { id: "lf-8", name: "Lente Bifocal", lens_type: "vision" },
  {
    id: "lf-contact-1",
    name: "Lentes de Contacto Esféricos",
    lens_type: "contact",
  },
  {
    id: "lf-contact-2",
    name: "Lentes de Contacto Tóricos",
    lens_type: "contact",
  },
  {
    id: "lf-contact-3",
    name: "Lentes de Contacto Progresivos",
    lens_type: "contact",
  },
] as const;

// Default treatments - solo los que se aplican en laboratorio local
export const DEFAULT_TREATMENTS: Treatment[] = [
  {
    id: "t-1",
    label: "Anti-reflejante",
    value: "anti_reflective",
    cost: 15000,
    category: "coating",
    editable: true,
  },
  {
    id: "t-2",
    label: "Anti-rayas",
    value: "scratch_resistant",
    cost: 12000,
    category: "coating",
    editable: true,
  },
  {
    id: "t-3",
    label: "Tinte",
    value: "tint",
    cost: 15000,
    category: "coating",
    editable: true,
  },
  // custom_service se agrega dinámicamente si está habilitado en settings
];

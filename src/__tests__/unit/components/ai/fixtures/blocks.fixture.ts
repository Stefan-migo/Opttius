import type { Block } from "@/lib/ai/types";

/** One fixture per Block variant for use in BlockRenderer tests. */
export const textBlock: Block = {
  type: "text",
  content: "Se encontraron 3 clientes que cumplen años este mes.",
};

export const previewBlock: Block = {
  type: "preview",
  entity: "customer",
  id: "abc-123",
  title: "Juan Pérez",
  subtitle: "15 de junio — +56 9 1234 5678",
  actions: [
    { label: "Ver perfil", variant: "primary", action: "viewCustomer" },
    { label: "Eliminar", variant: "danger", action: "deleteCustomer" },
  ],
};

export const actionBlock: Block = {
  type: "action",
  label: "Generar reporte",
  variant: "primary",
  action: "generateReport",
  params: { type: "monthly" },
};

export const navigationBlock: Block = {
  type: "navigation",
  label: "Ir a clientes",
  path: "/admin/customers",
};

export const loadingBlock: Block = {
  type: "loading",
  label: "Buscando clientes...",
};

export const errorBlock: Block = {
  type: "error",
  content: "No se pudo conectar con el servidor. Intenta de nuevo.",
};

export const successBlock: Block = {
  type: "success",
  content: "Cliente registrado exitosamente.",
};

/** Convenience array — one block of each type for iteration. */
export const allBlockFixtures: Block[] = [
  textBlock,
  previewBlock,
  actionBlock,
  navigationBlock,
  loadingBlock,
  errorBlock,
  successBlock,
];

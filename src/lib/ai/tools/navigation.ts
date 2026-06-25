/**
 * Navigation tools for the AI Agent.
 *
 * IMPORTANT: None of these tools execute server-side redirects.
 * They all return a NavigationBlock that the frontend processes
 * via next/navigation useRouter().push().
 */
import type { ToolDefinition, ToolResult } from "./types";

const entityRoutes: Record<string, string> = {
  customer: "/admin/customers",
  product: "/admin/products",
  order: "/admin/orders",
  workOrder: "/admin/work-orders",
  appointment: "/admin/appointments",
  quote: "/admin/quotes",
  prescription: "/admin/prescriptions",
  category: "/admin/categories",
  ticket: "/admin/support",
};

export const navigationTools: ToolDefinition[] = [
  {
    name: "navigateTo",
    description:
      "Navigate the user to a specific admin route. Returns a navigation block that the frontend resolves via router.push().",
    type: "navigation",
    minRole: "vendedor",
    category: "navigation",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Admin route path, e.g. /admin/customers",
        },
        label: {
          type: "string",
          description: "Human-readable label for the link",
        },
      },
      required: ["path", "label"],
    },
    execute: async (params): Promise<ToolResult> => {
      const { path, label } = params as { path: string; label: string };
      return {
        success: true,
        data: { type: "navigation", label, path },
      };
    },
  },
  {
    name: "openEntity",
    description:
      "Navigate to a specific entity's detail page. Supported entities: customer, product, order, workOrder, appointment, quote, prescription, category, ticket.",
    type: "navigation",
    minRole: "vendedor",
    category: "navigation",
    parameters: {
      type: "object",
      properties: {
        entity: {
          type: "string",
          enum: Object.keys(entityRoutes),
          description: "Entity type to navigate to",
        },
        id: {
          type: "string",
          description: "Entity UUID",
        },
      },
      required: ["entity", "id"],
    },
    execute: async (params): Promise<ToolResult> => {
      const { entity, id } = params as { entity: string; id: string };
      const basePath = entityRoutes[entity];
      if (!basePath) {
        return {
          success: false,
          error: `Unknown entity type: ${entity}. Supported: ${Object.keys(entityRoutes).join(", ")}`,
        };
      }
      return {
        success: true,
        data: {
          type: "navigation",
          label: `View ${entity}`,
          path: `${basePath}/${id}`,
        },
      };
    },
  },
  {
    name: "reopenLastScreen",
    description:
      "Navigate the user back to their previous screen. Returns a navigation block that triggers router.back() on the frontend. If no previous route exists, stays on current page.",
    type: "navigation",
    minRole: "vendedor",
    category: "navigation",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (): Promise<ToolResult> => {
      return {
        success: true,
        data: {
          type: "navigation",
          label: "Go back",
          path: "__back__", // ponytail: frontend interprets __back__ as router.back()
        },
      };
    },
  },
];

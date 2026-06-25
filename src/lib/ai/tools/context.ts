/**
 * Context tools for the AI Agent.
 *
 * These tools provide read-only access to the current screen's state.
 * They use a shared ContextStore singleton that the frontend AgentContextProvider
 * updates on every navigation / state change.
 */
import type { ToolDefinition, ToolResult } from "./types";

// ─── ContextStore ──────────────────────────────────────────────────────────
// ponytail: singleton ref — sufficient until multi-session threading needed

export interface ScreenContextData {
  route: string;
  section?: string;
  branchId: string | null;
  branchName?: string;
  role: string;
  orgId: string;
  userId: string;
}

export interface FormData {
  formId?: string;
  formName?: string;
  fields?: Record<string, unknown>;
}

export interface SelectedCustomer {
  id: string;
  name: string;
  rut?: string;
  email?: string;
  phone?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface CartContents {
  items: CartItem[];
  total: number;
  branchId?: string;
}

class ContextStore {
  private static instance: ContextStore;

  screenContext: ScreenContextData | null = null;
  formData: FormData | null = null;
  selectedCustomer: SelectedCustomer | null = null;
  cartContents: CartContents | null = null;

  static getInstance(): ContextStore {
    if (!ContextStore.instance) {
      ContextStore.instance = new ContextStore();
    }
    return ContextStore.instance;
  }

  updateScreen(data: ScreenContextData): void {
    this.screenContext = data;
  }

  updateForm(data: FormData | null): void {
    this.formData = data;
  }

  updateCustomer(data: SelectedCustomer | null): void {
    this.selectedCustomer = data;
  }

  updateCart(data: CartContents | null): void {
    this.cartContents = data;
  }

  reset(): void {
    this.screenContext = null;
    this.formData = null;
    this.selectedCustomer = null;
    this.cartContents = null;
  }
}

export const contextStore = ContextStore.getInstance();

// ─── Tools ─────────────────────────────────────────────────────────────────

export const contextTools: ToolDefinition[] = [
  {
    name: "getScreenContext",
    description:
      "Returns the current screen context: route, section, branch, role, and org ID from the user's current page.",
    type: "context",
    minRole: "vendedor",
    category: "context",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (): Promise<ToolResult> => {
      const ctx = contextStore.screenContext;
      if (!ctx) {
        return {
          success: true,
          data: {
            route: "/admin",
            section: undefined,
            branchId: null,
            branchName: undefined,
            role: "vendedor",
            orgId: null,
          },
          message: "No active screen context — returning defaults",
        };
      }
      return {
        success: true,
        data: ctx,
        message: `Current screen: ${ctx.route}`,
      };
    },
  },
  {
    name: "getActiveFormData",
    description:
      "Returns serialized data from the currently active form on the page. Returns null if no form is active.",
    type: "context",
    minRole: "vendedor",
    category: "context",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (): Promise<ToolResult> => {
      const form = contextStore.formData;
      if (!form) {
        return {
          success: true,
          data: null,
          message: "No active form detected",
        };
      }
      return {
        success: true,
        data: form,
        message: `Active form: ${form.formName || form.formId || "unknown"}`,
      };
    },
  },
  {
    name: "getSelectedCustomer",
    description:
      "Returns the currently selected customer (id, name, rut, email, phone) from the page context. Returns null if no customer is selected.",
    type: "context",
    minRole: "vendedor",
    category: "context",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (): Promise<ToolResult> => {
      const customer = contextStore.selectedCustomer;
      if (!customer) {
        return {
          success: true,
          data: null,
          message: "No customer selected in current context",
        };
      }
      return {
        success: true,
        data: customer,
        message: `Selected customer: ${customer.name}`,
      };
    },
  },
  {
    name: "getCartContents",
    description:
      "Returns the current POS cart contents including items, total, and branch ID. Returns null if no active cart.",
    type: "context",
    minRole: "vendedor",
    category: "context",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (): Promise<ToolResult> => {
      const cart = contextStore.cartContents;
      if (!cart) {
        return {
          success: true,
          data: null,
          message: "No active cart",
        };
      }
      return {
        success: true,
        data: cart,
        message: `Cart: ${cart.items.length} items, total ${cart.total}`,
      };
    },
  },
];

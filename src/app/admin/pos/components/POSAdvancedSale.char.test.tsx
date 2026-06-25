/**
 * Characterization test for POSAdvancedSale
 *
 * Captures current behavior before/after extraction.
 * Tests public API of each extracted module.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock all external dependencies at module level
vi.mock("@/lib/api/services/customerService", () => ({
  createCustomer: vi.fn(),
  getPrescriptions: vi.fn(),
}));
vi.mock("@/lib/api/services/productService", () => ({
  searchProducts: vi.fn(),
}));
vi.mock("@/lib/api/services/quoteSettingsService", () => ({
  quoteSettingsService: { get: vi.fn() },
}));
vi.mock("@/lib/api/services/quoteService", () => ({
  createQuote: vi.fn(),
}));
vi.mock("@/lib/utils", () => ({
  formatCurrency: (n: number) => `$${String(n)}`,
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));
vi.mock("./ContactLensSelector", () => ({
  ContactLensSelector: () => null,
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => {
  const ICONS = [
    "Check",
    "Glasses",
    "Package",
    "Search",
    "Sparkles",
    "Tag",
    "User",
    "X",
    "CircleDot",
    "ChevronDown",
    "ChevronUp",
  ];
  const mock: Record<string, () => null> = {};
  for (const name of ICONS) {
    mock[name] = () => null;
  }
  return mock;
});

// Mock all shadcn UI component modules used by POSAdvancedSale
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "span",
      { ...props, "data-testid": "badge" },
      children as React.ReactNode,
    ),
  badgeVariants: () => "",
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "button",
      { ...props, "data-testid": "button" },
      children as React.ReactNode,
    ),
  buttonVariants: () => "",
}));
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "div",
      { ...props, "data-testid": "card" },
      children as React.ReactNode,
    ),
  CardHeader: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "div",
      { ...props, "data-testid": "card-header" },
      children as React.ReactNode,
    ),
  CardTitle: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "h3",
      { ...props, "data-testid": "card-title" },
      children as React.ReactNode,
    ),
  CardContent: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "div",
      { ...props, "data-testid": "card-content" },
      children as React.ReactNode,
    ),
}));
vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement("input", { ...props, "data-testid": "input" }),
}));
vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "label",
      { ...props, "data-testid": "label" },
      children as React.ReactNode,
    ),
}));
vi.mock("@/components/ui/radio-group", () => ({
  RadioGroup: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "div",
      { ...props, "data-testid": "radio-group" },
      children as React.ReactNode,
    ),
  RadioGroupItem: (props: Record<string, unknown>) =>
    React.createElement("input", {
      ...props,
      type: "radio",
      "data-testid": "radio-item",
    }),
}));
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "div",
      { ...props, "data-testid": "scroll-area" },
      children as React.ReactNode,
    ),
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "div",
      { ...props, "data-testid": "select" },
      children as React.ReactNode,
    ),
  SelectTrigger: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "button",
      { ...props, "data-testid": "select-trigger" },
      children as React.ReactNode,
    ),
  SelectContent: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "div",
      { ...props, "data-testid": "select-content" },
      children as React.ReactNode,
    ),
  SelectItem: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "div",
      { ...props, "data-testid": "select-item" },
      children as React.ReactNode,
    ),
  SelectValue: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "span",
      { ...props, "data-testid": "select-value" },
      children as React.ReactNode,
    ),
}));
vi.mock("@/components/ui/separator", () => ({
  Separator: (props: Record<string, unknown>) =>
    React.createElement("hr", { ...props, "data-testid": "separator" }),
}));
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "div",
      { ...props, "data-testid": "tabs" },
      children as React.ReactNode,
    ),
  TabsList: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "div",
      { ...props, "data-testid": "tabs-list" },
      children as React.ReactNode,
    ),
  TabsTrigger: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "button",
      { ...props, "data-testid": "tabs-trigger" },
      children as React.ReactNode,
    ),
  TabsContent: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "div",
      { ...props, "data-testid": "tabs-content" },
      children as React.ReactNode,
    ),
}));

import { POSAdvancedSale } from "./POSAdvancedSale";
import type {
  POSProduct,
  OrderFormData,
  ExternalPrescriptionData,
  Treatment,
  POSAdvancedSaleProps,
} from "./POSAdvancedSale.types";

const defaultProps = {
  customer: null,
  onCustomerChange: vi.fn(),
  onAddToCart: vi.fn(),
  branchId: "branch-1",
  selectedQuote: null,
};

describe("POSAdvancedSale types", () => {
  it("exports POSProduct type", () => {
    const p: POSProduct = { id: "1", name: "test", price: 100 };
    expect(p.id).toBe("1");
  });

  it("exports OrderFormData type", () => {
    const d: OrderFormData = {
      lens_family_id: null,
      lens_family_name: null,
      near_lens_family_id: null,
      near_lens_family_name: null,
      lens_type: "vision",
      lens_sourcing_type: "surfaced",
      presbyopia_solution: "single",
      treatment_ids: [],
      labor_cost: 0,
      frame_name: "",
      frame_sku: "",
      near_frame_name: "",
      near_frame_sku: "",
      customer_own_frame: false,
      notes: "",
    };
    expect(d.lens_type).toBe("vision");
  });

  it("exports ExternalPrescriptionData type", () => {
    const e: ExternalPrescriptionData = {
      prescription_date: "",
      expiration_date: "",
      prescription_number: "",
      issued_by: "",
      issued_by_license: "",
      od_sphere: "",
      od_cylinder: "",
      od_axis: "",
      od_add: "",
      os_sphere: "",
      os_cylinder: "",
      os_axis: "",
      os_add: "",
      pd: "",
      near_pd: "",
      frame_pd: "",
      height_segmentation: "",
    };
    expect(e.pd).toBe("");
  });

  it("exports Treatment type", () => {
    const t: Treatment = {
      id: "t1",
      label: "Test",
      value: "test",
      cost: 100,
      category: "coating",
    };
    expect(t.cost).toBe(100);
  });

  it("exports POSAdvancedSaleProps type", () => {
    const p: POSAdvancedSaleProps["customer"] = null;
    expect(p).toBeNull();
  });
});

describe("POSAdvancedSale", () => {
  it("renders without crashing", () => {
    const { container } = render(<POSAdvancedSale {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it("renders tab navigation", () => {
    render(<POSAdvancedSale {...defaultProps} />);
    expect(screen.getByText("Cliente")).toBeTruthy();
    expect(screen.getByText("Marco")).toBeTruthy();
    expect(screen.getByText("Lentes")).toBeTruthy();
    expect(screen.getByText("Precios")).toBeTruthy();
  });

  it("renders customer tab content", () => {
    render(<POSAdvancedSale {...defaultProps} />);
    expect(screen.getByText("Cliente y Receta")).toBeTruthy();
  });

  it("renders with a customer", () => {
    const props = {
      ...defaultProps,
      customer: {
        id: "cust-1",
        first_name: "Juan",
        last_name: "Pérez",
        email: "juan@test.cl",
      },
    };
    render(<POSAdvancedSale {...props} />);
    expect(screen.getAllByText(/Juan.*Pérez/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders quick customer info", () => {
    const props = {
      ...defaultProps,
      quickCustomerName: "Cliente Rápido",
      quickCustomerRUT: "12.345.678-9",
    };
    render(<POSAdvancedSale {...props} />);
    expect(screen.getAllByText("Cliente Rápido").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("renders with selected quote data", () => {
    const props = {
      ...defaultProps,
      selectedQuote: {
        id: "quote-1",
        quote_number: "COT-001",
        total_amount: 150000,
        lens_type: "vision",
        labor_cost: 25000,
      },
    };
    const { container } = render(<POSAdvancedSale {...props} />);
    expect(container).toBeTruthy();
  });
});

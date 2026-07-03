/**
 * Unit tests for agreementService.
 *
 * Mocks ApiClient via globalThis-shared mock instance injected through
 * a plain constructor function. Raw fetch calls (updateAgreementStatus,
 * getAgreementAnalytics) are mocked via global.fetch.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock ApiClient — share mock client instance via globalThis
// ---------------------------------------------------------------------------
vi.mock("@/lib/api/client-helpers", () => {
  const client = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  (globalThis as unknown as Record<string, unknown>).__aptMockClient__ = client;

  function isSuccess(r: Record<string, unknown>): boolean {
    return r?.success === true;
  }
  function unwrapData<T>(response: Record<string, unknown>): T {
    if (isSuccess(response)) return response.data as T;
    const err = response?.error as Record<string, unknown> | undefined;
    const m = err?.message ?? "An unknown error occurred";
    throw new Error(m as string);
  }
  function handlePaginatedResponse(r: Record<string, unknown>) {
    if (isSuccess(r)) {
      const data = (r.data ?? []) as unknown[];
      const pagination = (
        (r.meta as Record<string, unknown>)?.pagination as Record<string, unknown>
      ) || { page: 1, limit: 10, total: data.length, totalPages: 1 };
      return { data, pagination, isSuccess: true as const };
    }
    return {
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      isSuccess: false as const,
      error: ((r?.error as Record<string, unknown>)?.message as string) ?? "Unknown error",
    };
  }

  class MockApiClient {
    constructor() {
      return client;
    }
  }

  return {
    ApiClient: MockApiClient,
    isSuccess,
    unwrapData,
    handlePaginatedResponse,
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/lib/api/services/errorService", () => ({
  handleApiError: vi.fn(),
}));

const mockFetchJson = vi.fn();
vi.stubGlobal(
  "fetch",
  vi.fn().mockImplementation(() =>
    Promise.resolve({ ok: true, json: mockFetchJson }),
  ),
);

function getMockClient() {
  return (globalThis as unknown as Record<string, unknown>)
    .__aptMockClient__ as Record<string, ReturnType<typeof vi.fn>>;
}

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------
import {
  agreementService,
  getAgreements,
  getAgreement,
  createAgreement,
  updateAgreement,
  updateAgreementStatus,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  getInstitutionalBalances,
  reconcileBalances,
  getAgreementInvoices,
  getAgreementInvoice,
  getAgreementCustomers,
  getAgreementAnalytics,
} from "@/lib/api/services/agreementService";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockAgreement = {
  id: "agr-001",
  organization_id: "org-001",
  branch_id: null,
  name: "Convenio Clínica Los Andes",
  agreement_type: "empresa" as const,
  institution_name: "Clínica Los Andes",
  institution_rut: "76.123.456-7",
  representative_name: "Carlos Muñoz",
  representative_email: "carlos@clinicla.cl",
  representative_phone: null,
  valid_from: "2025-01-01",
  valid_until: "2025-12-31",
  status: "active" as const,
  discount_percent: 10,
  notes: null,
  created_at: "2025-01-01T12:00:00Z",
  updated_at: "2025-06-01T12:00:00Z",
};

const mockAgreementList = [mockAgreement];

const mockPurchaseOrder = {
  id: "po-001",
  agreement_id: "agr-001",
  oc_number: "OC-2025-001",
  issued_at: "2025-01-15",
  valid_until: "2025-06-30",
  max_amount: 5000000,
  used_amount: 1200000,
  status: "active" as const,
  notes: null,
  created_at: "2025-01-15T10:00:00Z",
  updated_at: "2025-01-15T10:00:00Z",
};

const mockBalance = {
  id: "bal-001",
  agreement_id: "agr-001",
  order_id: "order-001",
  purchase_order_id: "po-001",
  amount: 150000,
  status: "pending" as const,
  paid_at: null,
  payment_reference: null,
  created_at: "2025-03-01T12:00:00Z",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("agreementService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAgreements", () => {
    it("returns paginated list on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockAgreementList,
        meta: {
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          timestamp: "2025-06-01T12:00:00Z",
        },
      });

      const result = await getAgreements({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("Convenio Clínica Los Andes");
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/agreements"),
        expect.any(Object),
      );
    });

    it("passes branchId as x-branch-id header", async () => {
      getMockClient().get.mockResolvedValue({ success: true, data: [] });

      await getAgreements({ branchId: "branch-001" });

      const [, options] = getMockClient().get.mock.calls[0];
      expect((options as Record<string, unknown>).headers).toEqual({
        "Content-Type": "application/json",
        "x-branch-id": "branch-001",
      });
    });

    it("throws on API error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Error de conexión a base de datos",
          timestamp: "2025-06-01T12:00:00Z",
        },
      });

      await expect(getAgreements()).rejects.toThrow("Error de conexión a base de datos");
    });
  });

  describe("getAgreement", () => {
    it("returns agreement by id", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockAgreement,
      });

      const result = await getAgreement("agr-001");

      expect(result.id).toBe("agr-001");
      expect(result.institution_name).toBe("Clínica Los Andes");
      expect(getMockClient().get).toHaveBeenCalledWith(
        "/api/admin/agreements/agr-001",
      );
    });

    it("throws on not found", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Convenio no encontrado",
          timestamp: "2025-06-01T12:00:00Z",
        },
      });

      await expect(getAgreement("nonexistent")).rejects.toThrow(
        "Convenio no encontrado",
      );
    });
  });

  describe("createAgreement", () => {
    it("creates and returns agreement", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: mockAgreement,
      });

      const result = await createAgreement({
        name: "Convenio Clínica Los Andes",
        agreement_type: "empresa",
        institution_name: "Clínica Los Andes",
        institution_rut: "76.123.456-7",
        valid_from: "2025-01-01",
      });

      expect(result.id).toBe("agr-001");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/agreements",
        expect.objectContaining({ name: "Convenio Clínica Los Andes" }),
      );
    });

    it("throws on validation error", async () => {
      getMockClient().post.mockResolvedValue({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "RUT inválido",
          timestamp: "2025-06-01T12:00:00Z",
        },
      });

      await expect(
        createAgreement({
          name: "Test",
          agreement_type: "empresa",
          institution_name: "Test",
          institution_rut: "invalid",
          valid_from: "2025-01-01",
        }),
      ).rejects.toThrow("RUT inválido");
    });
  });

  describe("updateAgreement", () => {
    it("updates and returns the agreement", async () => {
      getMockClient().put.mockResolvedValue({
        success: true,
        data: { ...mockAgreement, name: "Updated Name" },
      });

      const result = await updateAgreement("agr-001", { name: "Updated Name" });

      expect(result.name).toBe("Updated Name");
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/agreements/agr-001",
        { name: "Updated Name" },
      );
    });
  });

  describe("updateAgreementStatus", () => {
    it("patches status and returns the agreement", async () => {
      const updated = { ...mockAgreement, status: "suspended" as const };
      mockFetchJson.mockResolvedValue({ data: updated });

      const result = await updateAgreementStatus("agr-001", "suspended");

      expect(result.status).toBe("suspended");
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        "/api/admin/agreements/agr-001/status",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("throws on API error", async () => {
      vi.mocked(global.fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          json: vi.fn().mockResolvedValue({ error: "No se puede suspender" }),
        }),
      );

      await expect(
        updateAgreementStatus("agr-001", "cancelled"),
      ).rejects.toThrow("No se puede suspender");
    });

    it("throws generic error when no message returned", async () => {
      vi.mocked(global.fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          json: vi.fn().mockResolvedValue({}),
        }),
      );

      await expect(
        updateAgreementStatus("agr-001", "cancelled"),
      ).rejects.toThrow("Error al actualizar estado");
    });

    it("throws on network failure", async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

      await expect(
        updateAgreementStatus("agr-001", "suspended"),
      ).rejects.toThrow("Network error");
    });
  });

  describe("getPurchaseOrders", () => {
    it("returns purchase orders on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: [mockPurchaseOrder],
      });

      const result = await getPurchaseOrders("agr-001");

      expect(result).toHaveLength(1);
      expect(result[0].oc_number).toBe("OC-2025-001");
    });

    it("returns empty array on error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "No se encontraron órdenes de compra",
          timestamp: "2025-06-01T12:00:00Z",
        },
      });

      const result = await getPurchaseOrders("agr-001");

      expect(result).toEqual([]);
    });
  });

  describe("createPurchaseOrder", () => {
    it("creates and returns purchase order", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: mockPurchaseOrder,
      });

      const result = await createPurchaseOrder("agr-001", {
        oc_number: "OC-2025-001",
        max_amount: 5000000,
      });

      expect(result.oc_number).toBe("OC-2025-001");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/agreements/agr-001/purchase-orders",
        expect.objectContaining({
          oc_number: "OC-2025-001",
          agreement_id: "agr-001",
        }),
      );
    });
  });

  describe("updatePurchaseOrder", () => {
    it("updates and returns purchase order", async () => {
      const updated = { ...mockPurchaseOrder, status: "exhausted" as const };
      getMockClient().put.mockResolvedValue({
        success: true,
        data: updated,
      });

      const result = await updatePurchaseOrder("po-001", { status: "exhausted" });

      expect(result.status).toBe("exhausted");
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/agreements/purchase-orders/po-001",
        { status: "exhausted" },
      );
    });
  });

  describe("getInstitutionalBalances", () => {
    it("returns balances on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: [mockBalance],
      });

      const result = await getInstitutionalBalances("agr-001");

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(150000);
    });

    it("passes status filter when provided", async () => {
      getMockClient().get.mockResolvedValue({ success: true, data: [] });

      await getInstitutionalBalances("agr-001", "pending");

      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringContaining("status=pending"),
      );
    });

    it("returns empty on error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: { code: "ERROR", message: "Failed" },
      });

      const result = await getInstitutionalBalances("agr-001");

      expect(result).toEqual([]);
    });
  });

  describe("reconcileBalances", () => {
    it("reconciles and returns result with count and balances", async () => {
      const reconcileResult = {
        reconciled_count: 1,
        balances: [{ ...mockBalance, status: "paid" as const, paid_at: "2025-06-01" }],
      };
      getMockClient().post.mockResolvedValue({
        success: true,
        data: reconcileResult,
      });

      const result = await reconcileBalances({
        balance_ids: ["bal-001"],
        paid_at: "2025-06-01",
      });

      expect(result.reconciled_count).toBe(1);
      expect(result.balances).toHaveLength(1);
    });

    it("includes invoice data when emit_invoice is true", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: {
          reconciled_count: 2,
          balances: [],
          invoice: {
            id: "inv-001",
            folio: "FOL-001",
            pdf_url: "https://example.com/invoice.pdf",
          },
        },
      });

      const result = await reconcileBalances({
        balance_ids: ["bal-001", "bal-002"],
        paid_at: "2025-06-01",
        emit_invoice: true,
      });

      expect(result.invoice?.folio).toBe("FOL-001");
    });
  });

  describe("getAgreementInvoices", () => {
    const invoices = [
      {
        id: "inv-001",
        folio: "FOL-001",
        status: "emitted",
        total_amount: 250000,
        period_from: "2025-01-01",
        period_to: "2025-01-31",
        emitted_at: "2025-02-01",
        pdf_url: null,
        created_at: "2025-02-01T10:00:00Z",
      },
    ];

    it("returns paginated invoices on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: invoices,
        meta: {
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      });

      const result = await getAgreementInvoices("agr-001", { page: 1 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
    });

    it("passes query params when provided", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: invoices,
        meta: { pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
      });

      await getAgreementInvoices("agr-001", { status: "emitted", limit: 5 });

      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringMatching(/status=emitted/),
      );
    });

    it("throws when API returns error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: { code: "ERROR", message: "Failed to fetch invoices" },
      });

      await expect(getAgreementInvoices("agr-001")).rejects.toThrow();
    });
  });

  describe("getAgreementInvoice", () => {
    it("returns single invoice", async () => {
      const invoiceData = {
        id: "inv-001",
        folio: "FOL-001",
        status: "emitted",
        total_amount: 250000,
        period_from: "2025-01-01",
        period_to: "2025-01-31",
        emitted_at: null,
        pdf_url: null,
        created_at: "2025-02-01T10:00:00Z",
      };
      getMockClient().get.mockResolvedValue({
        success: true,
        data: invoiceData,
      });

      const result = await getAgreementInvoice("agr-001", "inv-001");

      expect(result.folio).toBe("FOL-001");
      expect(getMockClient().get).toHaveBeenCalledWith(
        "/api/admin/agreements/agr-001/invoices/inv-001",
      );
    });
  });

  describe("getAgreementCustomers", () => {
    const customers = [
      {
        customer_id: "cust-001",
        first_name: "Juan",
        last_name: "Pérez",
        email: "juan@mail.com",
        phone: null,
        rut: "12.345.678-9",
        order_count: 3,
        last_order_at: "2025-05-01",
        total_copago: 45000,
        total_institutional: 180000,
      },
    ];

    it("returns paginated customers on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: customers,
        meta: {
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      });

      const result = await getAgreementCustomers("agr-001");

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it("passes page and limit params", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: customers,
        meta: { pagination: { page: 2, limit: 5, total: 6, totalPages: 2 } },
      });

      const result = await getAgreementCustomers("agr-001", { page: 2, limit: 5 });

      expect(result.pagination.page).toBe(2);
      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
      );
    });

    it("falls back to default pagination when meta is missing", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: customers,
      });

      const result = await getAgreementCustomers("agr-001");

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });
  });

  describe("getAgreementAnalytics", () => {
    const analytics = {
      total_orders: 42,
      unique_customers: 15,
      total_sales: 5000000,
      total_copago: 500000,
      total_institutional: 4500000,
      pending_amount: 1000000,
      paid_amount: 3500000,
      collection_efficiency: 77.8,
    };

    it("returns analytics on success", async () => {
      mockFetchJson.mockResolvedValue({ data: analytics });

      const result = await getAgreementAnalytics("agr-001");

      expect(result.total_orders).toBe(42);
      expect(result.collection_efficiency).toBe(77.8);
    });

    it("passes from/to query params", async () => {
      mockFetchJson.mockResolvedValue({ data: analytics });

      await getAgreementAnalytics("agr-001", "2025-01-01", "2025-06-30");

      const url = (vi.mocked(global.fetch).mock.calls[0][0] as string);
      expect(url).toContain("from=2025-01-01");
      expect(url).toContain("to=2025-06-30");
    });

    it("throws on error response", async () => {
      vi.mocked(global.fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          json: vi.fn().mockResolvedValue({ error: "No data available" }),
        }),
      );

      await expect(getAgreementAnalytics("agr-001")).rejects.toThrow(
        "No data available",
      );
    });

    it("throws generic error when no message returned", async () => {
      vi.mocked(global.fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          json: vi.fn().mockResolvedValue({}),
        }),
      );

      await expect(getAgreementAnalytics("agr-001")).rejects.toThrow(
        "Error al obtener analítica",
      );
    });
  });

  describe("service object", () => {
    it("exposes all methods", () => {
      expect(agreementService.getAgreements).toBe(getAgreements);
      expect(agreementService.getAgreement).toBe(getAgreement);
      expect(agreementService.createAgreement).toBe(createAgreement);
      expect(agreementService.updateAgreement).toBe(updateAgreement);
      expect(agreementService.updateAgreementStatus).toBe(updateAgreementStatus);
      expect(agreementService.getPurchaseOrders).toBe(getPurchaseOrders);
      expect(agreementService.createPurchaseOrder).toBe(createPurchaseOrder);
      expect(agreementService.updatePurchaseOrder).toBe(updatePurchaseOrder);
      expect(agreementService.getInstitutionalBalances).toBe(getInstitutionalBalances);
      expect(agreementService.reconcileBalances).toBe(reconcileBalances);
      expect(agreementService.getAgreementInvoices).toBe(getAgreementInvoices);
      expect(agreementService.getAgreementInvoice).toBe(getAgreementInvoice);
      expect(agreementService.getAgreementCustomers).toBe(getAgreementCustomers);
      expect(agreementService.getAgreementAnalytics).toBe(getAgreementAnalytics);
    });
  });
});

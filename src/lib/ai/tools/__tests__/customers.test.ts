import { beforeEach, describe, expect, it, vi } from "vitest";

import { customerTools } from "../customers";
import { createMockBuilder, createMockSupabase, UUID, makeContext } from "./helpers";

// ponytail: vi.mock hoisting — use string literals, not imported constants
vi.mock("../resolvers", () => ({
  resolveBranchByName: vi.fn().mockResolvedValue("22222222-2222-2222-2222-222222222222"),
}));

describe("customerTools", () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  describe("getCustomers", () => {
    const tool = customerTools.find((t) => t.name === "getCustomers")!;

    it("returns customers with branchId in context", async () => {
      const builder = createMockBuilder({
        data: [{ id: UUID.CUSTOMER, first_name: "Ana", last_name: "López" }],
        error: null,
        count: 1,
      });
      mockSupabase.from.mockReturnValue(builder);

      const result = await tool.execute({}, makeContext({ supabase: mockSupabase }));

      expect(result.success).toBe(true);
      expect(result.data.customers).toHaveLength(1);
      expect(builder.eq).toHaveBeenCalledWith("branch_id", UUID.BRANCH);
    });

    it("queries all branches when no currentBranchId", async () => {
      mockSupabase.from.mockImplementation((table: string) =>
        table === "customers"
          ? createMockBuilder({ data: [{ id: UUID.CUSTOMER, first_name: "Ana" }], error: null, count: 1 })
          : createMockBuilder({ data: [{ id: UUID.BRANCH }, { id: UUID.OTHER_BRANCH }], error: null }),
      );

      const result = await tool.execute(
        {},
        makeContext({ supabase: mockSupabase, currentBranchId: null }),
      );

      expect(result.success).toBe(true);
      expect(result.data.customers).toHaveLength(1);
    });

    it("searches by term", async () => {
      const builder = createMockBuilder({
        data: [{ id: UUID.CUSTOMER, first_name: "Ana" }],
        error: null,
        count: 1,
      });
      mockSupabase.from.mockReturnValue(builder);

      await tool.execute({ search: "Ana" }, makeContext({ supabase: mockSupabase }));

      expect(builder.or).toHaveBeenCalled();
    });

    it("fails without organizationId", async () => {
      const result = await tool.execute(
        {},
        makeContext({ supabase: mockSupabase, organizationId: null }),
      );

      expect(result.success).toBe(false);
    });
  });

  describe("getCustomerById", () => {
    const tool = customerTools.find((t) => t.name === "getCustomerById")!;

    it("returns customer when found", async () => {
      mockSupabase.from.mockImplementation((table: string) =>
        table === "branches"
          ? createMockBuilder({ data: { organization_id: UUID.ORG }, error: null })
          : createMockBuilder({ data: { id: UUID.CUSTOMER, first_name: "Ana", last_name: "López", branch_id: UUID.BRANCH }, error: null }),
      );

      const result = await tool.execute(
        { customerId: UUID.CUSTOMER },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data.first_name).toBe("Ana");
    });

    it("fails when customer not found", async () => {
      mockSupabase.from.mockReturnValue(createMockBuilder({ data: null, error: new Error("Not found") }));

      const result = await tool.execute(
        { customerId: UUID.CUSTOMER },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(false);
    });

    it("fails when customer belongs to another org", async () => {
      mockSupabase.from.mockImplementation((table: string) =>
        table === "branches"
          ? createMockBuilder({ data: { organization_id: UUID.OTHER_ORG }, error: null })
          : createMockBuilder({ data: { id: UUID.CUSTOMER, first_name: "Otro", branch_id: UUID.OTHER_BRANCH }, error: null }),
      );

      const result = await tool.execute(
        { customerId: UUID.CUSTOMER },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Customer not found");
    });
  });

  describe("updateCustomer", () => {
    const tool = customerTools.find((t) => t.name === "updateCustomer")!;

    it("updates customer fields", async () => {
      mockSupabase.from
        .mockReturnValueOnce(createMockBuilder({ data: { id: UUID.CUSTOMER, branch_id: UUID.BRANCH }, error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: { organization_id: UUID.ORG }, error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: { id: UUID.CUSTOMER, first_name: "Ana María" }, error: null }));

      const result = await tool.execute(
        { customerId: UUID.CUSTOMER, updates: { first_name: "Ana María" } },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data.first_name).toBe("Ana María");
    });

    it("fails when customer not found", async () => {
      mockSupabase.from.mockReturnValue(createMockBuilder({ data: null, error: new Error("Not found") }));

      const result = await tool.execute(
        { customerId: UUID.CUSTOMER, updates: { phone: "555" } },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(false);
    });
  });

  describe("getCustomerOrders", () => {
    const tool = customerTools.find((t) => t.name === "getCustomerOrders")!;

    it("returns orders for a customer", async () => {
      mockSupabase.from.mockReturnValue(
        createMockBuilder({ data: [{ id: "o1", order_number: "ORD-001", status: "completed", total_amount: 50000 }], error: null }),
      );

      const result = await tool.execute(
        { customerId: UUID.CUSTOMER },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data.orders).toHaveLength(1);
    });
  });

  describe("getCustomerStats", () => {
    const tool = customerTools.find((t) => t.name === "getCustomerStats")!;

    it("calculates customer stats", async () => {
      mockSupabase.from.mockReturnValue(
        createMockBuilder({
          data: [
            { total_amount: 30000, status: "completed", payment_status: "paid", created_at: "2026-06-01T00:00:00Z" },
            { total_amount: 20000, status: "completed", payment_status: "unpaid", created_at: "2026-05-01T00:00:00Z" },
          ],
          error: null,
        }),
      );

      const result = await tool.execute(
        { customerId: UUID.CUSTOMER },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data.totalOrders).toBe(2);
      expect(result.data.totalSpent).toBe(50000); // both orders have status === "completed"
    });
  });

  describe("deleteCustomer (create)", () => {
    const tool = customerTools.find((t) => t.name === "deleteCustomer")!;

    it("creates a customer (despite tool name)", async () => {
      mockSupabase.from
        .mockReturnValueOnce(createMockBuilder({ data: { id: UUID.BRANCH, organization_id: UUID.ORG }, error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: { id: "c-new", first_name: "Nuevo" }, error: null }));

      const result = await tool.execute(
        { first_name: "Nuevo", last_name: "Cliente" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("creado");
    });
  });
});

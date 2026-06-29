import { beforeEach, describe, expect, it, vi } from "vitest";

import { prescriptionTools } from "../prescriptions";
import { createMockBuilder, createMockSupabase, UUID, makeContext } from "./helpers";

// ponytail: vi.mock hoisting — use string literals, not imported constants
vi.mock("../resolvers", () => ({
  resolveBranchByName: vi.fn().mockResolvedValue("22222222-2222-2222-2222-222222222222"),
  resolveCustomerByNameOrRut: vi.fn().mockResolvedValue("44444444-4444-4444-4444-444444444444"),
  resolvePrescriptionByNumber: vi.fn().mockResolvedValue("77777777-7777-7777-7777-777777777777"),
}));

describe("prescriptionTools", () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  describe("suggestLensFromPrescription", () => {
    const tool = prescriptionTools.find((t) => t.name === "suggestLensFromPrescription")!;

    it("suggests lenses from prescriptionId", async () => {
      mockSupabase.from.mockImplementation((table: string) =>
        table === "lens_families"
          ? createMockBuilder({
              data: [{ id: "lf-1", name: "Visión Simple", brand: "Essilor", lens_type: "single_vision", lens_material: "standard", description: null }],
              error: null,
            })
          : createMockBuilder({
              data: { od_sphere: -2.0, os_sphere: -1.5, od_cylinder: -0.5, os_cylinder: -0.25, od_add: null, os_add: null, prescription_type: "single_vision" },
              error: null,
            }),
      );

      const result = await tool.execute(
        { prescriptionId: UUID.PRESCRIPTION },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data.lensFamilies).toHaveLength(1);
      expect(result.data.prescriptionSummary).toMatchObject({ solution: "none", needsHighIndex: false });
    });

    it("suggests high index for strong prescriptions", async () => {
      mockSupabase.from.mockImplementation((table: string) =>
        table === "lens_families"
          ? createMockBuilder({
              data: [{ id: "lf-2", name: "Alto Índice", brand: "Hoya", lens_type: "single_vision", lens_material: "high_index_1_67", description: null }],
              error: null,
            })
          : createMockBuilder({
              data: { od_sphere: -6.0, os_sphere: -5.5, od_cylinder: -1.0, os_cylinder: -0.75, od_add: null, os_add: null, prescription_type: "single_vision" },
              error: null,
            }),
      );

      const result = await tool.execute(
        { prescriptionId: UUID.PRESCRIPTION },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data.prescriptionSummary.needsHighIndex).toBe(true);
    });

    it("detects presbyopia from addition", async () => {
      mockSupabase.from.mockReturnValue(createMockBuilder({ data: null, error: null }));

      const result = await tool.execute(
        { od_sphere: -1.0, os_sphere: -0.75, od_add: 2.0, os_add: 1.75 },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data.prescriptionSummary.solution).toBe("progressive");
    });

    it("fails without organizationId", async () => {
      const result = await tool.execute(
        { prescriptionId: UUID.PRESCRIPTION },
        makeContext({ supabase: mockSupabase, organizationId: null }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Organization ID is missing in context");
    });

    it("fails when prescription not found", async () => {
      mockSupabase.from.mockReturnValue(
        createMockBuilder({ data: null, error: new Error("Not found") }),
      );

      const result = await tool.execute(
        { prescriptionId: UUID.PRESCRIPTION },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Receta no encontrada");
    });

    it("fails with insufficient params", async () => {
      const result = await tool.execute({}, makeContext({ supabase: mockSupabase }));

      expect(result.success).toBe(false);
    });
  });

  describe("createPrescription", () => {
    const tool = prescriptionTools.find((t) => t.name === "createPrescription")!;

    it("creates a prescription", async () => {
      mockSupabase.from.mockImplementation((table: string) =>
        table === "prescriptions"
          ? createMockBuilder({ data: { id: "rx-new", od_sphere: -2.0, os_sphere: -1.5 }, error: null })
          : createMockBuilder({ data: { organization_id: UUID.ORG, branch_id: UUID.BRANCH }, error: null }),
      );

      const result = await tool.execute(
        { customerNameOrRut: "Juan Perez", od_sphere: -2.0, os_sphere: -1.5 },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ id: "rx-new" });
    });

    it("fails when customer not found", async () => {
      const mod = await import("../resolvers");
      vi.mocked(mod.resolveCustomerByNameOrRut).mockResolvedValueOnce(null);

      const result = await tool.execute(
        { customerNameOrRut: "Nobody", od_sphere: -1.0 },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cliente no encontrado");
    });

    it("fails without organizationId", async () => {
      const result = await tool.execute(
        { customerNameOrRut: "Juan Perez", od_sphere: -1.0 },
        makeContext({ supabase: mockSupabase, organizationId: null }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Organization ID is missing in context");
    });

    it("fails without sphere values", async () => {
      const result = await tool.execute(
        { customerNameOrRut: "Juan Perez" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(false);
    });
  });
});

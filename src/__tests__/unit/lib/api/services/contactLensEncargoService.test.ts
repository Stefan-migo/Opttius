/**
 * Unit tests for contactLensEncargoService.
 *
 * Uses global.fetch directly (no ApiClient wrapper).
 * Mock fetch via vi.fn() on globalThis.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockJson = vi.fn();
const mockFetch = vi.fn().mockImplementation(() =>
  Promise.resolve({ ok: true, json: mockJson }),
);

vi.stubGlobal("fetch", mockFetch);

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------
import { contactLensEncargoService } from "@/lib/api/services/contactLensEncargoService";
import type { CreateEncargoParams } from "@/lib/api/services/contactLensEncargoService";

const validParams: CreateEncargoParams = {
  customer_name: "Juan Pérez",
  customer_rut: "12.345.678-9",
  customer_phone: "+56912345678",
  contact_lens_family_id: "clf-001",
  family_name: "Premium Daily",
  sphere_od: -2.0,
  cylinder_od: 0,
  sphere_os: -2.5,
  cylinder_os: 0,
  quantity: 2,
  notes: "Urgente",
};

const mockEncargo = {
  id: "enc-001",
  organization_id: "org-001",
  branch_id: "branch-001",
  customer_name: "Juan Pérez",
  customer_rut: "12.345.678-9",
  customer_phone: "+56912345678",
  contact_lens_family_id: "clf-001",
  family_name: "Premium Daily",
  family_brand: "Acuvue",
  sphere_od: -2.0,
  cylinder_od: 0,
  sphere_os: -2.5,
  cylinder_os: 0,
  quantity: 2,
  status: "pending",
  notes: "Urgente",
  created_at: "2025-07-10T12:00:00Z",
  updated_at: "2025-07-10T12:00:00Z",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("contactLensEncargoService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates an encargo successfully", async () => {
      mockJson.mockResolvedValue({ data: mockEncargo });

      const result = await contactLensEncargoService.create(validParams);

      expect(result).toEqual(mockEncargo);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/contact-lens-encargos",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validParams),
        },
      );
    });

    it("throws on validation error", async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          json: mockJson.mockResolvedValue({
            error: { message: "El campo sphere_od es requerido" },
          }),
        }),
      );

      await expect(
        contactLensEncargoService.create({
          ...validParams,
          sphere_od: undefined as unknown as number,
        }),
      ).rejects.toThrow("El campo sphere_od es requerido");
    });

    it("throws on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        contactLensEncargoService.create(validParams),
      ).rejects.toThrow("Network error");
    });

    it("throws generic error message when API error has no message", async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          json: mockJson.mockResolvedValue({ error: {} }),
        }),
      );

      await expect(
        contactLensEncargoService.create(validParams),
      ).rejects.toThrow("Error al crear encargo");
    });
  });
});

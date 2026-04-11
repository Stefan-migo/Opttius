/**
 * Unit tests for MercadoPagoGateway (mapStatus and behavior).
 */

import { describe, expect, it } from "vitest";

import { MercadoPagoGateway } from "@/lib/payments/mercadopago/gateway";

describe("MercadoPagoGateway", () => {
  const gateway = new MercadoPagoGateway();

  describe("mapStatus", () => {
    it("should map pending status correctly", () => {
      expect(gateway.mapStatus("pending")).toBe("pending");
      expect(gateway.mapStatus("in_process")).toBe("pending");
    });

    it("should map approved status to succeeded", () => {
      expect(gateway.mapStatus("approved")).toBe("succeeded");
    });

    it("should map rejected status to failed", () => {
      expect(gateway.mapStatus("rejected")).toBe("failed");
      expect(gateway.mapStatus("cancelled")).toBe("failed");
    });

    it("should map refunded status correctly", () => {
      expect(gateway.mapStatus("refunded")).toBe("refunded");
    });

    it("should map unknown status to pending", () => {
      expect(gateway.mapStatus("unknown_status")).toBe("pending");
      expect(gateway.mapStatus("")).toBe("pending");
    });
  });
});

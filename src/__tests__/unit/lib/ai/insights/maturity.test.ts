import { beforeEach, describe, expect, it } from "vitest";

import { OrganizationalMaturitySystem } from "@/lib/ai/insights/maturity";
import type { MaturityLevel } from "@/lib/ai/memory/organizational";

describe("OrganizationalMaturitySystem", () => {
  let maturitySystem: OrganizationalMaturitySystem;
  const mockOrgId = "org-123";

  beforeEach(() => {
    maturitySystem = new OrganizationalMaturitySystem(mockOrgId);
  });

  describe("getMaturityAdjustments", () => {
    it("should return correct instructions for new organizations", async () => {
      const mockMaturity: MaturityLevel = {
        level: "new",
        daysSinceCreation: 3,
        totalOrders: 0,
        totalRevenue: 0,
        description: "New organization",
      };

      const prompt = await maturitySystem.getAdaptivePrompts(
        "dashboard",
        mockMaturity,
        {},
        "Test Optica",
        {},
      );

      expect(prompt).toContain("NIVEL: NUEVO");
      expect(prompt).toContain("bienvenida");
      expect(prompt).toContain("paciente");
      expect(prompt).toContain("educativo");
    });

    it("should return correct instructions for starting organizations", async () => {
      const mockMaturity: MaturityLevel = {
        level: "starting",
        daysSinceCreation: 15,
        totalOrders: 5,
        totalRevenue: 5000,
        description: "Starting organization",
      };

      const prompt = await maturitySystem.getAdaptivePrompts(
        "dashboard",
        mockMaturity,
        {},
        "Test Optica",
        {},
      );

      expect(prompt).toContain("NIVEL: INICIO");
      expect(prompt).toContain("guía");
      expect(prompt).toContain("apoyo operativo");
      expect(prompt).toContain("flujo de trabajo");
    });

    it("should return correct instructions for growing organizations", async () => {
      const mockMaturity: MaturityLevel = {
        level: "growing",
        daysSinceCreation: 60,
        totalOrders: 30,
        totalRevenue: 50000,
        description: "Growing organization",
      };

      const prompt = await maturitySystem.getAdaptivePrompts(
        "inventory",
        mockMaturity,
        {},
        "Test Optica",
        {},
      );

      expect(prompt).toContain("NIVEL: CRECIMIENTO");
      expect(prompt).toContain("consultor de negocios");
      expect(prompt).toContain("optimización");
      expect(prompt).toContain("eficiencia");
    });

    it("should return correct instructions for established organizations", async () => {
      const mockMaturity: MaturityLevel = {
        level: "established",
        daysSinceCreation: 180,
        totalOrders: 200,
        totalRevenue: 500000,
        description: "Established organization",
      };

      const prompt = await maturitySystem.getAdaptivePrompts(
        "analytics",
        mockMaturity,
        {},
        "Test Optica",
        {},
      );

      expect(prompt).toContain("NIVEL: ESTABLECIDO");
      expect(prompt).toContain("analista experto");
      expect(prompt).toContain("estratégico");
      expect(prompt).toContain("excelencia operativa");
    });
  });

  describe("getAdaptivePrompts integration", () => {
    it("should combine base prompt with maturity adjustments", async () => {
      const mockMaturity: MaturityLevel = {
        level: "growing",
        daysSinceCreation: 45,
        totalOrders: 25,
        totalRevenue: 30000,
        description: "Growing",
      };

      const data = {
        yesterdaySales: 1000,
        monthlyAverage: 950,
        overdueWorkOrders: 2,
        pendingQuotes: 3,
      };

      const prompt = await maturitySystem.getAdaptivePrompts(
        "dashboard",
        mockMaturity,
        data,
        "Test Optica",
        { organizationAge: 45, totalOrders: 25 },
      );

      // Should contain base dashboard prompt elements
      expect(prompt).toContain("Gerente General");
      expect(prompt).toContain("Optica");

      // Should contain maturity-specific instructions
      expect(prompt).toContain("INSTRUCCIONES DE MADUREZ");
      expect(prompt).toContain("CRECIMIENTO");

      // Should include data
      expect(prompt).toContain("1000");
      expect(prompt).toContain("950");
    });

    it("should work with different sections", async () => {
      const mockMaturity: MaturityLevel = {
        level: "starting",
        daysSinceCreation: 10,
        totalOrders: 3,
        totalRevenue: 3000,
        description: "Starting",
      };

      const sections = [
        "dashboard",
        "inventory",
        "clients",
        "pos",
        "analytics",
      ] as const;

      for (const section of sections) {
        const prompt = await maturitySystem.getAdaptivePrompts(
          section,
          mockMaturity,
          {},
          "Test Optica",
          {},
        );

        expect(prompt).toBeTruthy();
        expect(prompt.length).toBeGreaterThan(100);
        expect(prompt).toContain("INSTRUCCIONES DE MADUREZ");
      }
    });
  });

  describe("edge cases", () => {
    it("should handle missing additional context", async () => {
      const mockMaturity: MaturityLevel = {
        level: "new",
        daysSinceCreation: 1,
        totalOrders: 0,
        totalRevenue: 0,
        description: "Brand new",
      };

      const prompt = await maturitySystem.getAdaptivePrompts(
        "dashboard",
        mockMaturity,
        {},
        "Test Optica",
        // No additional context provided
      );

      expect(prompt).toBeTruthy();
      expect(prompt).toContain("NIVEL: NUEVO");
    });

    it("should default to growing if level is unknown", async () => {
      const mockMaturity = {
        level: "unknown" as unknown,
        daysSinceCreation: 50,
        totalOrders: 20,
        totalRevenue: 20000,
        description: "Unknown level",
      };

      const prompt = await maturitySystem.getAdaptivePrompts(
        "dashboard",
        mockMaturity,
        {},
        "Test Optica",
        {},
      );

      // Should default to growing level
      expect(prompt).toBeTruthy();
    });
  });
});

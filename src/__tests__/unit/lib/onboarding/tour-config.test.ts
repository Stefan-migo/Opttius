/**
 * Unit tests for tour-config — static tour configuration and filtering.
 *
 * Pure data/config — no mocking needed.
 */
import { describe, expect, it } from "vitest";

import {
  getTourStepsForUser,
  TOUR_CONFIG,
  TOUR_STEPS,
} from "@/lib/onboarding/tour-config";

describe("TOUR_STEPS", () => {
  it("should have exactly 9 steps", () => {
    expect(TOUR_STEPS).toHaveLength(9);
  });

  it("should have required fields on every step", () => {
    for (const step of TOUR_STEPS) {
      expect(step.id).toBeTruthy();
      expect(step.section).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.description).toBeTruthy();
      expect(step.selector).toBeTruthy();
      expect(step.keyActions).toBeInstanceOf(Array);
      expect(step.keyActions.length).toBeGreaterThan(0);
    }
  });

  it("should have unique step ids", () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have valid positions", () => {
    const validPositions = ["top", "bottom", "left", "right", "center"];
    for (const step of TOUR_STEPS) {
      expect(validPositions).toContain(step.position);
    }
  });

  it("should have valid selectors starting with [data-tour", () => {
    for (const step of TOUR_STEPS) {
      expect(step.selector).toMatch(/^\[data-tour/);
    }
  });

  it("should have steps covering key optical shop sections", () => {
    const sections = TOUR_STEPS.map((s) => s.section);
    expect(sections).toContain("dashboard");
    expect(sections).toContain("customers");
    expect(sections).toContain("products");
    expect(sections).toContain("quotes");
    expect(sections).toContain("work-orders");
    expect(sections).toContain("appointments");
    expect(sections).toContain("pos");
    expect(sections).toContain("analytics");
    expect(sections).toContain("system");
  });

  it("should have at least 2 key actions per step", () => {
    for (const step of TOUR_STEPS) {
      expect(step.keyActions.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("TOUR_CONFIG", () => {
  it("should have enabled set to false", () => {
    expect(TOUR_CONFIG.enabled).toBe(false);
  });

  it("should have autoStart enabled", () => {
    expect(TOUR_CONFIG.autoStart).toBe(true);
  });

  it("should allow skipping and restarting", () => {
    expect(TOUR_CONFIG.allowSkip).toBe(true);
    expect(TOUR_CONFIG.allowRestart).toBe(true);
  });

  it("should show progress", () => {
    expect(TOUR_CONFIG.showProgress).toBe(true);
  });

  it("should have valid numeric timing values", () => {
    expect(TOUR_CONFIG.highlightDelay).toBeGreaterThanOrEqual(0);
    expect(TOUR_CONFIG.animationDuration).toBeGreaterThanOrEqual(0);
  });

  it("should have a base path for mockup pages", () => {
    expect(TOUR_CONFIG.mockupBasePath).toBe("/admin/tour");
  });
});

describe("getTourStepsForUser", () => {
  it("should return all steps when no role is provided", () => {
    const steps = getTourStepsForUser();
    expect(steps).toEqual(TOUR_STEPS);
    expect(steps).toHaveLength(9);
  });

  it("should return all steps for admin role", () => {
    const steps = getTourStepsForUser("admin");
    expect(steps).toEqual(TOUR_STEPS);
    expect(steps).toHaveLength(9);
  });

  it("should return all steps for super_admin role", () => {
    const steps = getTourStepsForUser("super_admin");
    expect(steps).toEqual(TOUR_STEPS);
    expect(steps).toHaveLength(9);
  });

  it("should return all steps for employee role", () => {
    const steps = getTourStepsForUser("employee");
    expect(steps).toEqual(TOUR_STEPS);
    expect(steps).toHaveLength(9);
  });

  it("should return a copy with the same content", () => {
    const steps = getTourStepsForUser();
    expect(steps).toEqual(TOUR_STEPS);
  });
});

describe("step with actionUrl", () => {
  it("should have actionUrl and actionLabel on specific steps", () => {
    const stepsWithAction = TOUR_STEPS.filter((s) => s.actionUrl);
    expect(stepsWithAction.length).toBeGreaterThanOrEqual(3);

    for (const step of stepsWithAction) {
      expect(step.actionLabel).toBeTruthy();
      expect(step.actionUrl).toMatch(/^\/admin\//);
    }
  });
});

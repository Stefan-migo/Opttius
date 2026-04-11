import { describe, expect, it } from "vitest";

import AppointmentDetails from "../AppointmentDetails";

describe("Component Import Test", () => {
  it("should import AppointmentDetails component", () => {
    expect(AppointmentDetails).toBeDefined();
    expect(typeof AppointmentDetails).toBe("function");
  });
});

import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Basic Test", () => {
  it("should validate email correctly", () => {
    const emailSchema = z.string().email();
    expect(() => emailSchema.parse("test@example.com")).not.toThrow();
    expect(() => emailSchema.parse("invalid-email")).toThrow();
  });
});

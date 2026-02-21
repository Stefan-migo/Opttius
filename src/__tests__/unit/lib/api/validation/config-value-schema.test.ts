import { describe, it, expect } from "vitest";
import { createConfigValueSchema } from "@/lib/api/validation/zod-schemas";

describe("createConfigValueSchema", () => {
  describe("string", () => {
    it("accepts string and transforms to string", () => {
      const schema = createConfigValueSchema("string");
      expect(schema.parse("hello")).toBe("hello");
      expect(schema.parse("")).toBe("");
    });

    it("accepts number and transforms to string", () => {
      const schema = createConfigValueSchema("string");
      expect(schema.parse(42)).toBe("42");
      expect(schema.parse(0)).toBe("0");
    });

    it("accepts boolean and transforms to string", () => {
      const schema = createConfigValueSchema("string");
      expect(schema.parse(true)).toBe("true");
      expect(schema.parse(false)).toBe("false");
    });
  });

  describe("number", () => {
    it("accepts number", () => {
      const schema = createConfigValueSchema("number");
      expect(schema.parse(19)).toBe(19);
      expect(schema.parse(0)).toBe(0);
    });

    it("accepts string numeric and transforms", () => {
      const schema = createConfigValueSchema("number");
      expect(schema.parse("19")).toBe(19);
      expect(schema.parse("3.14")).toBe(3.14);
    });

    it("rejects NaN", () => {
      const schema = createConfigValueSchema("number");
      expect(() => schema.parse("abc")).toThrow();
    });

    it("rejects Infinity", () => {
      const schema = createConfigValueSchema("number");
      expect(() => schema.parse(Infinity)).toThrow();
    });
  });

  describe("boolean", () => {
    it("accepts boolean", () => {
      const schema = createConfigValueSchema("boolean");
      expect(schema.parse(true)).toBe(true);
      expect(schema.parse(false)).toBe(false);
    });

    it("accepts 'true' and '1' as truthy", () => {
      const schema = createConfigValueSchema("boolean");
      expect(schema.parse("true")).toBe(true);
      expect(schema.parse("1")).toBe(true);
    });

    it("treats other strings as false", () => {
      const schema = createConfigValueSchema("boolean");
      expect(schema.parse("false")).toBe(false);
      expect(schema.parse("0")).toBe(false);
      expect(schema.parse("abc")).toBe(false);
    });
  });

  describe("json", () => {
    it("accepts object", () => {
      const schema = createConfigValueSchema("json");
      const obj = { a: 1, b: "x" };
      expect(schema.parse(obj)).toEqual(obj);
    });

    it("accepts array", () => {
      const schema = createConfigValueSchema("json");
      const arr = [1, 2, "x"];
      expect(schema.parse(arr)).toEqual(arr);
    });

    it("rejects primitives", () => {
      const schema = createConfigValueSchema("json");
      expect(() => schema.parse("hello")).toThrow();
      expect(() => schema.parse(42)).toThrow();
      expect(() => schema.parse(true)).toThrow();
    });
  });

  describe("array", () => {
    it("accepts array", () => {
      const schema = createConfigValueSchema("array");
      const arr = [1, "a", { x: 1 }];
      expect(schema.parse(arr)).toEqual(arr);
    });

    it("rejects object", () => {
      const schema = createConfigValueSchema("array");
      expect(() => schema.parse({ a: 1 })).toThrow();
    });
  });

  describe("default (unknown type)", () => {
    it("accepts unknown", () => {
      const schema = createConfigValueSchema("other");
      expect(schema.parse("anything")).toBe("anything");
      expect(schema.parse(123)).toBe(123);
    });
  });
});

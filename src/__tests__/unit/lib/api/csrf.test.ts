import { describe, expect, it } from "vitest";

import { validateCsrfOrigin } from "@/lib/api/csrf";

describe("validateCsrfOrigin", () => {
  it("should allow same-origin Origin header", () => {
    const headers = new Headers({ origin: "http://localhost:3000" });
    const result = validateCsrfOrigin(headers);
    expect(result.valid).toBe(true);
  });

  it("should fall back to Referer when Origin is missing", () => {
    const headers = new Headers({ referer: "http://localhost:3000/orders" });
    const result = validateCsrfOrigin(headers);
    expect(result.valid).toBe(true);
  });

  it("should reject mismatched Origin", () => {
    const headers = new Headers({ origin: "https://evil-site.com" });
    const result = validateCsrfOrigin(headers);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("not allowed");
  });

  it("should reject when both Origin and Referer are missing", () => {
    const headers = new Headers();
    const result = validateCsrfOrigin(headers);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Missing");
  });

  it("should accept localhost:3000 even when APP_URL is production", () => {
    // This test explicitly sets APP_URL to a production value to verify localhost bypass
    const headers = new Headers({ origin: "http://localhost:3000" });
    const result = validateCsrfOrigin(headers, {
      appUrl: "https://app.opttius.com",
    });
    expect(result.valid).toBe(true);
  });

  it("should reject non-parseable Origin URL", () => {
    const headers = new Headers({ origin: "not-a-valid-url" });
    const result = validateCsrfOrigin(headers);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Invalid");
  });

  it("should reject external webhook origins (function itself is origin-blind)", () => {
    const headers = new Headers({
      origin: "https://ip-origin.paypal.com",
    });
    const result = validateCsrfOrigin(headers, {
      appUrl: "https://app.opttius.com",
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("not allowed");
  });
});

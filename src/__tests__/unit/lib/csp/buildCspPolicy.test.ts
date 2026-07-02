import { describe, it, expect } from "vitest";

// buildCspPolicy will be exported from middleware.ts in the implementation
import { buildCspPolicy } from "@/middleware";

const NONCE = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const SUPABASE_URL = "https://project.supabase.co";
const DEV_SUPABASE_URL = "http://127.0.0.1:54321";

describe("buildCspPolicy", () => {
  it("includes nonce in script-src and style-src", () => {
    const csp = buildCspPolicy(NONCE, false, SUPABASE_URL);
    expect(csp).toContain(`'nonce-${NONCE}'`);
    expect(csp).toContain("script-src");
    expect(csp).toContain("style-src");
  });

  it("includes strict-dynamic in script-src", () => {
    const csp = buildCspPolicy(NONCE, false, SUPABASE_URL);
    const scriptSrc = extractDirective(csp, "script-src");
    expect(scriptSrc).toContain("strict-dynamic");
  });

  it("does NOT include unsafe-inline in script-src", () => {
    const csp = buildCspPolicy(NONCE, false, SUPABASE_URL);
    const scriptSrc = extractDirective(csp, "script-src");
    expect(scriptSrc).not.toContain("unsafe-inline");
  });

  it("does NOT include unsafe-eval in script-src", () => {
    const csp = buildCspPolicy(NONCE, false, SUPABASE_URL);
    const scriptSrc = extractDirective(csp, "script-src");
    expect(scriptSrc).not.toContain("unsafe-eval");
  });

  it("keeps Mercado Pago domains in script-src", () => {
    const csp = buildCspPolicy(NONCE, false, SUPABASE_URL);
    const scriptSrc = extractDirective(csp, "script-src");
    expect(scriptSrc).toContain("sdk.mercadopago.com");
    expect(scriptSrc).toContain("http2.mlstatic.com");
  });

  it("removes GTM domains from script-src", () => {
    const csp = buildCspPolicy(NONCE, false, SUPABASE_URL);
    const scriptSrc = extractDirective(csp, "script-src");
    expect(scriptSrc).not.toContain("googletagmanager.com");
    // www.gstatic.com is GTM; fonts.gstatic.com is a legitimate font CDN — check script-src only
    expect(scriptSrc).not.toContain("gstatic");
    expect(scriptSrc).not.toContain("www.google.com");
    // www.google.com stays in frame-src for Google Sign-In/Recaptcha
    const frameSrc = extractDirective(csp, "frame-src");
    expect(frameSrc).toContain("www.google.com");
  });

  it("keeps style-src unsafe-inline with ponytail comment", () => {
    const csp = buildCspPolicy(NONCE, false, SUPABASE_URL);
    const styleSrc = extractDirective(csp, "style-src");
    expect(styleSrc).toContain("unsafe-inline");
  });

  it("includes upgrade-insecure-requests only in production", () => {
    const prodCsp = buildCspPolicy(NONCE, true, SUPABASE_URL);
    expect(prodCsp).toContain("upgrade-insecure-requests");

    const devCsp = buildCspPolicy(NONCE, false, SUPABASE_URL);
    expect(devCsp).not.toContain("upgrade-insecure-requests");
  });

  it("includes all required directives", () => {
    const csp = buildCspPolicy(NONCE, false, SUPABASE_URL);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("img-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-src 'self'");
    expect(csp).toContain("media-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("manifest-src 'self'");
  });

  it("includes frame-src with Mercado Pago and Google domains", () => {
    const csp = buildCspPolicy(NONCE, false, SUPABASE_URL);
    const frameSrc = extractDirective(csp, "frame-src");
    expect(frameSrc).toContain("mercadopago.com");
    expect(frameSrc).toContain("secure-fields.mercadopago.com");
    expect(frameSrc).toContain("www.google.com");
  });

  it("adds WebSocket localhost for dev Supabase", () => {
    const csp = buildCspPolicy(NONCE, false, DEV_SUPABASE_URL);
    expect(csp).toContain("ws://127.0.0.1:54321");
  });

  it("preserves supabase domain in img-src and connect-src", () => {
    const csp = buildCspPolicy(NONCE, false, SUPABASE_URL);
    expect(csp).toContain("https://project.supabase.co");
  });

  it("returns directives separated by semicolons", () => {
    const csp = buildCspPolicy(NONCE, false, SUPABASE_URL);
    const parts = csp.split(";").map((p) => p.trim());
    expect(parts.length).toBeGreaterThanOrEqual(10);
  });

  it("nonce is NOT duplicated as literal string in CSP", () => {
    const csp = buildCspPolicy(NONCE, false, SUPABASE_URL);
    // The literal nonce placeholder should not appear — the value must be actual nonce
    expect(csp).not.toContain("{nonce}");
    expect(csp).not.toContain("{value}");
  });

  it("uses wildcard supabase domain when URL is empty", () => {
    const csp = buildCspPolicy(NONCE, false, "");
    expect(csp).toContain("https://*.supabase.co");
  });

  it("works with different nonce values", () => {
    const nonce1 = crypto.randomUUID();
    const nonce2 = crypto.randomUUID();
    const csp1 = buildCspPolicy(nonce1, false, SUPABASE_URL);
    const csp2 = buildCspPolicy(nonce2, false, SUPABASE_URL);
    expect(csp1).toContain(`'nonce-${nonce1}'`);
    expect(csp2).toContain(`'nonce-${nonce2}'`);
    expect(csp1).not.toBe(csp2);
  });
});

function extractDirective(csp: string, directiveName: string): string {
  const parts = csp.split(";").map((p) => p.trim());
  const directive = parts.find((p) => p.startsWith(directiveName));
  if (!directive) return "";
  return directive;
}

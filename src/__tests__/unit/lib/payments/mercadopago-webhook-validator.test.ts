/**
 * Unit tests for MercadoPagoWebhookValidator.
 */

import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import { MercadoPagoWebhookValidator } from "@/lib/payments/mercadopago/webhook-validator";

describe("MercadoPagoWebhookValidator", () => {
  const testSecret = "test-secret-key";
  let validator: MercadoPagoWebhookValidator;

  beforeEach(() => {
    validator = new MercadoPagoWebhookValidator(testSecret);
  });

  describe("validate", () => {
    it("should validate a correct signature", () => {
      const dataId = "123456";
      const xRequestId = "test-request-id";
      const ts = Math.floor(Date.now() / 1000).toString();
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const hmac = crypto.createHmac("sha256", testSecret);
      hmac.update(manifest);
      const hash = hmac.digest("hex");
      const xSignature = `ts=${ts},v1=${hash}`;

      const result = validator.validate(xSignature, xRequestId, dataId);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject an incorrect signature", () => {
      const dataId = "123456";
      const xRequestId = "test-request-id";
      const ts = Math.floor(Date.now() / 1000).toString();
      const xSignature = `ts=${ts},v1=invalid_hash`;

      const result = validator.validate(xSignature, xRequestId, dataId);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Signature mismatch");
    });

    it("should reject a timestamp that is too old", () => {
      const dataId = "123456";
      const xRequestId = "test-request-id";
      const ts = Math.floor((Date.now() - 10 * 60 * 1000) / 1000).toString();
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const hmac = crypto.createHmac("sha256", testSecret);
      hmac.update(manifest);
      const hash = hmac.digest("hex");
      const xSignature = `ts=${ts},v1=${hash}`;

      const result = validator.validate(xSignature, xRequestId, dataId);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Timestamp too old");
    });

    it("should reject missing headers or params", () => {
      const result = validator.validate(null, null, null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Missing required headers or query params");
    });

    it("should reject invalid x-signature format", () => {
      const result = validator.validate("invalid", "req-id", "123");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid x-signature format");
    });
  });
});

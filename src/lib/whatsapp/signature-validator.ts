/**
 * Validador de firma X-Hub-Signature-256 para webhooks de Meta WhatsApp
 * Meta firma el payload con HMAC-SHA256(rawBody, APP_SECRET)
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */

import crypto from "crypto";
import { appLogger as logger } from "@/lib/logger";

export interface WhatsAppSignatureValidationResult {
  isValid: boolean;
  error?: string;
}

export class WhatsAppSignatureValidator {
  private appSecret: string;

  constructor(appSecret?: string) {
    this.appSecret = appSecret || process.env.WHATSAPP_APP_SECRET || "";
    if (!this.appSecret) {
      logger.warn(
        "WHATSAPP_APP_SECRET not configured. Webhook signature validation will be skipped."
      );
    }
  }

  /**
   * Valida la firma X-Hub-Signature-256 del webhook de Meta
   * @param rawBody - Body raw del request (string, antes de parsear JSON)
   * @param signatureHeader - Valor del header X-Hub-Signature-256 (sha256=<hex>)
   */
  validate(
    rawBody: string,
    signatureHeader: string | null
  ): WhatsAppSignatureValidationResult {
    if (!this.appSecret) {
      if (process.env.NODE_ENV === "production") {
        return {
          isValid: false,
          error: "WHATSAPP_APP_SECRET not configured in production",
        };
      }
      logger.warn("WhatsApp webhook signature validation skipped (no secret)");
      return { isValid: true };
    }

    if (!signatureHeader) {
      return {
        isValid: false,
        error: "Missing X-Hub-Signature-256 header",
      };
    }

    try {
      const match = signatureHeader.match(/^sha256=(.+)$/);
      if (!match) {
        return {
          isValid: false,
          error: "Invalid X-Hub-Signature-256 format (expected sha256=<hex>)",
        };
      }

      const expectedSignature = match[1].trim();
      const hmac = crypto.createHmac("sha256", this.appSecret);
      hmac.update(rawBody);
      const computedSignature = hmac.digest("hex");

      if (computedSignature !== expectedSignature) {
        logger.warn("WhatsApp webhook signature mismatch", {
          headerLength: signatureHeader.length,
        });
        return {
          isValid: false,
          error: "Signature mismatch",
        };
      }

      return { isValid: true };
    } catch (error) {
      logger.error(
        "Error validating WhatsApp webhook signature",
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        isValid: false,
        error: "Validation error",
      };
    }
  }
}

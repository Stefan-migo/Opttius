/**
 * Validador de webhooks de MercadoPago
 * Verifica la autenticidad de las notificaciones mediante firma HMAC
 *
 * @module lib/payments/mercadopago/webhook-validator
 */

import crypto from "crypto";

import { appLogger as logger } from "@/lib/logger";

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
}

export class MercadoPagoWebhookValidator {
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret || process.env.MERCADOPAGO_WEBHOOK_SECRET || "";
    if (!this.secret) {
      logger.warn(
        "MERCADOPAGO_WEBHOOK_SECRET not configured. Webhook validation will be skipped.",
      );
    }
  }

  /**
   * Valida la firma de un webhook de MercadoPago
   * @param xSignature - Header x-signature del webhook
   * @param xRequestId - Header x-request-id del webhook
   * @param dataId - Query param data.id
   * @returns Resultado de la validación
   */
  validate(
    xSignature: string | null,
    xRequestId: string | null,
    dataId: string | null,
  ): WebhookValidationResult {
    // Si no hay secret configurado, permitir (solo en desarrollo)
    if (!this.secret) {
      if (process.env.NODE_ENV === "production") {
        return {
          isValid: false,
          error: "Webhook secret not configured in production",
        };
      }
      logger.warn("Webhook validation skipped (no secret configured)");
      return { isValid: true };
    }

    // Validar que existan los headers necesarios
    if (!xSignature || !xRequestId || !dataId) {
      return {
        isValid: false,
        error: "Missing required headers or query params",
      };
    }

    try {
      // Extraer ts y v1 del header x-signature
      const parts = xSignature.split(",");
      let ts: string | null = null;
      let hash: string | null = null;

      for (const part of parts) {
        const [key, value] = part.split("=");
        if (key?.trim() === "ts") {
          ts = value?.trim() || null;
        } else if (key?.trim() === "v1") {
          hash = value?.trim() || null;
        }
      }

      if (!ts || !hash) {
        return {
          isValid: false,
          error: "Invalid x-signature format",
        };
      }

      // MP doc: "if the data.id_url is alphanumeric, it must be sent in lowercase"
      const manifestId = /^[a-zA-Z0-9]+$/.test(dataId)
        ? dataId.toLowerCase()
        : dataId;
      const manifest = `id:${manifestId};request-id:${xRequestId};ts:${ts};`;

      // Generar HMAC SHA256
      const hmac = crypto.createHmac("sha256", this.secret);
      hmac.update(manifest);
      const computedHash = hmac.digest("hex");

      // Comparar hashes
      if (computedHash !== hash) {
        logger.warn("Webhook signature validation failed", {
          expected: hash,
          computed: computedHash,
          manifest,
        });
        return {
          isValid: false,
          error: "Signature mismatch",
        };
      }

      // Validar timestamp (no más de 5 minutos de diferencia)
      // MP envía ts en segundos (Unix), no en milisegundos
      const tsNumber = parseInt(ts, 10);
      const nowSec = Math.floor(Date.now() / 1000);
      const diff = Math.abs(nowSec - tsNumber);
      const maxDiff = 5 * 60; // 5 minutos en segundos

      if (diff > maxDiff) {
        logger.warn("Webhook timestamp too old", {
          timestamp: tsNumber,
          nowSec,
          diff,
        });
        return {
          isValid: false,
          error: "Timestamp too old",
        };
      }

      return { isValid: true };
    } catch (error) {
      logger.error(
        "Error validating webhook signature",
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        isValid: false,
        error: "Validation error",
      };
    }
  }
}

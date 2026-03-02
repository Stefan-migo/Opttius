/**
 * Internal Billing Adapter (Shadow Billing)
 *
 * Implementación para facturación interna (Fase 1).
 * Genera folios internos y PDFs simples sin conexión al SII.
 */

import {
  BillingAdapter,
  BillingResult,
  DocumentStatus,
  Order,
} from "./BillingAdapter";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import {
  generateBillingPDF,
  generateBillingHTML,
} from "@/lib/billing/pdf-generator";

export class InternalBilling implements BillingAdapter {
  private supabase = createServiceRoleClient();

  /**
   * Emite un documento interno (ticket/comprobante) o boleta/factura
   */
  async emitDocument(order: Order): Promise<BillingResult> {
    try {
      // Determine document type from order
      const documentType =
        (order as any).sii_invoice_type === "factura"
          ? "factura"
          : (order as any).sii_invoice_type === "boleta"
            ? "boleta"
            : "internal_ticket";

      // 1. Generar folio interno (secuencial por sucursal y tipo)
      const folio = await this.generateInternalFolio(
        order.branch_id,
        documentType,
      );

      // 2. Get billing settings for customization
      const { data: billingSettings } = await this.supabase
        .from("billing_settings")
        .select("*")
        .eq("branch_id", order.branch_id)
        .single();

      // 3. Create billing document record
      const { data: billingDoc, error: docError } = await this.supabase
        .from("billing_documents")
        .insert({
          document_type: documentType,
          folio: folio,
          order_id: order.id,
          branch_id: order.branch_id,
          purchase_order_reference: (order as any).oc_number ?? null,
          customer_id: order.customer_id || null,
          customer_name:
            order.customer?.first_name && order.customer?.last_name
              ? `${order.customer.first_name} ${order.customer.last_name}`
              : order.customer?.business_name || null,
          customer_rut: order.customer?.rut || null,
          customer_email: order.customer?.email || null,
          status: "emitted",
          subtotal: order.subtotal,
          tax_amount: order.tax_amount,
          discount_amount: order.discount_amount || 0,
          total_amount: order.total_amount,
          currency: "CLP",
          pdf_url: `/api/admin/billing/documents/${folio}/pdf`,
          logo_url: billingSettings?.logo_url || null,
          custom_header_text: billingSettings?.header_text || null,
          custom_footer_text: billingSettings?.footer_text || null,
          emitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (docError) {
        logger.error("Error creating billing document", docError);
        throw new Error(
          `Failed to create billing document: ${docError.message}`,
        );
      }

      // 4. Create document items
      if (order.items && order.items.length > 0) {
        const documentItems = order.items.map((item, index) => ({
          billing_document_id: billingDoc.id,
          line_number: index + 1,
          product_id: item.product_id || null,
          product_name: item.product_name,
          product_sku: item.sku || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: 0,
          tax_amount: 0, // Calculate if needed
          total_price: item.total_price,
          description: item.product_name,
        }));

        const { error: itemsError } = await this.supabase
          .from("billing_document_items")
          .insert(documentItems);

        if (itemsError) {
          logger.error("Error creating document items", itemsError);
          // Don't fail, but log the error
        }
      }

      // 5. Update order with document info (for backward compatibility)
      await this.saveDocument(order.id, {
        document_type:
          documentType === "internal_ticket"
            ? "internal_ticket"
            : documentType === "boleta"
              ? "boleta_electronica"
              : "factura_electronica",
        internal_folio: folio,
        pdf_url: `/api/admin/billing/documents/${folio}/pdf`,
      });

      logger.info(
        `Billing document emitted: ${folio} (${documentType}) for order ${order.id}`,
      );

      return {
        folio,
        pdfUrl: `/api/admin/billing/documents/${folio}/pdf`,
        type: "internal",
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error("Error emitting billing document", error);
      throw error;
    }
  }

  /**
   * Genera un folio interno secuencial por sucursal y tipo de documento
   * Usa la función de base de datos para consistencia
   */
  private async generateInternalFolio(
    branchId: string,
    documentType: string,
  ): Promise<string> {
    try {
      const { data: folio, error } = await this.supabase.rpc(
        "generate_billing_folio",
        {
          p_branch_id: branchId,
          p_document_type: documentType,
        },
      );

      if (error || !folio) {
        logger.error("Error generating folio via RPC", error);
        // Fallback: generate manually
        return this.generateFolioFallback(branchId, documentType);
      }

      return folio;
    } catch (error) {
      logger.error("Error generating internal folio", error);
      return this.generateFolioFallback(branchId, documentType);
    }
  }

  /**
   * Fallback method to generate folio if RPC fails
   */
  private async generateFolioFallback(
    branchId: string,
    documentType: string,
  ): Promise<string> {
    const prefix =
      documentType === "boleta"
        ? "BOL"
        : documentType === "factura"
          ? "FAC"
          : "TKT";

    const { data: lastDoc } = await this.supabase
      .from("billing_documents")
      .select("folio")
      .eq("branch_id", branchId)
      .eq("document_type", documentType)
      .like("folio", `${prefix}-%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastDoc?.folio) {
      const match = lastDoc.folio.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    return `${prefix}-${String(nextNumber).padStart(6, "0")}`;
  }

  // PDF generation is now handled by the API endpoint
  // This method is kept for backward compatibility but is no longer used

  /**
   * Guarda la información del documento en la tabla orders
   */
  private async saveDocument(
    orderId: string,
    documentData: {
      document_type: string;
      internal_folio: string;
      pdf_url: string;
    },
  ): Promise<void> {
    const { error } = await this.supabase
      .from("orders")
      .update({
        document_type: documentData.document_type,
        internal_folio: documentData.internal_folio,
        pdf_url: documentData.pdf_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      logger.error("Error saving document to order", error);
      throw new Error(`Failed to save document: ${error.message}`);
    }
  }

  /**
   * Para facturación interna, siempre está "aceptada"
   */
  async getDocumentStatus(folio: string): Promise<DocumentStatus> {
    return { status: "accepted" };
  }

  /**
   * Cancela un documento interno
   */
  async cancelDocument(folio: string, reason: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from("orders")
        .update({
          document_type: "internal_ticket_cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("internal_folio", folio);

      if (error) {
        logger.error("Error cancelling internal document", error);
        return false;
      }

      logger.info(`Internal document ${folio} cancelled: ${reason}`);
      return true;
    } catch (error) {
      logger.error("Error cancelling document", error);
      return false;
    }
  }
}

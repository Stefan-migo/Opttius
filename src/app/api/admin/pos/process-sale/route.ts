import { NextRequest, NextResponse } from "next/server";

import {
  getBranchContext,
  getFieldOperationFromRequest,
} from "@/lib/api/branch-middleware";
import { APIError, RateLimitError, ValidationError } from "@/lib/api/errors";
import { rateLimitConfigs, withRateLimit } from "@/lib/api/middleware";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { processSaleSchema } from "@/lib/api/validation/zod-schemas";
import { BillingFactory } from "@/lib/billing/BillingFactory";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/inventory/constants";
import {
  getOperativoMobileAvailableQuantity,
  reduceOperativoMobileStock,
} from "@/lib/inventory/operativo-mobile-stock-helpers";
import { getAvailableQuantity } from "@/lib/inventory/stock-helpers";
import { appLogger as logger } from "@/lib/logger";
import { PAYMENT_METHOD_MAP } from "@/lib/payments/constants";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
import {
  extractFrameInfo,
  extractLensInfo,
  extractTreatmentsCost,
  extractLaborCost,
  computeOrderNumber,
  computeWorkOrderDecision,
  computeMinDepositFallback,
  haveOnlyNonWorkOrderProducts,
  hasLensDataForMounting,
} from "./processSaleValidation";
import {
  computePaymentAmount,
  computeDbPaymentMethod,
  computeWorkOrderStatus,
  computeLensCost,
  computeCashAmount,
  buildOrderPaymentsPayload,
  buildStockReductionItems,
} from "./processPaymentUtils";
import {
  buildOrderItems,
  buildCustomerName,
  buildFullOrderResponse,
  buildWorkOrderResponse,
  buildBillingResponse,
  buildBillingOrder,
} from "./processResponseBuilder";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    return await (withRateLimit(rateLimitConfigs.pos) as unknown)(
      request,
      async () => {
        try {
          logger.info("POS Process Sale API called");
          const supabase = await createClient();

          // Check admin authorization
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
          if (userError || !user) {
            return NextResponse.json(
              { error: "Unauthorized" },
              { status: 401 },
            );
          }

          const { data: isAdmin } = (await supabase.rpc("is_admin", {
            user_id: user.id,
          } as IsAdminParams)) as {
            data: IsAdminResult | null;
            error: Error | null;
          };
          if (!isAdmin) {
            return NextResponse.json(
              { error: "Admin access required" },
              { status: 403 },
            );
          }

          // Get branch context
          const branchContext = await getBranchContext(request, user.id);

          // Operativo mode: validate field operation and use its branch
          const fieldOperationId: string | null =
            getFieldOperationFromRequest(request);
          let effectiveBranchId = branchContext.branchId;

          if (fieldOperationId) {
            const { data: fieldOp, error: fieldOpError } = await supabase
              .from("field_operations")
              .select("id, branch_id, organization_id")
              .eq("id", fieldOperationId)
              .single();

            if (fieldOpError || !fieldOp) {
              return NextResponse.json(
                { error: "Operativo no encontrado" },
                { status: 404 },
              );
            }

            // Validate user has access (same org)
            if (
              branchContext.organizationId &&
              fieldOp.organization_id !== branchContext.organizationId
            ) {
              return NextResponse.json(
                { error: "No tiene acceso a este operativo" },
                { status: 403 },
              );
            }

            // Use operativo branch as effective branch
            effectiveBranchId = fieldOp.branch_id;

            // Validate branch matches (user must have access to operativo branch)
            if (
              !branchContext.isSuperAdmin &&
              !branchContext.accessibleBranches.some(
                (b) => b.id === fieldOp.branch_id,
              )
            ) {
              return NextResponse.json(
                { error: "No tiene acceso a la sucursal del operativo" },
                { status: 403 },
              );
            }
          }

          // Validate branch access for non-super admins
          if (!branchContext.isSuperAdmin && !effectiveBranchId) {
            return NextResponse.json(
              {
                error: "Debe seleccionar una sucursal para realizar ventas POS",
              },
              { status: 400 },
            );
          }

          // Validate request body with Zod
          let validatedBody;
          try {
            validatedBody = await parseAndValidateBody(
              request,
              processSaleSchema,
            );
          } catch (error) {
            if (error instanceof ValidationError) {
              return validationErrorResponse(error);
            }
            throw error;
          }

          // Destructure validated data
          const {
            email,
            customer_id,
            customer_name,
            customer_rut,
            payment_method_type,
            payment_status,
            status,
            subtotal,
            tax_amount,
            total_amount,
            currency,
            installments_count,
            sii_invoice_type,
            sii_rut,
            sii_business_name,
            items,
            cash_received,
            change_amount,
            deposit_amount,
            fiscal_reference,
            lens_data,
            frame_data,
            presbyopia_solution,
            far_lens_family_id,
            near_lens_family_id,
            far_lens_cost,
            near_lens_cost,
            // Contact lens fields
            contact_lens_family_id,
            contact_lens_rx_sphere_od,
            contact_lens_rx_cylinder_od,
            contact_lens_rx_axis_od,
            contact_lens_rx_add_od,
            contact_lens_rx_base_curve_od,
            contact_lens_rx_diameter_od,
            contact_lens_rx_sphere_os,
            contact_lens_rx_cylinder_os,
            contact_lens_rx_axis_os,
            contact_lens_rx_add_os,
            contact_lens_rx_base_curve_os,
            contact_lens_rx_diameter_os,
            contact_lens_quantity,
            agreement_id,
            purchase_order_id,
            contact_lens_cost,
            contact_lens_price,
            quote_id,
            payments: paymentsArray,
          } = validatedBody;
          const idempotency_key =
            (validatedBody as { idempotency_key?: string | null })
              .idempotency_key ?? undefined;

          const supabaseServiceRole = createServiceRoleClient();

          // Idempotency: if key exists, return stored result (prevents duplicate sales on retry)
          if (idempotency_key) {
            const { data: existing } = await supabaseServiceRole
              .from("pos_sale_idempotency")
              .select("response_snapshot")
              .eq("idempotency_key", idempotency_key)
              .maybeSingle();
            if (existing?.response_snapshot) {
              logger.info("Idempotency hit - returning cached result", {
                idempotency_key,
                order_id: existing.response_snapshot?.order?.id,
              });
              return createApiSuccessResponse(existing.response_snapshot);
            }
          }

          // Generate SII invoice number if needed
          let siiInvoiceNumber = null;
          if (sii_invoice_type && sii_invoice_type !== "none") {
            const { data: invoiceNum, error: invoiceError } =
              await supabase.rpc("generate_sii_invoice_number", {
                invoice_type: sii_invoice_type,
              });

            if (invoiceError) {
              logger.error("Error generating invoice number", invoiceError);
              // Continue without invoice number for now
            } else {
              siiInvoiceNumber = invoiceNum;
            }
          }

          // Validate that cash register is open before processing sale
          let posSessionId = null;
          if (!branchContext.isSuperAdmin && effectiveBranchId) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStart = today.toISOString();

            let sessionQuery = supabaseServiceRole
              .from("pos_sessions")
              .select("id")
              .eq("branch_id", effectiveBranchId)
              .eq("status", "open")
              .gte("opening_time", todayStart);
            if (fieldOperationId) {
              sessionQuery = sessionQuery.eq(
                "field_operation_id",
                fieldOperationId,
              );
            } else {
              sessionQuery = sessionQuery.is("field_operation_id", null);
            }
            const { data: openSession, error: sessionCheckError } =
              await sessionQuery.maybeSingle();

            if (sessionCheckError && sessionCheckError.code !== "PGRST116") {
              logger.error(
                "Error checking cash register status",
                sessionCheckError,
              );
              return NextResponse.json(
                { error: "Error al verificar estado de caja" },
                { status: 500 },
              );
            }

            if (!openSession) {
              return NextResponse.json(
                {
                  error: fieldOperationId
                    ? "Debe abrir la caja del operativo antes de realizar ventas. Abra la caja desde la página del operativo."
                    : "Debe abrir la caja antes de realizar ventas. Por favor, abra la caja desde la sección Caja.",
                },
                { status: 400 },
              );
            }

            posSessionId = openSession.id;
          } else {
            // For super admin or no branch, use existing logic
            let query = supabase
              .from("pos_sessions")
              .select("id")
              .eq("cashier_id", user.id)
              .eq("status", "open");

            if (effectiveBranchId) {
              query = query.eq("branch_id", effectiveBranchId);
              if (fieldOperationId) {
                query = query.eq("field_operation_id", fieldOperationId);
              } else {
                query = query.is("field_operation_id", null);
              }
            } else {
              query = query.is("branch_id", null);
            }

            const { data: activeSession } = await query
              .order("opening_time", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (activeSession) {
              posSessionId = activeSession.id;
            } else if (branchContext.isSuperAdmin) {
              // Only super admin can auto-create sessions
              const { data: newSession, error: sessionError } = await supabase
                .from("pos_sessions")
                .insert({
                  cashier_id: user.id,
                  branch_id: effectiveBranchId,
                  opening_cash_amount: 0,
                  status: "open",
                })
                .select()
                .single();

              if (sessionError) {
                logger.error("Error creating POS session", sessionError);
              } else {
                posSessionId = newSession.id;
              }
            }
          }

          // Extract frame and lens information - prefer structured data, fallback to parsing
          // ponytail: extracted to processSaleValidation.ts
          const frameInfo = extractFrameInfo(frame_data, items);
          const lensInfo = extractLensInfo(lens_data, items);
          const treatmentsCost = extractTreatmentsCost(items);
          const laborCost = extractLaborCost(items);

          // Get customer information if customer_id is provided
          let customer: unknown = null;
          if (customer_id) {
            const { data: customerData, error: customerError } =
              await supabaseServiceRole
                .from("customers")
                .select("id, first_name, last_name, email, phone, rut")
                .eq("id", customer_id)
                .single();

            if (customerError || !customerData) {
              logger.error("Error fetching customer", customerError);
              return NextResponse.json(
                { error: "Customer not found" },
                { status: 404 },
              );
            }
            customer = customerData;
          } else {
            // Use provided customer_name and customer_rut for unregistered customers
            customer = {
              id: null,
              first_name: customer_name?.split(" ")[0] || null,
              last_name: customer_name?.split(" ").slice(1).join(" ") || null,
              email: email || null,
              phone: null,
              rut: customer_rut || null,
            };
          }

          // Validate agreement and purchase order if provided
          let agreement: unknown = null;
          let purchaseOrder: unknown = null;
          let copagoAmount: number | null = null;
          let institutionalAmount: number | null = null;

          if (agreement_id) {
            const { data: agreementData, error: agreementError } =
              await supabaseServiceRole
                .from("agreements")
                .select("id, status, valid_from, valid_until, billing_rules")
                .eq("id", agreement_id)
                .single();

            if (agreementError || !agreementData) {
              return NextResponse.json(
                { error: "Convenio no encontrado" },
                { status: 404 },
              );
            }
            agreement = agreementData;

            if (agreement.status !== "active") {
              return NextResponse.json(
                { error: "El convenio no está activo" },
                { status: 400 },
              );
            }

            const today = new Date().toISOString().split("T")[0];
            if (agreement.valid_from > today) {
              return NextResponse.json(
                { error: "El convenio aún no está vigente" },
                { status: 400 },
              );
            }
            if (agreement.valid_until && agreement.valid_until < today) {
              return NextResponse.json(
                { error: "El convenio ha expirado" },
                { status: 400 },
              );
            }

            if (!purchase_order_id) {
              return NextResponse.json(
                {
                  error:
                    "La orden de compra (OC) es obligatoria para ventas bajo convenio",
                },
                { status: 400 },
              );
            }

            const { data: poData, error: poError } = await supabaseServiceRole
              .from("agreement_purchase_orders")
              .select("id, status, max_amount, used_amount")
              .eq("id", purchase_order_id)
              .eq("agreement_id", agreement_id)
              .single();

            if (poError || !poData) {
              return NextResponse.json(
                {
                  error:
                    "Orden de compra no encontrada o no pertenece al convenio",
                },
                { status: 404 },
              );
            }
            purchaseOrder = poData;

            if (purchaseOrder.status !== "active") {
              return NextResponse.json(
                { error: "La orden de compra no está activa" },
                { status: 400 },
              );
            }

            const rules = (agreement.billing_rules || {}) as {
              copago_percent?: number;
              institutional_percent?: number;
            };
            const copagoPercent = rules.copago_percent ?? 20;
            const institutionalPercent = rules.institutional_percent ?? 80;

            copagoAmount =
              Math.round(total_amount * (copagoPercent / 100) * 100) / 100;
            institutionalAmount =
              Math.round((total_amount - copagoAmount) * 100) / 100;

            if (purchaseOrder.max_amount != null) {
              const newUsed =
                (purchaseOrder.used_amount || 0) + institutionalAmount;
              if (newUsed > purchaseOrder.max_amount) {
                return NextResponse.json(
                  { error: "La OC excede el monto máximo autorizado" },
                  { status: 400 },
                );
              }
            }
          }

          // Validate quote if provided
          let quote: unknown = null;
          if (quote_id) {
            const { data: quoteData, error: quoteError } =
              await supabaseServiceRole
                .from("quotes")
                .select("id, status, converted_to_work_order_id, customer_id")
                .eq("id", quote_id)
                .single();

            if (quoteError || !quoteData) {
              logger.error("Error fetching quote", quoteError);
              return NextResponse.json(
                { error: "Presupuesto no encontrado" },
                { status: 404 },
              );
            }

            // Check if quote is already used
            if (
              quoteData.status === "converted_to_work" ||
              quoteData.converted_to_work_order_id
            ) {
              return NextResponse.json(
                { error: "Este presupuesto ya fue utilizado" },
                { status: 400 },
              );
            }

            quote = quoteData;
          }

          // ========================================================================
          // VALIDACIONES: Lentes y Familias
          // ========================================================================

          // Validar familia de lentes si está presente
          let lensFamily = null;
          if (lensInfo.lens_family_id) {
            const { data: family, error: familyError } =
              await supabaseServiceRole
                .from("lens_families")
                .select("id, name, lens_type, lens_material, is_active")
                .eq("id", lensInfo.lens_family_id)
                .single();

            if (familyError || !family) {
              logger.error("Error fetching lens family", familyError);
              return NextResponse.json(
                { error: "Familia de lentes no encontrada" },
                { status: 400 },
              );
            }

            if (!family.is_active) {
              return NextResponse.json(
                { error: "La familia de lentes está desactivada" },
                { status: 400 },
              );
            }

            lensFamily = family;

            // Validar consistencia: tipo/material deben coincidir con la familia
            if (lensInfo.lens_type && lensInfo.lens_type !== family.lens_type) {
              logger.warn("Lens type mismatch with family", {
                family_type: family.lens_type,
                provided_type: lensInfo.lens_type,
              });
              // Corregir automáticamente usando el tipo de la familia
              lensInfo.lens_type = family.lens_type;
            }

            if (
              lensInfo.lens_material &&
              lensInfo.lens_material !== family.lens_material
            ) {
              logger.warn("Lens material mismatch with family", {
                family_material: family.lens_material,
                provided_material: lensInfo.lens_material,
              });
              // Corregir automáticamente usando el material de la familia
              lensInfo.lens_material = family.lens_material;
            }
          }

          // Validar receta si está presente
          if (lensInfo.prescription_id) {
            const { data: prescription, error: prescriptionError } =
              await supabaseServiceRole
                .from("prescriptions")
                .select(
                  "id, customer_id, od_sphere, od_cylinder, os_sphere, os_cylinder",
                )
                .eq("id", lensInfo.prescription_id)
                .single();

            if (prescriptionError || !prescription) {
              logger.error("Error fetching prescription", prescriptionError);
              return NextResponse.json(
                { error: "Receta no encontrada" },
                { status: 400 },
              );
            }

            // Validar que la receta pertenece al cliente (solo si hay customer_id)
            if (customer_id && prescription.customer_id !== customer_id) {
              return NextResponse.json(
                { error: "La receta no pertenece al cliente seleccionado" },
                { status: 400 },
              );
            }

            // Validar que existe matriz de precios para la familia y receta
            if (lensInfo.lens_family_id) {
              const sphere =
                Math.abs(prescription.od_sphere || 0) >=
                Math.abs(prescription.os_sphere || 0)
                  ? prescription.od_sphere || 0
                  : prescription.os_sphere || 0;
              const cylinder =
                Math.abs(prescription.od_cylinder || 0) >=
                Math.abs(prescription.os_cylinder || 0)
                  ? prescription.od_cylinder || 0
                  : prescription.os_cylinder || 0;

              const { data: priceMatrix, error: matrixError } =
                await supabaseServiceRole.rpc("calculate_lens_price", {
                  p_lens_family_id: lensInfo.lens_family_id,
                  p_sphere: sphere,
                  p_cylinder: cylinder || 0,
                });

              if (matrixError || !priceMatrix || priceMatrix.length === 0) {
                logger.warn(
                  "No price matrix found for lens family and prescription",
                  {
                    lens_family_id: lensInfo.lens_family_id,
                    sphere,
                    cylinder,
                  },
                );
                // No fallar, solo advertir - el precio puede ser manual
                // Pero validar que el precio del lente es razonable
                if (
                  lensInfo.lens_cost > 0 &&
                  priceMatrix &&
                  priceMatrix.length > 0
                ) {
                  const expectedPrice = priceMatrix[0].price;
                  const priceDifference = Math.abs(
                    lensInfo.lens_cost - expectedPrice,
                  );
                  const tolerance = expectedPrice * 0.05; // 5% de tolerancia

                  if (priceDifference > tolerance) {
                    logger.warn(
                      "Lens price differs significantly from matrix",
                      {
                        expected: expectedPrice,
                        actual: lensInfo.lens_cost,
                        difference: priceDifference,
                      },
                    );
                    // No fallar, solo advertir - puede ser precio manual ajustado
                  }
                }
              }
            }
          }

          // Generate order number (simple format: ORD-YYYYMMDD-XXXX)
          const dateStr = new Date()
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "");
          const { data: lastOrder } = await supabaseServiceRole
            .from("orders")
            .select("order_number")
            .like("order_number", `ORD-${dateStr}-%`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // ponytail: order number generation extracted to processSaleValidation.ts
          const orderNumber = computeOrderNumber(
            lastOrder?.order_number ?? null,
          );

          // ponytail: order items builder extracted to processResponseBuilder.ts
          const orderItems = buildOrderItems(items);

          // ✅ Determinar nombre del cliente para guardar en la orden
          // ponytail: customer name resolution extracted to processResponseBuilder.ts
          const { customerName, billingFirstName, billingLastName } =
            buildCustomerName({
              customer: customer as {
                id?: string;
                first_name?: string;
                last_name?: string;
                email?: string;
              } | null,
              customerName: customer_name,
              siiBusinessName: sii_business_name,
              customerId: customer_id,
            });

          // Resolve organization_id so orders appear in org-scoped lists (Caja, etc.)
          let orderOrganizationId: string | null = null;
          if (effectiveBranchId) {
            const { data: branchRow } = await supabaseServiceRole
              .from("branches")
              .select("organization_id")
              .eq("id", effectiveBranchId)
              .single();
            orderOrganizationId =
              (branchRow as { organization_id?: string } | null)
                ?.organization_id ?? null;
          }
          if (orderOrganizationId == null) {
            const { data: adminRow } = await supabaseServiceRole
              .from("admin_users")
              .select("organization_id")
              .eq("id", user.id)
              .single();
            orderOrganizationId =
              (adminRow as { organization_id?: string } | null)
                ?.organization_id ?? null;
          }

          // Payment amount and method (needed for RPC and legacy)
          // ponytail: extracted to processPaymentUtils.ts
          const paymentAmount = computePaymentAmount({
            agreementId: agreement_id,
            copagoAmount,
            paymentsArray: paymentsArray || [],
            depositAmount: deposit_amount,
            cashReceived: cash_received,
            totalAmount: total_amount,
          });
          const dbPaymentMethod = computeDbPaymentMethod({
            agreementId: agreement_id,
            copagoAmount,
            paymentMethodType: payment_method_type,
            paymentsArray: paymentsArray || [],
          });

          const balance = total_amount - paymentAmount;

          // Products for work order and stock checks (needed before RPC/legacy split)
          const productIdsForStock = items
            .map((item) => item.product_id)
            .filter(
              (id): id is string =>
                !!id &&
                !id.includes("frame-manual") &&
                !id.includes("lens-") &&
                !id.includes("treatments-") &&
                !id.includes("labor-") &&
                !id.includes("discount-"),
            );

          let productsForStockCheck: Array<{
            id: string;
            name?: string;
            product_type?: string;
          }> = [];
          if (productIdsForStock.length > 0) {
            const { data: products } = await supabaseServiceRole
              .from("products")
              .select("id, name, product_type")
              .in("id", productIdsForStock);
            productsForStockCheck = products || [];
          }

          const useMobileStock = !!fieldOperationId;
          const useRpc = !useMobileStock;

          // Stock validation (before RPC or legacy)
          const branchIdForStock = effectiveBranchId;
          if (branchIdForStock || (useMobileStock && fieldOperationId)) {
            for (const item of items) {
              if (
                item.product_id &&
                !item.product_id.includes("frame-manual") &&
                !item.product_id.includes("lens-") &&
                !item.product_id.includes("treatments-") &&
                !item.product_id.includes("labor-") &&
                !item.product_id.includes("discount-")
              ) {
                const product = productsForStockCheck.find(
                  (p) => p.id === item.product_id,
                );
                if (product?.product_type === "service") continue;

                const availableQty = useMobileStock
                  ? await getOperativoMobileAvailableQuantity(
                      item.product_id,
                      fieldOperationId!,
                      supabaseServiceRole,
                    )
                  : await getAvailableQuantity(
                      item.product_id,
                      branchIdForStock!,
                      supabaseServiceRole,
                    );

                if (availableQty < item.quantity) {
                  const productName = product?.name || item.product_id;
                  const msg = useMobileStock
                    ? `Stock insuficiente en bodega móvil para ${productName}. Disponible: ${availableQty}, solicitado: ${item.quantity}`
                    : `Stock insuficiente para ${productName}. Disponible: ${availableQty}, solicitado: ${item.quantity}`;
                  return createApiErrorResponse(
                    new APIError(msg, 400, "INSUFFICIENT_STOCK"),
                  );
                }
              }
            }
          }

          // Work order decision (hasTemporaryLensItems, hasFrameInItems, actuallyRequiresWorkOrder)
          const hasTemporaryLensItems = items.some(
            (item) =>
              !item.product_id ||
              item.product_id.includes("lens-") ||
              item.product_id.includes("treatments-") ||
              item.product_id.includes("labor-") ||
              item.product_id.includes("frame-manual-"),
          );

          let hasFrameInItems = false;
          let productTypesInItems: string[] = [];
          let productCategories: Array<{
            id: string;
            category_name: string | null;
          }> = [];
          const productIds = items
            .map((item) => item.product_id)
            .filter(
              (id): id is string =>
                !!id &&
                !id.includes("lens-") &&
                !id.includes("treatments-") &&
                !id.includes("labor-") &&
                !id.includes("frame-manual-") &&
                !id.includes("discount-"),
            );
          if (productIds.length > 0) {
            const { data: products } = await supabaseServiceRole
              .from("products")
              .select(
                "id, product_type, category_id, categories:category_id(name)",
              )
              .in("id", productIds);
            hasFrameInItems = (products || []).some(
              (p: { product_type?: string }) => p.product_type === "frame",
            );
            productTypesInItems = (products || []).map(
              (p: { product_type?: string }) => p.product_type || "",
            );
            productCategories = (products || []).map(
              (p: {
                id: string;
                categories?: { name?: string } | { name?: string }[];
              }) => {
                const cat = Array.isArray(p.categories)
                  ? p.categories[0]
                  : p.categories;
                return { id: p.id, category_name: cat?.name ?? null };
              },
            );
          }

          // ponytail: extracted to processSaleValidation.ts
          const hasOnlyNonWorkOrderProductTypes =
            haveOnlyNonWorkOrderProducts(productTypesInItems);
          const nonWorkOrderCategoryNames = [
            "accesorio",
            "accesorios",
            "lente de sol",
            "lentes de sol",
            "servicio",
            "servicios",
          ];
          const hasOnlyNonWorkOrderProductCategories =
            productCategories.length > 0 &&
            productCategories.every((cat) => {
              if (!cat.category_name) return false;
              const categoryNameLower = cat.category_name.toLowerCase();
              return nonWorkOrderCategoryNames.some((nonWorkCat) =>
                categoryNameLower.includes(nonWorkCat),
              );
            });
          const hasOnlyNonWorkOrderProducts =
            hasOnlyNonWorkOrderProductTypes ||
            hasOnlyNonWorkOrderProductCategories;
          const lensDataForMounting = hasLensDataForMounting(
            lens_data,
            contact_lens_family_id,
            contact_lens_cost,
            presbyopia_solution,
          );
          const actuallyRequiresWorkOrder = computeWorkOrderDecision({
            hasTemporaryLensItems,
            hasFrameInItems,
            hasLensDataForMounting: lensDataForMounting,
            customerId: customer_id,
            hasOnlyNonWorkOrderProducts,
          });

          if (actuallyRequiresWorkOrder && !customer_id) {
            return NextResponse.json(
              {
                error:
                  "Se requiere un cliente registrado para crear trabajos de laboratorio",
              },
              { status: 400 },
            );
          }

          let newOrder: {
            id: string;
            order_number: string;
            email?: string;
            total_amount: number;
            branch_id?: string;
            created_at?: string;
            [key: string]: unknown;
          };

          if (useRpc) {
            // RPC path: transactional process_pos_sale
            const { data: minDepositData } = await supabaseServiceRole.rpc(
              "get_min_deposit",
              {
                p_order_total: total_amount,
                p_branch_id: effectiveBranchId,
              },
            );
            const minDeposit =
              minDepositData ?? computeMinDepositFallback(total_amount);
            const {
              status: workOrderStatus,
              paymentStatus: workOrderPaymentStatus,
            } = computeWorkOrderStatus(
              paymentAmount,
              minDeposit,
              total_amount,
              balance,
            );

            const orderPayload = {
              order_number: orderNumber,
              email: email || customer?.email || "venta@pos.local",
              status: "processing",
              payment_status: payment_status || "paid",
              subtotal,
              tax_amount: tax_amount || 0,
              discount_amount: 0,
              total_amount,
              currency: currency || "CLP",
              mp_payment_method: dbPaymentMethod,
              branch_id: effectiveBranchId,
              organization_id: orderOrganizationId,
              field_operation_id: fieldOperationId,
              pos_session_id: posSessionId,
              customer_name: customerName,
              billing_first_name: billingFirstName,
              billing_last_name: billingLastName,
              sii_rut: customer_rut || sii_rut || customer?.rut || null,
              sii_business_name: sii_business_name || null,
              customer_id: customer_id || null,
              agreement_id: agreement_id || null,
              purchase_order_id: purchase_order_id || null,
              copago_amount: copagoAmount ?? null,
              institutional_amount: institutionalAmount ?? null,
            };

            const orderItemsPayload = items.map((item) => ({
              product_id: item.product_id || null,
              product_name: item.product_name || "Producto",
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.unit_price * item.quantity,
              sku: (item as { sku?: string }).sku || null,
            }));

            // ponytail: extracted to processPaymentUtils.ts
            const orderPaymentsPayload = buildOrderPaymentsPayload({
              agreementId: agreement_id,
              copagoAmount,
              dbPaymentMethod,
              paymentsArray: paymentsArray || [],
              paymentMethodType: payment_method_type,
              fiscalReference: fiscal_reference?.trim() || null,
              siiInvoiceNumber,
            });

            // ponytail: extracted to processPaymentUtils.ts
            let stockReductionsPayload = buildStockReductionItems(
              items,
              productsForStockCheck,
              effectiveBranchId,
            );

            // Ensure frame from work order is reduced when not already in items (e.g. frame_data.frame_product_id)
            const uuidRegex =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (
              actuallyRequiresWorkOrder &&
              frameInfo.frame_product_id &&
              uuidRegex.test(frameInfo.frame_product_id) &&
              !frameInfo.frame_product_id.includes("frame-manual") &&
              !stockReductionsPayload.some(
                (r) => r.product_id === frameInfo.frame_product_id,
              )
            ) {
              const frameProduct = productsForStockCheck.find(
                (p) => p.id === frameInfo.frame_product_id,
              );
              if (frameProduct?.product_type !== "service") {
                stockReductionsPayload = [
                  ...stockReductionsPayload,
                  {
                    product_id: frameInfo.frame_product_id,
                    branch_id: effectiveBranchId,
                    quantity: 1,
                  },
                ];
              }
            }

            // ponytail: extracted to processPaymentUtils.ts
            const lensCost = computeLensCost(
              presbyopia_solution,
              far_lens_cost,
              near_lens_cost,
              contact_lens_cost,
              lensInfo.lens_cost,
            );

            const workOrderPayload = actuallyRequiresWorkOrder
              ? {
                  field_operation_id: fieldOperationId,
                  customer_id: customer_id || null,
                  prescription_id: lensInfo.prescription_id || null,
                  quote_id: quote_id || null,
                  frame_product_id: frameInfo.frame_product_id,
                  frame_name: frameInfo.frame_name,
                  frame_brand: frameInfo.frame_brand,
                  frame_model: frameInfo.frame_model,
                  frame_color: frameInfo.frame_color,
                  frame_size: frameInfo.frame_size,
                  frame_sku: frameInfo.frame_sku,
                  lens_family_id:
                    presbyopia_solution === "two_separate"
                      ? null
                      : lensInfo.lens_family_id || null,
                  lens_type: lensInfo.lens_type,
                  lens_material: lensInfo.lens_material,
                  lens_index: lensInfo.lens_index,
                  lens_treatments: lensInfo.lens_treatments,
                  lens_tint_color: lensInfo.lens_tint_color,
                  lens_tint_percentage: lensInfo.lens_tint_percentage,
                  presbyopia_solution: presbyopia_solution || "none",
                  far_lens_family_id:
                    presbyopia_solution === "two_separate"
                      ? far_lens_family_id || null
                      : null,
                  near_lens_family_id:
                    presbyopia_solution === "two_separate"
                      ? near_lens_family_id || null
                      : null,
                  far_lens_cost:
                    presbyopia_solution === "two_separate"
                      ? far_lens_cost || 0
                      : null,
                  near_lens_cost:
                    presbyopia_solution === "two_separate"
                      ? near_lens_cost || 0
                      : null,
                  contact_lens_family_id: contact_lens_family_id || null,
                  contact_lens_quantity: contact_lens_family_id
                    ? contact_lens_quantity || 1
                    : null,
                  contact_lens_cost: contact_lens_cost || null,
                  frame_cost: frameInfo.frame_cost,
                  lens_cost: lensCost,
                  treatments_cost: treatmentsCost,
                  labor_cost: laborCost,
                  lab_cost: 0,
                  subtotal,
                  tax_amount: tax_amount || 0,
                  discount_amount: 0,
                  total_amount,
                  currency: currency || "CLP",
                  status: workOrderStatus,
                  payment_status: workOrderPaymentStatus,
                  deposit_amount: paymentAmount,
                  balance_amount: balance,
                  agreement_id: agreement_id || null,
                  internal_notes: `Venta POS - Método: ${payment_method_type}`,
                }
              : null;

            const posTransactionPayload = posSessionId
              ? {
                  payment_method: dbPaymentMethod,
                  amount: total_amount,
                  change_amount: change_amount ?? 0,
                  notes: `Venta POS - ${orderNumber}`,
                }
              : null;

            const rpcPayload = {
              order: orderPayload,
              order_items: orderItemsPayload,
              order_payments: orderPaymentsPayload,
              stock_reductions: stockReductionsPayload,
              work_order: workOrderPayload,
              pos_transaction: posTransactionPayload,
            };

            const { data: rpcResult, error: rpcError } =
              await supabaseServiceRole.rpc("process_pos_sale", {
                p_payload: JSON.stringify(rpcPayload),
                p_user_id: user.id,
              });

            if (rpcError) {
              logger.error("process_pos_sale RPC error", rpcError);
              return createApiErrorResponse(
                new APIError(
                  `Error al procesar la venta: ${rpcError.message}`,
                  500,
                  "RPC_ERROR",
                ),
              );
            }

            const orderId = rpcResult?.order_id;
            const workOrderId = rpcResult?.work_order_id;
            if (!orderId) {
              logger.error("RPC returned no order_id", rpcResult);
              return createApiErrorResponse(
                new APIError(
                  "Error al procesar la venta: la operación no devolvió un ID de orden",
                  500,
                  "RPC_ERROR",
                ),
              );
            }

            const { data: fetchedOrder } = await supabaseServiceRole
              .from("orders")
              .select("*")
              .eq("id", orderId)
              .single();

            newOrder = {
              ...fetchedOrder,
              id: orderId,
              order_number:
                rpcResult.order_number || fetchedOrder?.order_number,
            } as typeof newOrder;

            // RPC post-processing: agreement, billing, update_pos_session_cash, notifications
            if (
              agreement_id &&
              institutionalAmount != null &&
              institutionalAmount > 0
            ) {
              await supabaseServiceRole
                .from("agreement_institutional_balances")
                .insert({
                  agreement_id: agreement_id,
                  order_id: orderId,
                  purchase_order_id: purchase_order_id || null,
                  amount: institutionalAmount,
                  status: "pending",
                });
              if (purchase_order_id) {
                await supabaseServiceRole
                  .from("agreement_purchase_orders")
                  .update({
                    used_amount:
                      (purchaseOrder?.used_amount || 0) + institutionalAmount,
                  })
                  .eq("id", purchase_order_id);
              }
            }

            let billingResult: {
              folio?: string;
              pdfUrl?: string;
              type?: string;
            } | null = null;
            try {
              const billingConfig = await BillingFactory.getBillingConfig(
                effectiveBranchId || "",
              );
              const billingAdapter =
                BillingFactory.createAdapter(billingConfig);
              let ocNumber: string | null = null;
              if (purchase_order_id && purchaseOrder) {
                const { data: po } = await supabaseServiceRole
                  .from("agreement_purchase_orders")
                  .select("oc_number")
                  .eq("id", purchase_order_id)
                  .single();
                ocNumber = po?.oc_number ?? null;
              }
              // ponytail: billing order builder extracted to processResponseBuilder.ts
              const billingOrder = buildBillingOrder({
                orderId,
                orderNumber: rpcResult.order_number || "",
                customerId: customer_id,
                branchId: effectiveBranchId ?? "",
                totalAmount: total_amount,
                subtotal,
                taxAmount: tax_amount || 0,
                items: orderItems,
                customer: customer as {
                  id?: string;
                  first_name?: string;
                  last_name?: string;
                  email?: string;
                  phone?: string;
                  rut?: string;
                } | null,
                createdAt: fetchedOrder?.created_at,
                ocNumber,
                purchaseOrderId: purchase_order_id,
                agreementId: agreement_id,
                customerName: customer_name,
                email,
                customerRut: customer_rut,
                siiBusinessName: sii_business_name,
              });
              billingResult = await billingAdapter.emitDocument(billingOrder);
            } catch (billingError) {
              logger.error(
                "Error emitting billing document (RPC path)",
                billingError,
              );
            }

            // ponytail: extracted to processPaymentUtils.ts
            const cashAmount = computeCashAmount(
              paymentsArray || [],
              payment_method_type,
              cash_received,
              total_amount,
            );
            if (cashAmount > 0 && posSessionId) {
              await supabase.rpc("update_pos_session_cash", {
                session_id: posSessionId,
                cash_amount: cashAmount,
              });
            }

            const { NotificationService } = await import(
              "@/lib/notifications/notification-service"
            );
            NotificationService.notifyNewSale(
              orderId,
              rpcResult.order_number || "",
              email || "venta@pos.local",
              total_amount,
              effectiveBranchId ?? undefined,
            ).catch((err) =>
              logger.error("Error creating sale notification", err),
            );

            if (workOrderId) {
              const customerNameForNotif = customer
                ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
                  customer.email ||
                  "Cliente"
                : "Cliente";
              NotificationService.notifyNewWorkOrder(
                workOrderId,
                rpcResult.work_order_number || "",
                customerNameForNotif,
                total_amount,
                effectiveBranchId ?? undefined,
              ).catch((err) =>
                logger.error("Error creating work order notification", err),
              );
            }

            if (quote_id && quote) {
              await supabaseServiceRole
                .from("quotes")
                .update({
                  status: "accepted",
                  converted_to_work_order_id: workOrderId || null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", quote_id);
            }

            // ponytail: response builders extracted to processResponseBuilder.ts
            const fullOrder = buildFullOrderResponse(
              newOrder,
              orderItems,
              paymentAmount,
              dbPaymentMethod,
              siiInvoiceNumber,
              customerName,
              billingFirstName,
              billingLastName,
            );

            const successResponse = {
              order: fullOrder,
              work_order: buildWorkOrderResponse(
                workOrderId,
                rpcResult.work_order_number,
                siiInvoiceNumber,
              ),
              billing: buildBillingResponse(billingResult),
            };

            if (idempotency_key) {
              await supabaseServiceRole.from("pos_sale_idempotency").upsert(
                {
                  idempotency_key,
                  order_id: orderId,
                  work_order_id: workOrderId || null,
                  response_snapshot: successResponse,
                },
                { onConflict: "idempotency_key" },
              );
            }
            return createApiSuccessResponse(successResponse);
          } else {
            // Legacy path: sequential inserts (operativos with mobile stock)
            const { data: newOrderData, error: orderError } =
              await supabaseServiceRole
                .from("orders")
                .insert({
                  order_number: orderNumber,
                  email: email || customer?.email || "venta@pos.local",
                  status: "processing",
                  payment_status: payment_status || "paid",
                  subtotal: subtotal,
                  tax_amount: tax_amount || 0,
                  discount_amount: 0,
                  total_amount: total_amount,
                  currency: currency || "CLP",
                  mp_payment_method: payment_method_type,
                  branch_id: effectiveBranchId,
                  organization_id: orderOrganizationId,
                  field_operation_id: fieldOperationId,
                  customer_notes: null,
                  is_pos_sale: true,
                  pos_session_id: posSessionId || null,
                  customer_name: customerName,
                  billing_first_name: billingFirstName,
                  billing_last_name: billingLastName,
                  sii_rut: customer_rut || sii_rut || customer?.rut || null,
                  sii_business_name: sii_business_name || null,
                  customer_id: customer_id || null,
                  agreement_id: agreement_id || null,
                  purchase_order_id: purchase_order_id || null,
                  copago_amount: copagoAmount ?? null,
                  institutional_amount: institutionalAmount ?? null,
                })
                .select()
                .single();

            if (orderError) {
              logger.error("Error creating order", orderError);
              return NextResponse.json(
                {
                  error: "Failed to create order",
                  details: orderError.message,
                },
                { status: 500 },
              );
            }
            newOrder = newOrderData as typeof newOrder;

            // Insert order_items for persistence (cash register, reports, etc.)
            if (orderItems.length > 0) {
              const { error: itemsError } = await supabaseServiceRole
                .from("order_items")
                .insert(
                  orderItems.map((item) => ({
                    order_id: newOrder.id,
                    product_id: item.product_id || null,
                    product_name: item.product_name || "Producto",
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.unit_price * item.quantity,
                    sku: item.sku || null,
                  })),
                );

              if (itemsError) {
                logger.error("Error creating order items", itemsError);
                // Don't fail the sale - order is created, items can be fixed later
              }
            }

            // Register payment(s) in order_payments (paymentAmount, dbPaymentMethod already computed above)
            if (agreement_id && copagoAmount != null) {
              const { error: paymentError } = await supabaseServiceRole
                .from("order_payments")
                .insert({
                  order_id: newOrder.id,
                  amount: copagoAmount,
                  payment_method: dbPaymentMethod,
                  pos_session_id: posSessionId || null,
                  payment_reference:
                    fiscal_reference?.trim() || siiInvoiceNumber || null,
                  created_by: user.id,
                  notes: `Copago convenio - ${payment_method_type}`,
                });
              if (paymentError) {
                logger.error("Error creating payment record", paymentError);
              }

              if (institutionalAmount != null && institutionalAmount > 0) {
                const { error: balanceErr } = await supabaseServiceRole
                  .from("agreement_institutional_balances")
                  .insert({
                    agreement_id: agreement_id,
                    order_id: newOrder.id,
                    purchase_order_id: purchase_order_id || null,
                    amount: institutionalAmount,
                    status: "pending",
                  });
                if (balanceErr) {
                  logger.error(
                    "Error creating institutional balance",
                    balanceErr,
                  );
                }

                if (purchase_order_id) {
                  await supabaseServiceRole
                    .from("agreement_purchase_orders")
                    .update({
                      used_amount:
                        (purchaseOrder?.used_amount || 0) + institutionalAmount,
                    })
                    .eq("id", purchase_order_id);
                }
              }
            } else if (paymentsArray && paymentsArray.length > 0) {
              for (let i = 0; i < paymentsArray.length; i++) {
                const p = paymentsArray[i];
                const dbMethod = PAYMENT_METHOD_MAP[p.method] || p.method;
                const { error: payErr } = await supabaseServiceRole
                  .from("order_payments")
                  .insert({
                    order_id: newOrder.id,
                    amount: p.amount,
                    payment_method: dbMethod,
                    pos_session_id: posSessionId || null,
                    payment_reference:
                      i === 0
                        ? fiscal_reference?.trim() || siiInvoiceNumber || null
                        : null,
                    created_by: user.id,
                    notes:
                      paymentsArray.length > 1
                        ? `Pago ${i + 1}/${paymentsArray.length} - ${dbMethod}`
                        : `Pago - ${dbMethod}`,
                  });
                if (payErr) {
                  logger.error("Error creating payment record", payErr);
                }
              }
            } else {
              const { error: paymentError } = await supabaseServiceRole
                .from("order_payments")
                .insert({
                  order_id: newOrder.id,
                  amount: paymentAmount,
                  payment_method: dbPaymentMethod,
                  pos_session_id: posSessionId || null,
                  payment_reference:
                    fiscal_reference?.trim() || siiInvoiceNumber || null,
                  created_by: user.id,
                  notes: `Pago inicial - Método: ${payment_method_type}`,
                });
              if (paymentError) {
                logger.error("Error creating payment record", paymentError);
              }
            }

            // Create pos_transaction for sale (traceability, session movements)
            if (posSessionId) {
              const { error: txError } = await supabaseServiceRole
                .from("pos_transactions")
                .insert({
                  order_id: newOrder.id,
                  pos_session_id: posSessionId,
                  transaction_type: "sale",
                  payment_method: dbPaymentMethod,
                  amount: total_amount,
                  change_amount: change_amount ?? null,
                  notes: `Venta POS - ${newOrder.order_number}`,
                });
              if (txError) {
                logger.warn("Could not create pos_transaction for sale", {
                  txError,
                  order_id: newOrder.id,
                });
              }
            }

            // Update order's mp_payment_method with normalized value
            const { error: updatePaymentMethodError } =
              await supabaseServiceRole
                .from("orders")
                .update({ mp_payment_method: dbPaymentMethod })
                .eq("id", newOrder.id);

            if (updatePaymentMethodError) {
              logger.error(
                "Error updating payment method",
                updatePaymentMethodError,
              );
              // Don't fail, log the error
            }

            // Calculate order balance
            const { data: balanceData, error: balanceError } =
              await supabaseServiceRole.rpc("calculate_order_balance", {
                p_order_id: newOrder.id,
              });

            const balance = balanceError
              ? total_amount - paymentAmount
              : balanceData || 0;

            // Emit billing document using BillingAdapter (Shadow Billing)
            let billingResult = null;
            try {
              const billingConfig = await BillingFactory.getBillingConfig(
                effectiveBranchId || "",
              );
              const billingAdapter =
                BillingFactory.createAdapter(billingConfig);

              let ocNumber: string | null = null;
              if (purchase_order_id && purchaseOrder) {
                const { data: po } = await supabaseServiceRole
                  .from("agreement_purchase_orders")
                  .select("oc_number")
                  .eq("id", purchase_order_id)
                  .single();
                ocNumber = po?.oc_number ?? null;
              }

              // ponytail: billing order builder extracted to processResponseBuilder.ts
              const billingOrder = buildBillingOrder({
                orderId: newOrder.id,
                orderNumber: newOrder.order_number,
                customerId: customer_id,
                branchId: effectiveBranchId ?? "",
                totalAmount: total_amount,
                subtotal,
                taxAmount: tax_amount || 0,
                items: orderItems,
                customer: customer as {
                  id?: string;
                  first_name?: string;
                  last_name?: string;
                  email?: string;
                  phone?: string;
                  rut?: string;
                } | null,
                createdAt: newOrder.created_at,
                ocNumber,
                purchaseOrderId: purchase_order_id,
                agreementId: agreement_id,
                customerName: customer_name,
                email,
                customerRut: customer_rut,
                siiBusinessName: sii_business_name,
              });

              billingResult = await billingAdapter.emitDocument(billingOrder);
              logger.info("Billing document emitted", {
                folio: billingResult.folio,
                type: billingResult.type,
              });
            } catch (billingError) {
              logger.error("Error emitting billing document", billingError);
              // Don't fail the transaction, but log the error
              // The order is still created, just without billing document
            }

            // Stock reduction (validation already done above; productsForStockCheck, useMobileStock in scope)
            for (const item of items) {
              if (
                item.product_id &&
                !item.product_id.includes("frame-manual") &&
                !item.product_id.includes("lens-") &&
                !item.product_id.includes("treatments-") &&
                !item.product_id.includes("labor-") &&
                !item.product_id.includes("discount-")
              ) {
                // Verificar si el producto es de tipo "service" (no requiere stock)
                const product = productsForStockCheck.find(
                  (p) => p.id === item.product_id,
                );
                if (product?.product_type === "service") {
                  // Los servicios no requieren stock
                  logger.info("Skipping stock update for service product", {
                    product_id: item.product_id,
                  });
                  continue;
                }

                if (useMobileStock && fieldOperationId) {
                  // Operativo mode: reduce from operativo_mobile_stock
                  const reduceResult = await reduceOperativoMobileStock(
                    item.product_id,
                    fieldOperationId,
                    item.quantity,
                    supabaseServiceRole,
                  );
                  if (!reduceResult.success) {
                    logger.error(
                      `Error reducing operativo mobile stock for product ${item.product_id}`,
                      { error: reduceResult.error },
                    );
                    return createApiErrorResponse(
                      new APIError(
                        reduceResult.error || "Error al actualizar stock móvil",
                        400,
                        "INSUFFICIENT_STOCK",
                      ),
                    );
                  }
                  logger.info("Operativo mobile stock reduced", {
                    product_id: item.product_id,
                    quantity_decreased: item.quantity,
                  });
                } else {
                  // Branch mode: reduce from product_branch_stock
                  const branchId = effectiveBranchId;
                  if (!branchId) {
                    logger.warn(
                      `Cannot update inventory: no branch_id for product ${item.product_id}`,
                    );
                    continue;
                  }

                  // Verificar stock actual antes de reducir
                  const { data: currentStock } = await supabaseServiceRole
                    .from("product_branch_stock")
                    .select("quantity")
                    .eq("product_id", item.product_id)
                    .eq("branch_id", branchId)
                    .maybeSingle();

                  const currentQuantity = currentStock?.quantity || 0;

                  // Si no hay stock registrado y se intenta reducir, crear registro con 0 y luego reducir
                  if (!currentStock && currentQuantity === 0) {
                    logger.info("Creating initial stock record for product", {
                      product_id: item.product_id,
                      branch_id: branchId,
                    });

                    const { error: createError } = await supabaseServiceRole
                      .from("product_branch_stock")
                      .insert({
                        product_id: item.product_id,
                        branch_id: branchId,
                        quantity: 0,
                        reserved_quantity: 0,
                        low_stock_threshold: DEFAULT_LOW_STOCK_THRESHOLD,
                      });

                    if (createError) {
                      logger.error(
                        `Error creating initial stock record for product ${item.product_id}`,
                        {
                          error: createError,
                          product_id: item.product_id,
                          branch_id: branchId,
                        },
                      );
                    }
                  }

                  logger.info("Attempting to update inventory", {
                    product_id: item.product_id,
                    branch_id: branchId,
                    quantity: item.quantity,
                  });

                  const { data: stockUpdateResult, error: inventoryError } =
                    await supabaseServiceRole.rpc("update_product_stock", {
                      p_product_id: item.product_id,
                      p_branch_id: branchId,
                      p_quantity_change: -item.quantity,
                      p_reserve: false,
                      p_movement_type: "sale",
                      p_reference_type: "order",
                      p_reference_id: newOrder.id,
                      p_created_by: user.id,
                    });

                  if (inventoryError) {
                    logger.error(
                      `Error updating inventory for product ${item.product_id}`,
                      {
                        error: inventoryError,
                        product_id: item.product_id,
                        branch_id: branchId,
                        quantity: item.quantity,
                      },
                    );
                  } else {
                    logger.info("Inventory updated successfully", {
                      product_id: item.product_id,
                      branch_id: branchId,
                      quantity_decreased: item.quantity,
                      result: stockUpdateResult,
                    });
                  }
                }
              }
            }

            // Reduce contact lens inventory by prescription (OD and OS)
            if (contact_lens_family_id && contact_lens_quantity > 0) {
              const branchId = effectiveBranchId;

              // Reduce stock for OD (right eye)
              if (contact_lens_rx_sphere_od != null) {
                const odReduction = await supabaseServiceRole.rpc(
                  "reduce_contact_lens_stock",
                  {
                    p_contact_lens_family_id: contact_lens_family_id,
                    p_branch_id: branchId,
                    p_sphere: contact_lens_rx_sphere_od,
                    p_cylinder: contact_lens_rx_cylinder_od || 0,
                    p_quantity: contact_lens_quantity,
                  },
                );

                if (odReduction.error) {
                  logger.error("Error reducing contact lens stock (OD)", {
                    family_id: contact_lens_family_id,
                    sphere: contact_lens_rx_sphere_od,
                    cylinder: contact_lens_rx_cylinder_od,
                    quantity: contact_lens_quantity,
                    error: odReduction.error,
                  });
                } else {
                  logger.info("Contact lens stock reduced (OD)", {
                    family_id: contact_lens_family_id,
                    sphere: contact_lens_rx_sphere_od,
                    cylinder: contact_lens_rx_cylinder_od,
                    quantity: contact_lens_quantity,
                  });
                }
              }

              // Reduce stock for OS (left eye)
              if (contact_lens_rx_sphere_os != null) {
                const osReduction = await supabaseServiceRole.rpc(
                  "reduce_contact_lens_stock",
                  {
                    p_contact_lens_family_id: contact_lens_family_id,
                    p_branch_id: branchId,
                    p_sphere: contact_lens_rx_sphere_os,
                    p_cylinder: contact_lens_rx_cylinder_os || 0,
                    p_quantity: contact_lens_quantity,
                  },
                );

                if (osReduction.error) {
                  logger.error("Error reducing contact lens stock (OS)", {
                    family_id: contact_lens_family_id,
                    sphere: contact_lens_rx_sphere_os,
                    cylinder: contact_lens_rx_cylinder_os,
                    quantity: contact_lens_quantity,
                    error: osReduction.error,
                  });
                } else {
                  logger.info("Contact lens stock reduced (OS)", {
                    family_id: contact_lens_family_id,
                    sphere: contact_lens_rx_sphere_os,
                    cylinder: contact_lens_rx_cylinder_os,
                    quantity: contact_lens_quantity,
                  });
                }
              }
            }

            // Only create work order if there are lens items (actuallyRequiresWorkOrder computed above)
            if (!actuallyRequiresWorkOrder) {
              // No lens items, just return order and billing info
              // Create notification for new sale (non-blocking)
              const { NotificationService } = await import(
                "@/lib/notifications/notification-service"
              );
              NotificationService.notifyNewSale(
                newOrder.id,
                newOrder.order_number,
                newOrder.email || "venta@pos.local",
                newOrder.total_amount,
                newOrder.branch_id ?? effectiveBranchId ?? undefined,
              ).catch((err) =>
                logger.error("Error creating sale notification", err),
              );

              const successResponse = {
                order: { ...newOrder, order_items: orderItems },
                work_order: null,
                billing: billingResult
                  ? {
                      folio: billingResult.folio,
                      pdfUrl: billingResult.pdfUrl,
                      type: billingResult.type,
                    }
                  : null,
              };
              if (idempotency_key) {
                await supabaseServiceRole.from("pos_sale_idempotency").upsert(
                  {
                    idempotency_key,
                    order_id: newOrder.id,
                    work_order_id: null,
                    response_snapshot: successResponse,
                  },
                  { onConflict: "idempotency_key" },
                );
              }
              return createApiSuccessResponse(successResponse);
            }

            // Cash-First Logic: Determine work order status based on payment
            // Get minimum deposit requirement
            const { data: minDepositData, error: minDepositError } =
              await supabaseServiceRole.rpc("get_min_deposit", {
                p_order_total: total_amount,
                p_branch_id: effectiveBranchId,
              });

            const minDeposit = minDepositError
              ? computeMinDepositFallback(total_amount)
              : (minDepositData ?? computeMinDepositFallback(total_amount));

            // Determine work order status and payment status based on Cash-First
            // ponytail: extracted to processPaymentUtils.ts
            const {
              status: workOrderStatus,
              paymentStatus: workOrderPaymentStatus,
            } = computeWorkOrderStatus(
              paymentAmount,
              minDeposit,
              total_amount,
              balance,
            );

            if (paymentAmount < minDeposit) {
              logger.info("Insufficient deposit", {
                paid: paymentAmount,
                required: minDeposit,
                total: total_amount,
              });
            }

            // Generate work order number
            const { data: workOrderNumber, error: workOrderNumberError } =
              await supabaseServiceRole.rpc("generate_work_order_number");

            if (workOrderNumberError || !workOrderNumber) {
              logger.error(
                "Error generating work order number",
                workOrderNumberError,
              );
              // Rollback order creation if work order number generation fails
              await supabaseServiceRole
                .from("orders")
                .delete()
                .eq("id", newOrder.id);
              return NextResponse.json(
                { error: "Failed to generate work order number" },
                { status: 500 },
              );
            }

            // Create work order
            const workOrderData: Record<string, unknown> = {
              work_order_number: workOrderNumber,
              branch_id: effectiveBranchId,
              field_operation_id: fieldOperationId,
              operativo_batch_id: fieldOperationId,
              customer_id: customer_id || null, // Can be null for simple product sales
              prescription_id: lensInfo.prescription_id || null, // ✅ Guardar prescription_id
              quote_id: quote_id || null, // Link to quote if sale comes from quote
              frame_product_id: frameInfo.frame_product_id,
              frame_name: frameInfo.frame_name,
              frame_brand: frameInfo.frame_brand,
              frame_model: frameInfo.frame_model,
              frame_color: frameInfo.frame_color,
              frame_size: frameInfo.frame_size,
              frame_sku: frameInfo.frame_sku,
              frame_serial_number: null,
              lens_family_id:
                presbyopia_solution === "two_separate"
                  ? null
                  : lensInfo.lens_family_id || null, // ✅ Guardar lens_family_id
              lens_type: lensInfo.lens_type,
              lens_sourcing_type:
                (lensInfo as any).lens_sourcing_type || "surfaced",
              lens_material: lensInfo.lens_material,
              lens_index: lensInfo.lens_index,
              lens_treatments: lensInfo.lens_treatments,
              lens_tint_color: lensInfo.lens_tint_color,
              lens_tint_percentage: lensInfo.lens_tint_percentage,
              // Presbyopia solution fields
              presbyopia_solution: presbyopia_solution || "none",
              far_lens_family_id:
                presbyopia_solution === "two_separate"
                  ? far_lens_family_id || null
                  : null,
              near_lens_family_id:
                presbyopia_solution === "two_separate"
                  ? near_lens_family_id || null
                  : null,
              far_lens_cost:
                presbyopia_solution === "two_separate"
                  ? far_lens_cost || 0
                  : null,
              near_lens_cost:
                presbyopia_solution === "two_separate"
                  ? near_lens_cost || 0
                  : null,
              // Contact lens fields
              contact_lens_family_id: contact_lens_family_id || null,
              contact_lens_rx_sphere_od: contact_lens_rx_sphere_od || null,
              contact_lens_rx_cylinder_od: contact_lens_rx_cylinder_od || null,
              contact_lens_rx_axis_od: contact_lens_rx_axis_od || null,
              contact_lens_rx_add_od: contact_lens_rx_add_od || null,
              contact_lens_rx_base_curve_od:
                contact_lens_rx_base_curve_od || null,
              contact_lens_rx_diameter_od: contact_lens_rx_diameter_od || null,
              contact_lens_rx_sphere_os: contact_lens_rx_sphere_os || null,
              contact_lens_rx_cylinder_os: contact_lens_rx_cylinder_os || null,
              contact_lens_rx_axis_os: contact_lens_rx_axis_os || null,
              contact_lens_rx_add_os: contact_lens_rx_add_os || null,
              contact_lens_rx_base_curve_os:
                contact_lens_rx_base_curve_os || null,
              contact_lens_rx_diameter_os: contact_lens_rx_diameter_os || null,
              contact_lens_quantity: contact_lens_family_id
                ? contact_lens_quantity || 1
                : null,
              contact_lens_cost: contact_lens_cost || null,
              prescription_snapshot: null,
              lab_name: null,
              lab_contact: null,
              lab_order_number: null,
              lab_estimated_delivery_date: null,
              status: workOrderStatus, // Use Cash-First determined status
              frame_cost: frameInfo.frame_cost,
              lens_cost:
                presbyopia_solution === "two_separate"
                  ? (far_lens_cost || 0) + (near_lens_cost || 0)
                  : contact_lens_cost || lensInfo.lens_cost || 0,
              treatments_cost: treatmentsCost,
              labor_cost: laborCost,
              lab_cost: 0,
              subtotal: subtotal,
              tax_amount: tax_amount || 0,
              discount_amount: 0,
              total_amount: total_amount,
              currency: currency || "CLP",
              payment_status: workOrderPaymentStatus, // Use Cash-First determined payment status
              payment_method: payment_method_type,
              deposit_amount: paymentAmount, // Actual amount paid
              balance_amount: balance, // Calculated balance
              pos_order_id: newOrder.id, // Link work order to the order created above
              agreement_id: agreement_id || null,
              internal_notes: `Venta POS - Método: ${payment_method_type}${billingResult ? ` - Folio: ${billingResult.folio}` : ""} - Depósito: ${paymentAmount}/${total_amount} - Saldo: ${balance}${presbyopia_solution && presbyopia_solution !== "none" ? ` - Presbicia: ${presbyopia_solution}` : ""}${lensInfo.lens_family_id ? ` - Familia: ${lensFamily?.name || lensInfo.lens_family_id}` : ""}`,
              customer_notes: null,
              assigned_to: user.id,
              created_by: user.id,
            };

            const { data: newWorkOrder, error: workOrderError } =
              await supabaseServiceRole
                .from("lab_work_orders")
                .insert(workOrderData)
                .select()
                .single();

            if (workOrderError) {
              logger.error("Error creating work order", workOrderError);
              return NextResponse.json(
                {
                  error: "Failed to create work order",
                  details: workOrderError.message,
                  code: workOrderError.code,
                  hint: workOrderError.hint,
                },
                { status: 500 },
              );
            }

            // Update status dates if status is not 'quote'
            if (workOrderData.status && workOrderData.status !== "quote") {
              await supabaseServiceRole.rpc("update_work_order_status", {
                p_work_order_id: newWorkOrder.id,
                p_new_status: workOrderData.status as string,
                p_changed_by: user.id,
                p_notes: "Work order created from POS sale",
              });
            }

            // ✅ NOTA: La reducción de stock ya se hizo antes de verificar work order (línea ~700)
            // Esto asegura que el stock se reduce para TODOS los productos, no solo los que requieren work order

            // Create POS transaction record (link to work order)
            // Note: pos_transactions currently only has order_id, so we'll skip this for now
            // TODO: Add work_order_id column to pos_transactions table via migration
            // For now, we'll log the transaction info but not create the record
            logger.info("POS transaction (work order)", {
              work_order_id: newWorkOrder.id,
              pos_session_id: posSessionId,
              transaction_type: "sale",
              payment_method: payment_method_type,
              amount: total_amount,
              change_amount: change_amount || 0,
            });

            // Note: Installments for work orders are handled differently
            // For now, we'll skip installments for POS work orders
            // If needed, this can be implemented later

            // Update POS session cash amount if cash payment
            // ponytail: extracted to processPaymentUtils.ts
            const cashAmount = computeCashAmount(
              paymentsArray || [],
              payment_method_type,
              cash_received,
              total_amount,
            );
            if (cashAmount > 0 && posSessionId) {
              const { error: cashError } = await supabase.rpc(
                "update_pos_session_cash",
                { session_id: posSessionId, cash_amount: cashAmount },
              );
              if (cashError) {
                logger.error("Error updating POS session cash", cashError);
              }
            }

            logger.info("POS sale processed successfully", {
              workOrderId: newWorkOrder.id,
              workOrderNumber: newWorkOrder.work_order_number,
            });

            // Create notifications (non-blocking)
            const { NotificationService } = await import(
              "@/lib/notifications/notification-service"
            );

            // Notification for new sale
            NotificationService.notifyNewSale(
              newOrder.id,
              newOrder.order_number,
              newOrder.email || "venta@pos.local",
              newOrder.total_amount,
              newOrder.branch_id ?? effectiveBranchId ?? undefined,
            ).catch((err) =>
              logger.error("Error creating sale notification", err),
            );

            // Notification for new work order (only if work order was created)
            if (newWorkOrder) {
              const customerName = customer
                ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
                  customer.email ||
                  "Cliente"
                : "Cliente";

              NotificationService.notifyNewWorkOrder(
                newWorkOrder.id,
                newWorkOrder.work_order_number,
                customerName,
                newWorkOrder.total_amount,
                newWorkOrder.branch_id ?? effectiveBranchId ?? undefined,
              ).catch((err) =>
                logger.error("Error creating work order notification", err),
              );
            }

            // Update quote status if sale comes from a quote
            if (quote_id && quote) {
              const workOrderId = newWorkOrder?.id || null;
              const { error: quoteUpdateError } = await supabaseServiceRole
                .from("quotes")
                .update({
                  status: "accepted",
                  converted_to_work_order_id: workOrderId,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", quote_id);

              if (quoteUpdateError) {
                logger.error("Error updating quote status", quoteUpdateError);
                // Don't fail the transaction, but log the error
              } else {
                logger.info("Quote marked as accepted", {
                  quote_id,
                  work_order_id: workOrderId,
                  order_id: newOrder.id,
                });
              }
            }

            // Construct full order object for frontend
            // ponytail: response builders extracted to processResponseBuilder.ts
            const fullOrder = buildFullOrderResponse(
              newOrder,
              orderItems,
              paymentAmount,
              dbPaymentMethod,
              siiInvoiceNumber,
              customerName,
              billingFirstName,
              billingLastName,
            );

            const successResponse = {
              order: fullOrder,
              work_order: {
                ...newWorkOrder,
                sii_invoice_number: siiInvoiceNumber,
              },
              billing: buildBillingResponse(billingResult),
            };
            if (idempotency_key) {
              await supabaseServiceRole.from("pos_sale_idempotency").upsert(
                {
                  idempotency_key,
                  order_id: newOrder.id,
                  work_order_id: newWorkOrder.id,
                  response_snapshot: successResponse,
                },
                { onConflict: "idempotency_key" },
              );
            }
            return createApiSuccessResponse(successResponse);
          }
        } catch (error) {
          if (error instanceof RateLimitError) {
            logger.warn("Rate limit exceeded for POS sale", {
              error: error.message,
            });
            return NextResponse.json({ error: error.message }, { status: 429 });
          }
          const errMsg = error instanceof Error ? error.message : String(error);
          const errStack = error instanceof Error ? error.stack : undefined;
          logger.error("POS process sale error", {
            error: errMsg,
            stack: errStack,
          });
          return createApiErrorResponse(
            new APIError(
              `Error al procesar la venta: ${errMsg}`,
              500,
              "INTERNAL_ERROR",
            ),
          );
        }
      },
    );
  } catch (error) {
    // Catch any errors from withRateLimit itself (e.g., RateLimitError thrown before try-catch)
    if (error instanceof RateLimitError) {
      logger.warn("Rate limit exceeded", { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    // Log and return error response for any other unexpected errors
    logger.error(
      "Unexpected error in POST handler",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import { RateLimitError, ValidationError } from "@/lib/api/errors";
import { processSaleSchema } from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { BillingFactory } from "@/lib/billing/BillingFactory";
import type { Order as BillingOrder } from "@/lib/billing/adapters/BillingAdapter";

export async function POST(request: NextRequest) {
  try {
    return await (withRateLimit(rateLimitConfigs.pos) as any)(
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

          // Validate branch access for non-super admins
          if (!branchContext.isSuperAdmin && !branchContext.branchId) {
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
            contact_lens_cost,
            contact_lens_price,
            quote_id,
          } = validatedBody;

          const supabaseServiceRole = createServiceRoleClient();

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
          if (!branchContext.isSuperAdmin && branchContext.branchId) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStart = today.toISOString();

            const { data: openSession, error: sessionCheckError } =
              await supabaseServiceRole
                .from("pos_sessions")
                .select("id")
                .eq("branch_id", branchContext.branchId)
                .eq("status", "open")
                .gte("opening_time", todayStart)
                .maybeSingle();

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
                  error:
                    "Debe abrir la caja antes de realizar ventas. Por favor, abra la caja desde la sección Caja.",
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

            if (branchContext.branchId) {
              query = query.eq("branch_id", branchContext.branchId);
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
                  branch_id: branchContext.branchId,
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
          let frameInfo: {
            frame_product_id: string | null;
            frame_name: string;
            frame_brand: string | null;
            frame_model: string | null;
            frame_color: string | null;
            frame_size: string | null;
            frame_sku: string | null;
            frame_cost: number;
            customer_own_frame: boolean;
          } = {
            frame_product_id: null,
            frame_name: "Marco",
            frame_brand: null,
            frame_model: null,
            frame_color: null,
            frame_size: null,
            frame_sku: null,
            frame_cost: 0,
            customer_own_frame: false,
          };

          let lensInfo: {
            lens_family_id: string | null;
            lens_type: string;
            lens_material: string;
            lens_index: number | null;
            lens_treatments: string[];
            lens_tint_color: string | null;
            lens_tint_percentage: number | null;
            lens_cost: number;
            prescription_id: string | null;
          } = {
            lens_family_id: null,
            lens_type: "single_vision",
            lens_material: "cr39",
            lens_index: null,
            lens_treatments: [],
            lens_tint_color: null,
            lens_tint_percentage: null,
            lens_cost: 0,
            prescription_id: null,
          };

          let treatmentsCost = 0;
          let laborCost = 0;

          // Use structured data if available (preferred method)
          if (frame_data) {
            frameInfo = {
              frame_product_id: frame_data.frame_product_id || null,
              frame_name: frame_data.frame_name || "Marco",
              frame_brand: frame_data.frame_brand || null,
              frame_model: frame_data.frame_model || null,
              frame_color: frame_data.frame_color || null,
              frame_size: frame_data.frame_size || null,
              frame_sku: frame_data.frame_sku || null,
              frame_cost: 0, // Will be extracted from items
              customer_own_frame: frame_data.customer_own_frame || false,
            };
          }

          if (lens_data) {
            lensInfo = {
              lens_family_id: lens_data.lens_family_id || null,
              lens_type: lens_data.lens_type || "single_vision",
              lens_material: lens_data.lens_material || "cr39",
              lens_index: lens_data.lens_index || null,
              lens_treatments: lens_data.lens_treatments || [],
              lens_tint_color: lens_data.lens_tint_color || null,
              lens_tint_percentage: lens_data.lens_tint_percentage || null,
              lens_cost: 0, // Will be extracted from items
              prescription_id: lens_data.prescription_id || null,
            };
          }

          // Parse items to extract costs and fallback data (if structured data not available)
          for (const item of items) {
            const itemName = item.product_name.toLowerCase();
            const itemId = item.product_id || "";

            // Frame detection - only if not already set from structured data
            if (
              !frame_data &&
              (itemId.includes("frame") ||
                itemName.includes("marco") ||
                itemName.includes("frame"))
            ) {
              frameInfo.frame_name = item.product_name;
              frameInfo.frame_cost = item.unit_price;
              // Try to extract frame_product_id if it's a valid UUID (not a temporary ID)
              if (
                item.product_id &&
                !item.product_id.includes("frame-manual") &&
                !item.product_id.includes("-")
              ) {
                frameInfo.frame_product_id = item.product_id;
              }
            } else if (
              frame_data &&
              (itemId.includes("frame") ||
                itemName.includes("marco") ||
                itemName.includes("frame"))
            ) {
              // Extract cost from items even if we have structured data
              frameInfo.frame_cost = item.unit_price;
            }

            // Lens detection - only if not already set from structured data
            if (
              !lens_data &&
              (itemId.includes("lens") ||
                itemName.includes("lente") ||
                itemName.includes("lens"))
            ) {
              lensInfo.lens_cost = item.unit_price;
              // Try to parse lens type and material from name
              const lensMatch = item.product_name.match(
                /lente\s+(\w+)\s+(\w+)/i,
              );
              if (lensMatch) {
                lensInfo.lens_type = lensMatch[1];
                lensInfo.lens_material = lensMatch[2];
              }
            } else if (
              lens_data &&
              (itemId.includes("lens") ||
                itemName.includes("lente") ||
                itemName.includes("lens"))
            ) {
              // Extract cost from items even if we have structured data
              lensInfo.lens_cost = item.unit_price;
            }

            // Treatments detection
            if (
              itemId.includes("treatments") ||
              itemName.includes("tratamiento") ||
              itemName.includes("treatment")
            ) {
              treatmentsCost += item.unit_price;
              // Try to extract treatments from name (only if not in structured data)
              if (!lens_data) {
                const treatmentMatch = item.product_name.match(
                  /tratamientos?:\s*(.+)/i,
                );
                if (treatmentMatch) {
                  const treatments = treatmentMatch[1]
                    .split(",")
                    .map((t) => t.trim().toLowerCase());
                  lensInfo.lens_treatments = treatments;
                }
              }
            }

            // Labor detection
            if (
              itemId.includes("labor") ||
              itemName.includes("mano de obra") ||
              itemName.includes("montaje")
            ) {
              laborCost += item.unit_price;
            }
          }

          // Get customer information if customer_id is provided
          let customer: any = null;
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

          // Validate quote if provided
          let quote: any = null;
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

          let orderNumber: string;
          if (lastOrder?.order_number) {
            const match = lastOrder.order_number.match(/-(\d+)$/);
            const lastNum = match ? parseInt(match[1], 10) : 0;
            orderNumber = `ORD-${dateStr}-${String(lastNum + 1).padStart(4, "0")}`;
          } else {
            orderNumber = `ORD-${dateStr}-0001`;
          }

          // Create order in orders table (for billing and financial tracking)
          // Create order in orders table (for billing and financial tracking)
          const orderItems = items.map((item, idx) => ({
            id: `item-${idx}`,
            product_id: item.product_id || undefined,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.unit_price * item.quantity,
            sku: (item as any).sku || undefined,
          }));

          // ✅ Determinar nombre del cliente para guardar en la orden
          let customerName: string | null = null;
          let billingFirstName: string | null = null;
          let billingLastName: string | null = null;

          if (customer_id && customer) {
            // Cliente registrado
            customerName =
              customer.first_name && customer.last_name
                ? `${customer.first_name} ${customer.last_name}`.trim()
                : customer.email || null;
            billingFirstName = customer.first_name || null;
            billingLastName = customer.last_name || null;
          } else if (customer_name) {
            // Cliente no registrado con nombre proporcionado
            customerName = customer_name;
            const nameParts = customer_name.split(" ");
            billingFirstName = nameParts[0] || null;
            billingLastName = nameParts.slice(1).join(" ") || null;
          } else if (sii_business_name) {
            // Empresa (SII)
            customerName = sii_business_name;
            billingFirstName = null;
            billingLastName = null;
          }

          // Resolve organization_id so orders appear in org-scoped lists (Caja, etc.)
          let orderOrganizationId: string | null = null;
          if (branchContext.branchId) {
            const { data: branchRow } = await supabaseServiceRole
              .from("branches")
              .select("organization_id")
              .eq("id", branchContext.branchId)
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

          const { data: newOrder, error: orderError } =
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
                branch_id: branchContext.branchId,
                organization_id: orderOrganizationId,
                customer_notes: null,
                is_pos_sale: true,
                pos_session_id: posSessionId || null,
                // ✅ NUEVO: Campos de nombre de cliente
                customer_name: customerName,
                billing_first_name: billingFirstName,
                billing_last_name: billingLastName,
                sii_rut: customer_rut || sii_rut || customer?.rut || null,
                sii_business_name: sii_business_name || null,
              })
              .select()
              .single();

          if (orderError) {
            logger.error("Error creating order", orderError);
            return NextResponse.json(
              { error: "Failed to create order", details: orderError.message },
              { status: 500 },
            );
          }

          // Register payment(s) in order_payments
          // Calcular monto de pago: usar deposit_amount si está disponible, sino cash_received, sino total
          const paymentAmount = deposit_amount || cash_received || total_amount;
          const paymentMethodMap: Record<string, string> = {
            cash: "cash",
            card: "card",
            debit_card: "debit",
            credit_card: "credit",
            transfer: "transfer", // Transferencia se registra como transfer en order_payments
          };
          const dbPaymentMethod =
            paymentMethodMap[payment_method_type] || payment_method_type;

          const { error: paymentError } = await supabaseServiceRole
            .from("order_payments")
            .insert({
              order_id: newOrder.id,
              amount: paymentAmount,
              payment_method: dbPaymentMethod,
              pos_session_id: posSessionId || null, // Asociar pago a la sesión de caja
              payment_reference: siiInvoiceNumber || null,
              created_by: user.id,
              notes: `Pago inicial - Método: ${payment_method_type}`,
            });

          if (paymentError) {
            logger.error("Error creating payment record", paymentError);
            // Don't fail, but log the error
          }

          // Update order's mp_payment_method with normalized value
          const { error: updatePaymentMethodError } = await supabaseServiceRole
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
              branchContext.branchId || "",
            );
            const billingAdapter = BillingFactory.createAdapter(billingConfig);

            const billingOrder: BillingOrder = {
              id: newOrder.id,
              order_number: newOrder.order_number,
              customer_id: customer_id ?? undefined,
              branch_id: branchContext.branchId ?? "",
              total_amount: total_amount,
              subtotal: subtotal,
              tax_amount: tax_amount || 0,
              discount_amount: 0,
              items: orderItems,
              customer: customer
                ? {
                    id: customer.id ?? "",
                    first_name: customer.first_name ?? undefined,
                    last_name: customer.last_name ?? undefined,
                    email: customer.email ?? undefined,
                    phone: customer.phone ?? undefined,
                    rut: customer.rut ?? undefined,
                    business_name: undefined,
                  }
                : {
                    id: "",
                    first_name: customer_name?.split(" ")[0] ?? undefined,
                    last_name: customer_name?.split(" ").slice(1).join(" ") ?? undefined,
                    email: email ?? undefined,
                    phone: undefined,
                    rut: customer_rut ?? undefined,
                    business_name: sii_business_name ?? undefined,
                  },
              created_at: newOrder.created_at,
            };

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

          // ✅ REDUCIR STOCK PARA PRODUCTOS FÍSICOS VENDIDOS (antes de verificar work order)
          // Solo reducir stock para productos físicos que tienen stock (no servicios)
          // Obtener tipos de productos para determinar cuáles requieren stock
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
            product_type?: string;
          }> = [];
          if (productIdsForStock.length > 0) {
            const { data: products } = await supabaseServiceRole
              .from("products")
              .select("id, product_type")
              .in("id", productIdsForStock);
            productsForStockCheck = products || [];
          }

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

              const branchId = branchContext.branchId;
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
              // Esto maneja el caso donde un producto se vende por primera vez sin stock inicial
              if (!currentStock && currentQuantity === 0) {
                logger.info("Creating initial stock record for product", {
                  product_id: item.product_id,
                  branch_id: branchId,
                });

                // Crear registro inicial con cantidad 0
                const { error: createError } = await supabaseServiceRole
                  .from("product_branch_stock")
                  .insert({
                    product_id: item.product_id,
                    branch_id: branchId,
                    quantity: 0,
                    reserved_quantity: 0,
                    low_stock_threshold: 5,
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
                  // Continue anyway - the RPC function will handle it
                }
              }

              logger.info("Attempting to update inventory", {
                product_id: item.product_id,
                branch_id: branchId,
                quantity: item.quantity,
                product_type: product?.product_type,
                current_quantity: currentQuantity,
              });

              const { data: stockUpdateResult, error: inventoryError } =
                await supabaseServiceRole.rpc("update_product_stock", {
                  p_product_id: item.product_id,
                  p_branch_id: branchId,
                  p_quantity_change: -item.quantity, // Negative to decrease
                  p_reserve: false, // Decrease actual quantity, not reserved
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
                // Don't fail the transaction, but log the error
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

          // Verificar si hay items temporales de lentes/labor (estos siempre requieren trabajo)
          const hasTemporaryLensItems = items.some(
            (item) =>
              !item.product_id || // Items sin product_id son temporales
              item.product_id.includes("lens-") ||
              item.product_id.includes("treatments-") ||
              item.product_id.includes("labor-") ||
              item.product_id.includes("frame-manual-"),
          );

          // Verificar tipos de productos en los items
          // Necesitamos obtener el product_type y category de los productos en la base de datos
          let hasFrameInItems = false;
          let productTypesInItems: string[] = [];
          let productCategories: Array<{
            id: string;
            category_name: string | null;
          }> = [];
          if (items.length > 0) {
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
                (p: any) => p.product_type === "frame",
              );
              productTypesInItems = (products || []).map(
                (p: any) => p.product_type,
              );
              // Extraer nombres de categorías
              productCategories = (products || []).map((p: any) => ({
                id: p.id,
                category_name: p.categories?.name || null,
              }));
            }
          }

          // Productos que NO requieren cliente registrado ni trabajo de laboratorio
          const nonWorkOrderTypes = [
            "accessory",
            "sunglasses",
            "service",
            "lens",
          ];
          // Categorías que no requieren trabajo de laboratorio
          const nonWorkOrderCategoryNames = [
            "accesorio",
            "accesorios",
            "lente de sol",
            "lentes de sol",
            "servicio",
            "servicios",
          ];

          // Verificar si todos los productos son de tipos que no requieren trabajo
          const hasOnlyNonWorkOrderProductTypes =
            productTypesInItems.length > 0 &&
            productTypesInItems.every(
              (type) => !type || nonWorkOrderTypes.includes(type),
            );

          // Verificar si todos los productos tienen categorías que no requieren trabajo
          const hasOnlyNonWorkOrderProductCategories =
            productCategories.length > 0 &&
            productCategories.every((cat) => {
              if (!cat.category_name) return false;
              const categoryNameLower = cat.category_name.toLowerCase();
              return nonWorkOrderCategoryNames.some((nonWorkCat) =>
                categoryNameLower.includes(nonWorkCat),
              );
            });

          // Si todos los productos son de tipos o categorías que no requieren trabajo, no se necesita cliente
          const hasOnlyNonWorkOrderProducts =
            hasOnlyNonWorkOrderProductTypes ||
            hasOnlyNonWorkOrderProductCategories;

          // Verificar si hay datos de lentes que requieren montaje (con receta)
          const hasLensDataForMounting =
            (lens_data &&
              (lens_data.lens_family_id ||
                lens_data.lens_type ||
                lens_data.lens_material ||
                lens_data.prescription_id ||
                presbyopia_solution !== "none")) ||
            contact_lens_family_id ||
            contact_lens_cost;

          // Solo se requiere trabajo de laboratorio si:
          // 1. Hay items temporales de lentes/labor (siempre requieren trabajo)
          // 2. Hay un marco EN LOS ITEMS Y hay datos de lentes para montar
          // Los productos de tipo "accessory", "sunglasses", "service", "lens" NO requieren trabajo
          // Los productos con categorías "accesorio", "lente de sol", "servicio" NO requieren trabajo
          // Si solo hay productos que no requieren trabajo, no se necesita cliente
          const actuallyRequiresWorkOrder =
            !hasOnlyNonWorkOrderProducts &&
            (hasTemporaryLensItems ||
              (hasFrameInItems && hasLensDataForMounting));

          // Validar que si se requiere trabajo de laboratorio, hay un cliente registrado
          if (actuallyRequiresWorkOrder && !customer_id) {
            return NextResponse.json(
              {
                error:
                  "Se requiere un cliente registrado para crear trabajos de laboratorio",
              },
              { status: 400 },
            );
          }

          // Only create work order if there are lens items
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
              newOrder.branch_id ?? undefined,
            ).catch((err) =>
              logger.error("Error creating sale notification", err),
            );

            return NextResponse.json({
              success: true,
              order: { ...newOrder, order_items: orderItems },
              billing: billingResult
                ? {
                    folio: billingResult.folio,
                    pdfUrl: billingResult.pdfUrl,
                    type: billingResult.type,
                  }
                : null,
              work_order: null,
              message: "Order created successfully (no work order needed)",
            });
          }

          // Cash-First Logic: Determine work order status based on payment
          // Get minimum deposit requirement
          const { data: minDepositData, error: minDepositError } =
            await supabaseServiceRole.rpc("get_min_deposit", {
              p_order_total: total_amount,
              p_branch_id: branchContext.branchId,
            });

          const minDeposit = minDepositError
            ? total_amount * 0.5
            : minDepositData || total_amount * 0.5; // Default 50% if error

          // Determine work order status and payment status based on Cash-First
          let workOrderStatus: string;
          let workOrderPaymentStatus: string;

          if (paymentAmount < minDeposit) {
            // Pago insuficiente: trabajo en espera (no visible en taller)
            workOrderStatus = "on_hold_payment";
            workOrderPaymentStatus = "pending";
            logger.info("Insufficient deposit", {
              paid: paymentAmount,
              required: minDeposit,
              total: total_amount,
            });
          } else if (balance === 0) {
            // Pago completo: trabajo listo para procesar
            workOrderStatus = "ordered";
            workOrderPaymentStatus = "paid";
          } else {
            // Pago parcial suficiente: trabajo listo pero con saldo pendiente
            workOrderStatus = "ordered";
            workOrderPaymentStatus = "partial";
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
            branch_id: branchContext.branchId,
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
          if (payment_method_type === "cash" && posSessionId) {
            const { error: cashError } = await supabase.rpc(
              "update_pos_session_cash",
              {
                session_id: posSessionId,
                cash_amount: cash_received || total_amount,
              },
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
            newOrder.branch_id ?? undefined,
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
              newWorkOrder.branch_id ?? undefined,
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
          const fullOrder = {
            ...newOrder,
            order_items: orderItems,
            order_payments: [
              {
                amount: paymentAmount,
                payment_method: dbPaymentMethod,
              },
            ],
            sii_invoice_number: siiInvoiceNumber,
            customer_name: customerName,
            billing_first_name: billingFirstName,
            billing_last_name: billingLastName,
          };

          return NextResponse.json({
            success: true,
            order: fullOrder,
            work_order: {
              ...newWorkOrder,
              sii_invoice_number: siiInvoiceNumber,
            },
            billing: billingResult
              ? {
                  folio: billingResult.folio,
                  pdfUrl: billingResult.pdfUrl,
                  type: billingResult.type,
                }
              : null,
          });
        } catch (error) {
          if (error instanceof RateLimitError) {
            logger.warn("Rate limit exceeded for POS sale", {
              error: error.message,
            });
            return NextResponse.json({ error: error.message }, { status: 429 });
          }
          logger.error("POS process sale error", { error });
          return NextResponse.json(
            {
              error: "Internal server error",
              details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
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

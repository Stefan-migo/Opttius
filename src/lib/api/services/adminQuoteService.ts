/**
 * Admin Quote Service
 * Server-side business logic for quote operations
 */
import { NextRequest, NextResponse } from "next/server";

import { addBranchFilter, getBranchContext } from "@/lib/api/branch-middleware";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import { createApiErrorResponse, createApiSuccessResponse } from "@/lib/api/response";
import { sendQuoteSent } from "@/lib/email/notifications";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

async function getAdminAuth(supabase: any) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new AuthenticationError("No autorizado");
  const { data: isAdmin } = (await supabase.rpc("is_admin", { user_id: user.id } as IsAdminParams)) as { data: IsAdminResult | null };
  if (!isAdmin) throw new AuthorizationError("Acceso denegado");
  return user;
}

export async function getQuote(request: NextRequest, id: string) {
  const supabase = await createClient();
  const user = await getAdminAuth(supabase);

  const adminUser = await supabase.from("admin_users").select("organization_id").eq("id", user.id).single() as any;
  const userOrganizationId = adminUser?.data?.organization_id ?? null;
  const branchContext = await getBranchContext(request, user.id);
  const supabaseServiceRole = createServiceRoleClient();

  // Expire quotes
  await supabaseServiceRole.rpc("check_and_expire_quotes");

  // Check exists
  const { data: quoteCheck, error: checkError } = await supabaseServiceRole
    .from("quotes").select("id, branch_id, organization_id, quote_number").eq("id", id).single() as any;
  if (checkError || !quoteCheck) {
    return NextResponse.json({ error: "Quote not found", details: checkError?.message || "Quote does not exist" }, { status: 404 });
  }

  // Access: allow if same org
  const quoteOrgId = quoteCheck.organization_id ?? null;
  if (quoteOrgId !== null && userOrganizationId !== null && quoteOrgId !== userOrganizationId) {
    return NextResponse.json({ error: "Access denied to this quote" }, { status: 403 });
  }

  // Fetch full quote
  const { data: quoteData, error: quoteError } = await supabaseServiceRole
    .from("quotes").select("*").eq("id", id).single() as any;
  if (quoteError || !quoteData) {
    return createApiErrorResponse(new Error(quoteError?.message || "Failed to fetch quote"));
  }

  // Fetch relations
  const relations: Record<string, any> = {};
  if (quoteData.customer_id) {
    const { data: customerData } = await supabaseServiceRole
      .from("customers").select("id, first_name, last_name, email, phone, rut").eq("id", quoteData.customer_id) as any;
    relations.customer = (customerData && customerData.length > 0) ? customerData[0] : null;
  } else {
    relations.customer = null;
  }
  if (quoteData.prescription_id) {
    const { data: prescription } = await supabaseServiceRole.from("prescriptions").select("*").eq("id", quoteData.prescription_id).single() as any;
    relations.prescription = prescription || null;
  }
  if (quoteData.frame_product_id) {
    const { data: frameProduct } = await supabaseServiceRole.from("products").select("id, name, price, frame_brand, frame_model").eq("id", quoteData.frame_product_id).single() as any;
    relations.frame_product = frameProduct || null;
  }
  if (quoteData.far_lens_family_id) {
    const { data: farLensFamily } = await supabaseServiceRole.from("lens_families").select("id, name").eq("id", quoteData.far_lens_family_id).single() as any;
    relations.far_lens_family = farLensFamily || null;
  }
  if (quoteData.near_lens_family_id) {
    const { data: nearLensFamily } = await supabaseServiceRole.from("lens_families").select("id, name").eq("id", quoteData.near_lens_family_id).single() as any;
    relations.near_lens_family = nearLensFamily || null;
  }
  if (quoteData.lens_family_id) {
    const { data: lensFamily } = await supabaseServiceRole.from("lens_families").select("id, name").eq("id", quoteData.lens_family_id).single() as any;
    relations.lens_family = lensFamily || null;
  }

  const quote = {
    ...quoteData,
    customer: relations.customer || null,
    prescription: relations.prescription || null,
    frame_product: relations.frame_product || null,
    far_lens_family: relations.far_lens_family || null,
    near_lens_family: relations.near_lens_family || null,
    lens_family: relations.lens_family || null,
  };

  return createApiSuccessResponse(quote);
}

export async function updateQuote(request: NextRequest, id: string) {
  const supabase = await createClient();
  const supabaseServiceRole = createServiceRoleClient();
  const user = await getAdminAuth(supabase);
  const branchContext = await getBranchContext(request, user.id);

  // Verify access
  const applyBranchFilter = (query: any) => addBranchFilter(query, branchContext.branchId, branchContext.isSuperAdmin, branchContext.organizationId);
  const { data: existingQuote, error: fetchError } = await applyBranchFilter(
    supabase.from("quotes").select("id, branch_id, customer_id") as any,
  ).eq("id", id).single() as any;

  if (fetchError || !existingQuote) {
    return NextResponse.json({ error: "Presupuesto no encontrado o sin acceso" }, { status: 404 });
  }

  const body = await request.json();

  // Validate prescription belongs to customer
  const prescriptionId = body.prescription_id || null;
  if (prescriptionId) {
    const { data: prescription } = await supabaseServiceRole.from("prescriptions").select("customer_id").eq("id", prescriptionId).single() as any;
    if (prescription && existingQuote.customer_id && prescription.customer_id !== existingQuote.customer_id) {
      return NextResponse.json({ error: "La receta no pertenece al cliente del presupuesto" }, { status: 400 });
    }
  }

  // Build update data
  const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
  const fields = [
    "frame_name", "frame_brand", "frame_model", "frame_color", "frame_size", "frame_sku",
    "frame_price", "lens_type", "lens_material", "lens_index", "lens_treatments", "lens_tint_color",
    "lens_tint_percentage", "frame_cost", "lens_cost", "treatments_cost", "labor_cost",
    "subtotal", "tax_amount", "discount_amount", "discount_percentage", "total_amount",
    "status", "notes", "customer_notes", "expiration_date",
    "prescription_id", "frame_product_id", "customer_own_frame",
    "lens_family_id",
    "presbyopia_solution", "far_lens_family_id", "near_lens_family_id", "far_lens_cost", "near_lens_cost",
    "near_frame_product_id", "near_frame_name", "near_frame_brand", "near_frame_model",
    "near_frame_color", "near_frame_size", "near_frame_sku", "near_frame_price",
    "near_frame_price_includes_tax", "near_frame_cost", "customer_own_near_frame",
    "contact_lens_family_id",
    "contact_lens_rx_sphere_od", "contact_lens_rx_cylinder_od", "contact_lens_rx_axis_od",
    "contact_lens_rx_add_od", "contact_lens_rx_base_curve_od", "contact_lens_rx_diameter_od",
    "contact_lens_rx_sphere_os", "contact_lens_rx_cylinder_os", "contact_lens_rx_axis_os",
    "contact_lens_rx_add_os", "contact_lens_rx_base_curve_os", "contact_lens_rx_diameter_os",
    "contact_lens_quantity", "contact_lens_cost", "contact_lens_price",
  ];
  for (const field of fields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }

  const { data: updatedQuote, error } = await supabaseServiceRole
    .from("quotes").update(updateData).eq("id", id)
    .select(`*, customer:customers!quotes_customer_id_fkey(id, first_name, last_name, email, phone), prescription:prescriptions!quotes_prescription_id_fkey(*)`)
    .single() as any;

  if (error) {
    logger.error("Error updating quote", error);
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }

  // Send email if status changed to 'sent'
  if (body.status === "sent" && updatedQuote.status === "sent" && (updatedQuote.customer?.email || updatedQuote.guest_email)) {
    (async () => {
      try {
        const { data: branch } = await supabaseServiceRole.from("branches").select("name").eq("id", updatedQuote.branch_id).single() as any;
        await sendQuoteSent({
          customer_name: `${updatedQuote.customer?.first_name || ""} ${updatedQuote.customer?.last_name || ""}`.trim() || "Cliente",
          customer_email: updatedQuote.customer?.email || updatedQuote.guest_email,
          quote_number: updatedQuote.quote_number,
          total_amount: updatedQuote.total_amount,
          expiration_date: updatedQuote.expiration_date,
          branch_name: branch?.name || "",
          items: [],
        }, branchContext.organizationId ?? undefined);
      } catch (err) {
        logger.error("Error sending quote email on update", err);
      }
    })();
  }

  return createApiSuccessResponse(updatedQuote);
}

export async function deleteQuote(request: NextRequest, id: string) {
  const supabase = await createClient();
  const supabaseServiceRole = createServiceRoleClient();
  await getAdminAuth(supabase);

  const { data: quote, error: fetchError } = await supabaseServiceRole
    .from("quotes").select("id, status, converted_to_work_order_id").eq("id", id).single() as any;
  if (fetchError || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  if (quote.status === "converted_to_work" || quote.converted_to_work_order_id) {
    return NextResponse.json({ error: "No se puede eliminar un presupuesto que ha sido convertido a trabajo" }, { status: 400 });
  }

  const { error: deleteError } = await supabaseServiceRole.from("quotes").delete().eq("id", id) as any;
  if (deleteError) {
    logger.error("Error deleting quote", deleteError);
    return NextResponse.json({ error: "Failed to delete quote" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Presupuesto eliminado exitosamente" });
}

export async function listQuotes(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info("Quotes API GET called", { requestId });
  const supabase = await createClient();
  const user = await getAdminAuth(supabase);
  const supabaseServiceRole = createServiceRoleClient();

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") || "all";
  const customerId = searchParams.get("customer_id");
  const customerRut = searchParams.get("customer_rut")?.trim() || null;
  const customerEmail = searchParams.get("customer_email")?.trim() || null;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const fieldOperationId = searchParams.get("field_operation_id") || null;

  const branchContext = await getBranchContext(request, user.id);
  let effectiveBranchId = branchContext.branchId;
  if (fieldOperationId) {
    const { data: fieldOp } = await supabaseServiceRole.from("field_operations").select("id, branch_id").eq("id", fieldOperationId).single() as any;
    if (fieldOp) effectiveBranchId = fieldOp.branch_id;
  }

  const { data: adminUser } = await supabase.from("admin_users").select("organization_id").eq("id", user.id).single() as any;
  const userOrganizationId = adminUser?.organization_id;
  const forCustomerQuotesOnly = Boolean(customerId || customerRut || customerEmail);

  // Build branch filter
  const applyBranchFilter = (query: any) => {
    if (userOrganizationId && !branchContext.isSuperAdmin) {
      if (forCustomerQuotesOnly) {
        query = query.or(`organization_id.eq.${userOrganizationId},organization_id.is.null`);
      } else {
        query = query.eq("organization_id", userOrganizationId);
      }
      if (!forCustomerQuotesOnly && effectiveBranchId) query = query.eq("branch_id", effectiveBranchId);
      if (fieldOperationId) query = query.eq("field_operation_id", fieldOperationId);
    } else if (branchContext.isSuperAdmin) {
      if (!forCustomerQuotesOnly && effectiveBranchId) query = query.eq("branch_id", effectiveBranchId);
      if (fieldOperationId) query = query.eq("field_operation_id", fieldOperationId);
      else if (branchContext.organizationId) {
        if (forCustomerQuotesOnly) query = query.or(`organization_id.eq.${branchContext.organizationId},organization_id.is.null`);
        else query = query.eq("organization_id", branchContext.organizationId);
      }
    } else {
      query = addBranchFilter(query, forCustomerQuotesOnly ? null : effectiveBranchId, branchContext.isSuperAdmin, branchContext.organizationId);
      if (fieldOperationId) query = query.eq("field_operation_id", fieldOperationId);
    }
    return query;
  };

  // Expire quotes
  await supabaseServiceRole.rpc("check_and_expire_quotes");

  let query = applyBranchFilter(supabase.from("quotes").select("*", { count: "exact" })).order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);

  // Customer filter
  if (customerId || customerRut || customerEmail) {
    if (userOrganizationId && (customerRut || customerEmail)) {
      const normalizedRut = customerRut ? customerRut.toLowerCase().replace(/[^0-9k]/g, "") : "";
      const normalizedEmail = customerEmail?.toLowerCase() || "";
      const { data: customersInOrg } = await supabaseServiceRole.from("customers").select("id, rut, email").eq("organization_id", userOrganizationId).limit(1000) as any;
      const matchingIds = (customersInOrg || []).filter((c: any) => {
        const rutMatches = normalizedRut && c.rut && c.rut.toLowerCase().replace(/[^0-9k]/g, "") === normalizedRut;
        const emailMatches = normalizedEmail && c.email && c.email.toLowerCase() === normalizedEmail;
        return rutMatches || emailMatches;
      }).map((c: any) => c.id);
      if (matchingIds.length > 0) query = query.in("customer_id", matchingIds);
      else if (customerId) query = query.eq("customer_id", customerId);
      else query = query.eq("customer_id", "00000000-0000-0000-0000-000000000000");
    } else if (customerId) {
      query = query.eq("customer_id", customerId);
    }
  }

  const from = (page - 1) * limit;
  const { data: quotes, error, count } = await query.range(from, from + limit - 1) as any;
  if (error) throw new Error(`Failed to fetch quotes: ${error.message}`);

  // Fetch related data
  let quotesWithRelations = quotes || [];
  if (quotesWithRelations.length > 0) {
    const customerIds = [...new Set(quotesWithRelations.map((q: any) => q.customer_id).filter(Boolean))];
    const prescriptionIds = [...new Set(quotesWithRelations.map((q: any) => q.prescription_id).filter(Boolean))];
    const productIds = [...new Set(quotesWithRelations.map((q: any) => q.frame_product_id).filter(Boolean))];

    const [{ data: customers }, { data: prescriptions }, { data: products }] = await Promise.all([
      customerIds.length > 0 ? supabase.from("customers").select("id, first_name, last_name, email, phone, rut").in("id", customerIds) : Promise.resolve({ data: [] }),
      prescriptionIds.length > 0 ? supabase.from("prescriptions").select("*").in("id", prescriptionIds) : Promise.resolve({ data: [] }),
      productIds.length > 0 ? supabase.from("products").select("id, name, price, frame_brand, frame_model").in("id", productIds) : Promise.resolve({ data: [] }),
    ]) as any;

    quotesWithRelations = quotesWithRelations.map((quote: any) => ({
      ...quote,
      customer: customers?.find((c: any) => c.id === quote.customer_id) || null,
      prescription: prescriptions?.find((p: any) => p.id === quote.prescription_id) || null,
      frame_product: products?.find((p: any) => p.id === quote.frame_product_id) || null,
      original_status: quote.original_status || (quote.status === "converted_to_work" ? "accepted" : quote.status),
    }));
  }

  return {
    quotes: quotesWithRelations,
    pagination: { page, limit, total: count || 0 },
    requestId,
  };
}

export async function createQuote(request: NextRequest) {
  const supabase = await createClient();
  const supabaseServiceRole = createServiceRoleClient();
  const user = await getAdminAuth(supabase);

  const { parseAndValidateBody, validationErrorResponse } = await import("@/lib/api/validation/zod-helpers");
  const { createQuoteSchema } = await import("@/lib/api/validation/zod-schemas");
  const { normalizeRUT } = await import("@/lib/utils/rut");
  const { NotificationService } = await import("@/lib/notifications/notification-service");

  let validatedBody: any;
  try {
    validatedBody = await parseAndValidateBody(request, createQuoteSchema);
  } catch (error: any) {
    const { ValidationError } = await import("@/lib/api/errors");
    if (error instanceof ValidationError) return (await import("@/lib/api/validation/zod-helpers")).validationErrorResponse(error);
    throw error;
  }

  // Validate prescription belongs to customer
  if (validatedBody.prescription_id) {
    const { data: prescription } = await supabaseServiceRole.from("prescriptions").select("customer_id").eq("id", validatedBody.prescription_id).single() as any;
    if (prescription && prescription.customer_id !== validatedBody.customer_id) {
      return NextResponse.json({ error: "La receta no pertenece al cliente seleccionado" }, { status: 400 });
    }
  }

  // Generate quote number
  const { data: quoteNumber, error: quoteNumberError } = await supabaseServiceRole.rpc("generate_quote_number") as any;
  if (quoteNumberError || !quoteNumber) return NextResponse.json({ error: "Failed to generate quote number" }, { status: 500 });

  // Get default expiration
  const { data: settings } = await supabaseServiceRole.from("quote_settings").select("default_expiration_days").limit(1).single() as any;
  const defaultExpirationDays = settings?.default_expiration_days || 30;
  const branchContext = await getBranchContext(request, user.id);

  // Determine branch
  let quoteBranchId = validatedBody.branch_id || branchContext.branchId;
  if (!quoteBranchId && validatedBody.customer_id) {
    const { data: customer } = await supabaseServiceRole.from("customers").select("branch_id").eq("id", validatedBody.customer_id).single() as any;
    quoteBranchId = customer?.branch_id || null;
  }

  if (!branchContext.isSuperAdmin && quoteBranchId) {
    const hasAccess = branchContext.accessibleBranches.some((b: any) => b.id === quoteBranchId);
    if (!hasAccess) return NextResponse.json({ error: "No tiene acceso a esta sucursal" }, { status: 403 });
  }
  if (!branchContext.isSuperAdmin && !quoteBranchId) return NextResponse.json({ error: "Debe especificar una sucursal para el presupuesto" }, { status: 400 });

  // Validate customer belongs to branch
  if (validatedBody.customer_id && quoteBranchId) {
    const { data: customer } = await supabaseServiceRole.from("customers").select("branch_id").eq("id", validatedBody.customer_id).single() as any;
    if (!customer) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    if (customer.branch_id !== quoteBranchId) return NextResponse.json({ error: "El cliente no pertenece a esta sucursal. Seleccione un cliente de la sucursal actual." }, { status: 400 });
  }

  const expirationDate = validatedBody.expiration_date
    ? new Date(validatedBody.expiration_date)
    : new Date(Date.now() + defaultExpirationDays * 24 * 60 * 60 * 1000);

  // Organization ID
  let quoteOrganizationId: string | null = null;
  if (quoteBranchId) {
    const { data: branch } = await supabaseServiceRole.from("branches").select("organization_id").eq("id", quoteBranchId).single() as any;
    quoteOrganizationId = branch?.organization_id ?? null;
  }
  if (!quoteOrganizationId) {
    const { data: adminUser } = await supabaseServiceRole.from("admin_users").select("organization_id").eq("id", user.id).single() as any;
    quoteOrganizationId = adminUser?.organization_id ?? null;
  }

  // Field operation inheritance
  let quoteFieldOperationId = validatedBody.field_operation_id || null;
  if (!quoteFieldOperationId && validatedBody.customer_id) {
    const { data: cust } = await supabaseServiceRole.from("customers").select("field_operation_id").eq("id", validatedBody.customer_id).single() as any;
    quoteFieldOperationId = cust?.field_operation_id ?? null;
  }

  // Insert quote
  const { data: newQuote, error: quoteError } = await supabaseServiceRole.from("quotes").insert({
    quote_number: quoteNumber,
    customer_id: validatedBody.customer_id,
    branch_id: quoteBranchId,
    organization_id: quoteOrganizationId,
    field_operation_id: quoteFieldOperationId,
    prescription_id: validatedBody.prescription_id || null,
    frame_product_id: validatedBody.frame_product_id || null,
    frame_name: validatedBody.frame_name || null,
    frame_brand: validatedBody.frame_brand || null,
    frame_model: validatedBody.frame_model || null,
    frame_color: validatedBody.frame_color || null,
    frame_size: validatedBody.frame_size || null,
    frame_sku: validatedBody.frame_sku || null,
    frame_price: typeof validatedBody.frame_price === "number" ? validatedBody.frame_price : validatedBody.frame_price || 0,
    customer_own_frame: validatedBody.customer_own_frame ?? false,
    lens_family_id: validatedBody.lens_family_id || null,
    lens_type: validatedBody.lens_type || null,
    lens_material: validatedBody.lens_material || null,
    lens_index: validatedBody.lens_index || null,
    lens_treatments: validatedBody.lens_treatments || [],
    lens_tint_color: validatedBody.lens_tint_color || null,
    lens_tint_percentage: validatedBody.lens_tint_percentage || null,
    presbyopia_solution: validatedBody.presbyopia_solution || "none",
    far_lens_family_id: validatedBody.far_lens_family_id || null,
    near_lens_family_id: validatedBody.near_lens_family_id || null,
    far_lens_cost: typeof validatedBody.far_lens_cost === "number" ? validatedBody.far_lens_cost : validatedBody.far_lens_cost ?? null,
    near_lens_cost: typeof validatedBody.near_lens_cost === "number" ? validatedBody.near_lens_cost : validatedBody.near_lens_cost ?? null,
    near_frame_product_id: validatedBody.near_frame_product_id || null,
    near_frame_name: validatedBody.near_frame_name || null,
    near_frame_brand: validatedBody.near_frame_brand || null,
    near_frame_model: validatedBody.near_frame_model || null,
    near_frame_color: validatedBody.near_frame_color || null,
    near_frame_size: validatedBody.near_frame_size || null,
    near_frame_sku: validatedBody.near_frame_sku || null,
    near_frame_price: typeof validatedBody.near_frame_price === "number" ? validatedBody.near_frame_price : validatedBody.near_frame_price ?? 0,
    near_frame_cost: typeof validatedBody.near_frame_cost === "number" ? validatedBody.near_frame_cost : validatedBody.near_frame_cost ?? 0,
    near_frame_price_includes_tax: validatedBody.near_frame_price_includes_tax ?? false,
    customer_own_near_frame: validatedBody.customer_own_near_frame ?? false,
    contact_lens_family_id: validatedBody.contact_lens_family_id || null,
    contact_lens_rx_sphere_od: validatedBody.contact_lens_rx_sphere_od || null,
    contact_lens_rx_cylinder_od: validatedBody.contact_lens_rx_cylinder_od || null,
    contact_lens_rx_axis_od: validatedBody.contact_lens_rx_axis_od || null,
    contact_lens_rx_add_od: validatedBody.contact_lens_rx_add_od || null,
    contact_lens_rx_base_curve_od: validatedBody.contact_lens_rx_base_curve_od || null,
    contact_lens_rx_diameter_od: validatedBody.contact_lens_rx_diameter_od || null,
    contact_lens_rx_sphere_os: validatedBody.contact_lens_rx_sphere_os || null,
    contact_lens_rx_cylinder_os: validatedBody.contact_lens_rx_cylinder_os || null,
    contact_lens_rx_axis_os: validatedBody.contact_lens_rx_axis_os || null,
    contact_lens_rx_add_os: validatedBody.contact_lens_rx_add_os || null,
    contact_lens_rx_base_curve_os: validatedBody.contact_lens_rx_base_curve_os || null,
    contact_lens_rx_diameter_os: validatedBody.contact_lens_rx_diameter_os || null,
    contact_lens_quantity: validatedBody.contact_lens_quantity || 1,
    contact_lens_cost: validatedBody.contact_lens_cost || 0,
    contact_lens_price: validatedBody.contact_lens_price || 0,
    frame_cost: typeof validatedBody.frame_cost === "number" ? validatedBody.frame_cost : validatedBody.frame_cost || 0,
    lens_cost: typeof validatedBody.lens_cost === "number" ? validatedBody.lens_cost : validatedBody.lens_cost || 0,
    treatments_cost: typeof validatedBody.treatments_cost === "number" ? validatedBody.treatments_cost : validatedBody.treatments_cost || 0,
    labor_cost: typeof validatedBody.labor_cost === "number" ? validatedBody.labor_cost : validatedBody.labor_cost || 0,
    subtotal: typeof validatedBody.subtotal === "number" ? validatedBody.subtotal : validatedBody.subtotal || 0,
    tax_amount: typeof validatedBody.tax_amount === "number" ? validatedBody.tax_amount : validatedBody.tax_amount || 0,
    discount_amount: typeof validatedBody.discount_amount === "number" ? validatedBody.discount_amount : validatedBody.discount_amount || 0,
    discount_percentage: validatedBody.discount_percentage || 0,
    total_amount: typeof validatedBody.total_amount === "number" ? validatedBody.total_amount : parseFloat(String(validatedBody.total_amount)),
    currency: validatedBody.currency || "CLP",
    status: validatedBody.status || "draft",
    notes: validatedBody.notes || null,
    customer_notes: validatedBody.customer_notes || null,
    terms_and_conditions: validatedBody.terms_and_conditions || null,
    expiration_date: expirationDate.toISOString().split("T")[0],
    created_by: user.id,
  }).select(`*, customer:customers!quotes_customer_id_fkey(id, first_name, last_name, email, phone), prescription:prescriptions!quotes_prescription_id_fkey(*)`).single() as any;

  if (quoteError) return NextResponse.json({ error: "Failed to create quote", details: quoteError.message }, { status: 500 });

  // Non-blocking notification + email
  if (newQuote) {
    const customerName = newQuote.customer
      ? `${newQuote.customer.first_name || ""} ${newQuote.customer.last_name || ""}`.trim() || newQuote.customer.email || "Cliente"
      : "Cliente";

    NotificationService.notifyNewQuote(newQuote.id, newQuote.quote_number, customerName, newQuote.total_amount, newQuote.branch_id ?? undefined)
      .catch((err: Error) => logger.error("Error creating notification", err));

    if (newQuote.status === "sent" && (newQuote.customer?.email || newQuote.guest_email)) {
      (async () => {
        try {
          const { data: branch } = await supabaseServiceRole.from("branches").select("name").eq("id", newQuote.branch_id).single() as any;
          await sendQuoteSent({
            customer_name: customerName,
            customer_email: newQuote.customer?.email || newQuote.guest_email,
            quote_number: newQuote.quote_number,
            total_amount: newQuote.total_amount,
            expiration_date: newQuote.expiration_date,
            branch_name: branch?.name || "",
            items: [],
          }, branchContext.organizationId || undefined);
        } catch (err) {
          logger.error("Error sending quote email", err);
        }
      })();
    }
  }

  return createApiSuccessResponse(newQuote, { statusCode: 201 });
}

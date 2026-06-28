import { NextRequest, NextResponse } from "next/server";

import { addBranchFilter, getBranchContext } from "@/lib/api/branch-middleware";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { sendQuoteSent } from "@/lib/email/notifications";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient , createServiceRoleClient } from "@/utils/supabase/server";


export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return createApiErrorResponse(new AuthenticationError("No autorizado"));
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return createApiErrorResponse(new AuthorizationError("Acceso denegado"));
    }

    const { id } = params;

    // Get user's organization_id for multi-tenancy
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    const userOrganizationId =
      (adminUser as { organization_id?: string } | null)?.organization_id ??
      null;

    const branchContext = await getBranchContext(request, user.id);

    // Build branch filter function (used later for PUT)
    const applyBranchFilter = (query: ReturnType<typeof supabase.from>) => {
      return addBranchFilter(
        query,
        branchContext.branchId,
        branchContext.isSuperAdmin,
        branchContext.organizationId,
      );
    };

    const supabaseServiceRole = createServiceRoleClient();

    // Check and expire quotes before fetching (including this one)
    await supabaseServiceRole.rpc("check_and_expire_quotes");

    // First, try to fetch the quote directly with service role to check if it exists
    const { data: quoteCheck, error: checkError } = await supabaseServiceRole
      .from("quotes")
      .select("id, branch_id, organization_id, quote_number")
      .eq("id", id)
      .single();

    if (checkError || !quoteCheck) {
      logger.error("Quote not found in database:", {
        error: checkError,
        quoteId: id,
        errorCode: checkError?.code,
        errorMessage: checkError?.message,
        branchContext: {
          branchId: branchContext.branchId,
          isGlobalView: branchContext.isGlobalView,
          isSuperAdmin: branchContext.isSuperAdmin,
        },
      });
      return NextResponse.json(
        {
          error: "Quote not found",
          details: checkError?.message || "Quote does not exist in database",
        },
        { status: 404 },
      );
    }

    logger.info("Quote exists, checking access:", {
      quoteId: id,
      quoteNumber: quoteCheck.quote_number,
      quoteBranchId: quoteCheck.branch_id,
      quoteOrganizationId: quoteCheck.organization_id,
      userOrganizationId,
      userBranchId: branchContext.branchId,
      isGlobalView: branchContext.isGlobalView,
      isSuperAdmin: branchContext.isSuperAdmin,
    });

    // Access: allow if quote belongs to the same organization (so POS can load any org quote from any branch).
    // Deny only when quote belongs to another organization.
    const quoteOrgId =
      (quoteCheck as { organization_id?: string | null }).organization_id ??
      null;
    if (
      quoteOrgId !== null &&
      userOrganizationId !== null &&
      quoteOrgId !== userOrganizationId
    ) {
      logger.warn("Organization access denied:", {
        quoteId: id,
        quoteOrganizationId: quoteOrgId,
        userOrganizationId,
      });
      return NextResponse.json(
        { error: "Access denied to this quote" },
        { status: 403 },
      );
    }
    // Same org, legacy (null org), or super admin: allow access.

    // Now fetch the full quote with relations
    // Since we already verified access, we can use service role to bypass RLS
    // Fetch quote first without relations to avoid foreign key issues
    const { data: quoteData, error: quoteError } = await supabaseServiceRole
      .from("quotes")
      .select("*")
      .eq("id", id)
      .single();

    // Log presbyopia fields for debugging
    logger.info("Quote data fetched - presbyopia fields:", {
      quoteId: id,
      presbyopia_solution: quoteData?.presbyopia_solution,
      far_lens_family_id: quoteData?.far_lens_family_id,
      near_lens_family_id: quoteData?.near_lens_family_id,
      far_lens_cost: quoteData?.far_lens_cost,
      near_lens_cost: quoteData?.near_lens_cost,
      near_frame_name: quoteData?.near_frame_name,
      near_frame_cost: quoteData?.near_frame_cost,
      hasPresbyopiaData: !!(
        quoteData?.presbyopia_solution &&
        quoteData.presbyopia_solution !== "none"
      ),
    });

    if (quoteError || !quoteData) {
      logger.error("Error fetching quote data:", {
        error: quoteError,
        errorCode: quoteError?.code,
        errorMessage: quoteError?.message,
        errorDetails: quoteError?.details,
        quoteId: id,
      });
      return createApiErrorResponse(
        new Error(quoteError?.message || "Failed to fetch quote"),
      );
    }

    // Now fetch relations separately to avoid foreign key constraint issues
    const relations: unknown = {};

    // Fetch customer - always try to fetch if customer_id exists
    if (quoteData.customer_id) {
      // First, check if customer exists at all (even if deleted/archived)
      const { data: customerCheck, error: checkError } =
        await supabaseServiceRole
          .from("customers")
          .select("id")
          .eq("id", quoteData.customer_id)
          .maybeSingle();

      logger.info("Customer existence check:", {
        quoteId: id,
        customerId: quoteData.customer_id,
        exists: !!customerCheck,
        checkError: checkError?.message,
      });

      if (checkError) {
        logger.error("Error checking customer existence:", {
          quoteId: id,
          customerId: quoteData.customer_id,
          error: checkError,
          errorCode: checkError.code,
          errorMessage: checkError.message,
        });
      }

      // Now fetch full customer data
      // Use a simple query without maybeSingle to see what happens
      // Note: business_name may not exist in customers table, so we'll select it conditionally
      const customerQuery = supabaseServiceRole
        .from("customers")
        .select("id, first_name, last_name, email, phone, rut")
        .eq("id", quoteData.customer_id);

      const { data: customerData, error: customerError } = await customerQuery;

      logger.info("Customer query result:", {
        quoteId: id,
        customerId: quoteData.customer_id,
        hasData: !!customerData,
        dataLength: customerData?.length || 0,
        error: customerError,
        errorCode: customerError?.code,
        errorMessage: customerError?.message,
      });

      if (customerError) {
        logger.error("Error fetching customer for quote:", {
          quoteId: id,
          customerId: quoteData.customer_id,
          error: customerError,
          errorCode: customerError.code,
          errorMessage: customerError.message,
          errorDetails: customerError.details,
          customerExists: !!customerCheck,
        });
        relations.customer = null;
      } else if (customerData && customerData.length > 0) {
        relations.customer = customerData[0];
        logger.info("Customer loaded successfully:", {
          quoteId: id,
          customerId: customerData[0].id,
          customerName:
            `${customerData[0].first_name || ""} ${customerData[0].last_name || ""}`.trim() ||
            "Sin nombre",
        });
      } else {
        logger.warn(
          "Customer not found for quote (customer_id exists but customer not found):",
          {
            quoteId: id,
            customerId: quoteData.customer_id,
            customerCheckResult: customerCheck,
            queryResult: customerData,
          },
        );
        relations.customer = null;
      }
    } else {
      logger.warn("Quote has no customer_id:", { quoteId: id });
      relations.customer = null;
    }

    // Fetch prescription
    if (quoteData.prescription_id) {
      const { data: prescription } = await supabaseServiceRole
        .from("prescriptions")
        .select("*")
        .eq("id", quoteData.prescription_id)
        .single();
      relations.prescription = prescription || null;
    }

    // Fetch frame product
    if (quoteData.frame_product_id) {
      const { data: frameProduct } = await supabaseServiceRole
        .from("products")
        .select("id, name, price, frame_brand, frame_model")
        .eq("id", quoteData.frame_product_id)
        .single();
      relations.frame_product = frameProduct || null;
    }

    // Fetch lens families (for far and near lenses)
    if (quoteData.far_lens_family_id) {
      const { data: farLensFamily } = await supabaseServiceRole
        .from("lens_families")
        .select("id, name")
        .eq("id", quoteData.far_lens_family_id)
        .single();
      relations.far_lens_family = farLensFamily || null;
    }

    if (quoteData.near_lens_family_id) {
      const { data: nearLensFamily } = await supabaseServiceRole
        .from("lens_families")
        .select("id, name")
        .eq("id", quoteData.near_lens_family_id)
        .single();
      relations.near_lens_family = nearLensFamily || null;
    }

    // Fetch lens family for single lens case
    if (quoteData.lens_family_id) {
      const { data: lensFamily } = await supabaseServiceRole
        .from("lens_families")
        .select("id, name")
        .eq("id", quoteData.lens_family_id)
        .single();
      relations.lens_family = lensFamily || null;
    }

    // Combine quote data with relations
    // Ensure customer is always present (even if null) to avoid undefined errors
    const quote = {
      ...quoteData,
      customer: relations.customer || null,
      prescription: relations.prescription || null,
      frame_product: relations.frame_product || null,
      far_lens_family: relations.far_lens_family || null,
      near_lens_family: relations.near_lens_family || null,
      lens_family: relations.lens_family || null,
    };

    logger.info("Quote fetched successfully:", {
      quoteId: id,
      hasCustomer: !!quote.customer,
      customerId: quote.customer_id,
      customerName: quote.customer
        ? `${quote.customer.first_name} ${quote.customer.last_name}`
        : "No customer",
      presbyopia_solution: quote.presbyopia_solution,
      far_lens_family_id: quote.far_lens_family_id,
      near_lens_family_id: quote.near_lens_family_id,
      far_lens_cost: quote.far_lens_cost,
      near_lens_cost: quote.near_lens_cost,
      near_frame_name: quote.near_frame_name,
      near_frame_cost: quote.near_frame_cost,
      near_frame_price: quote.near_frame_price,
      frame_cost: quote.frame_cost,
      frame_price: quote.frame_price,
      // Log all near_frame fields
      near_frame_fields: {
        near_frame_product_id: quote.near_frame_product_id,
        near_frame_name: quote.near_frame_name,
        near_frame_brand: quote.near_frame_brand,
        near_frame_model: quote.near_frame_model,
        near_frame_color: quote.near_frame_color,
        near_frame_size: quote.near_frame_size,
        near_frame_sku: quote.near_frame_sku,
        near_frame_price: quote.near_frame_price,
        near_frame_price_includes_tax: quote.near_frame_price_includes_tax,
        near_frame_cost: quote.near_frame_cost,
        customer_own_near_frame: quote.customer_own_near_frame,
      },
    });

    return createApiSuccessResponse(quote);
  } catch (error) {
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return createApiErrorResponse(new AuthenticationError("No autorizado"));
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return createApiErrorResponse(new AuthorizationError("Acceso denegado"));
    }

    const { id } = params;

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    // Build branch filter function
    const applyBranchFilter = (query: ReturnType<typeof supabase.from>) => {
      return addBranchFilter(
        query,
        branchContext.branchId,
        branchContext.isSuperAdmin,
        branchContext.organizationId,
      );
    };

    // First, verify the quote exists and user has access
    const { data: existingQuote, error: fetchError } = await applyBranchFilter(
      supabase.from("quotes").select("id, branch_id, customer_id") as unknown,
    )
      .eq("id", id)
      .single();

    if (fetchError || !existingQuote) {
      return NextResponse.json(
        { error: "Presupuesto no encontrado o sin acceso" },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Validate prescription belongs to quote's customer when prescription_id is updated
    const prescriptionIdToValidate =
      body.prescription_id !== undefined && body.prescription_id
        ? body.prescription_id
        : null;
    if (prescriptionIdToValidate) {
      const { data: prescription } = await supabaseServiceRole
        .from("prescriptions")
        .select("customer_id")
        .eq("id", prescriptionIdToValidate)
        .single();
      const quoteCustomerId = (existingQuote as { customer_id?: string })
        .customer_id;
      if (
        prescription &&
        quoteCustomerId &&
        prescription.customer_id !== quoteCustomerId
      ) {
        return NextResponse.json(
          {
            error: "La receta no pertenece al cliente del presupuesto",
          },
          { status: 400 },
        );
      }
    }

    const updateData: {
      updated_at: string;
      frame_name?: string;
      frame_brand?: string;
      frame_model?: string;
      frame_color?: string;
      frame_size?: string;
      frame_sku?: string;
      frame_price?: number;
      lens_type?: string;
      lens_material?: string;
      lens_index?: string;
      lens_treatments?: string[];
      lens_tint_color?: string;
      lens_tint_percentage?: number;
      [key: string]: unknown;
    } = {
      updated_at: new Date().toISOString(),
    };

    // Update fields if provided
    if (body.frame_name !== undefined) updateData.frame_name = body.frame_name;
    if (body.frame_brand !== undefined)
      updateData.frame_brand = body.frame_brand;
    if (body.frame_model !== undefined)
      updateData.frame_model = body.frame_model;
    if (body.frame_color !== undefined)
      updateData.frame_color = body.frame_color;
    if (body.frame_size !== undefined) updateData.frame_size = body.frame_size;
    if (body.frame_sku !== undefined) updateData.frame_sku = body.frame_sku;
    if (body.frame_price !== undefined)
      updateData.frame_price = body.frame_price;
    if (body.lens_type !== undefined) updateData.lens_type = body.lens_type;
    if (body.lens_material !== undefined)
      updateData.lens_material = body.lens_material;
    if (body.lens_index !== undefined) updateData.lens_index = body.lens_index;
    if (body.lens_treatments !== undefined)
      updateData.lens_treatments = body.lens_treatments;
    if (body.lens_tint_color !== undefined)
      updateData.lens_tint_color = body.lens_tint_color;
    if (body.lens_tint_percentage !== undefined)
      updateData.lens_tint_percentage = body.lens_tint_percentage;
    if (body.frame_cost !== undefined) updateData.frame_cost = body.frame_cost;
    if (body.lens_cost !== undefined) updateData.lens_cost = body.lens_cost;
    if (body.treatments_cost !== undefined)
      updateData.treatments_cost = body.treatments_cost;
    if (body.labor_cost !== undefined) updateData.labor_cost = body.labor_cost;
    if (body.subtotal !== undefined) updateData.subtotal = body.subtotal;
    if (body.tax_amount !== undefined) updateData.tax_amount = body.tax_amount;
    if (body.discount_amount !== undefined)
      updateData.discount_amount = body.discount_amount;
    if (body.discount_percentage !== undefined)
      updateData.discount_percentage = body.discount_percentage;
    if (body.total_amount !== undefined)
      updateData.total_amount = body.total_amount;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.customer_notes !== undefined)
      updateData.customer_notes = body.customer_notes;
    if (body.expiration_date !== undefined)
      updateData.expiration_date = body.expiration_date;
    // Prescription and frame product
    if (body.prescription_id !== undefined)
      updateData.prescription_id = body.prescription_id;
    if (body.frame_product_id !== undefined)
      updateData.frame_product_id = body.frame_product_id;
    if (body.customer_own_frame !== undefined)
      updateData.customer_own_frame = body.customer_own_frame;
    // Lens family
    if (body.lens_family_id !== undefined)
      updateData.lens_family_id = body.lens_family_id;
    // Presbyopia solution fields
    if (body.presbyopia_solution !== undefined)
      updateData.presbyopia_solution = body.presbyopia_solution;
    if (body.far_lens_family_id !== undefined)
      updateData.far_lens_family_id = body.far_lens_family_id;
    if (body.near_lens_family_id !== undefined)
      updateData.near_lens_family_id = body.near_lens_family_id;
    if (body.far_lens_cost !== undefined)
      updateData.far_lens_cost = body.far_lens_cost;
    if (body.near_lens_cost !== undefined)
      updateData.near_lens_cost = body.near_lens_cost;
    // Near frame fields
    if (body.near_frame_product_id !== undefined)
      updateData.near_frame_product_id = body.near_frame_product_id;
    if (body.near_frame_name !== undefined)
      updateData.near_frame_name = body.near_frame_name;
    if (body.near_frame_brand !== undefined)
      updateData.near_frame_brand = body.near_frame_brand;
    if (body.near_frame_model !== undefined)
      updateData.near_frame_model = body.near_frame_model;
    if (body.near_frame_color !== undefined)
      updateData.near_frame_color = body.near_frame_color;
    if (body.near_frame_size !== undefined)
      updateData.near_frame_size = body.near_frame_size;
    if (body.near_frame_sku !== undefined)
      updateData.near_frame_sku = body.near_frame_sku;
    if (body.near_frame_price !== undefined)
      updateData.near_frame_price = body.near_frame_price;
    if (body.near_frame_price_includes_tax !== undefined)
      updateData.near_frame_price_includes_tax =
        body.near_frame_price_includes_tax;
    if (body.near_frame_cost !== undefined)
      updateData.near_frame_cost = body.near_frame_cost;
    if (body.customer_own_near_frame !== undefined)
      updateData.customer_own_near_frame = body.customer_own_near_frame;
    // Contact lens fields
    if (body.contact_lens_family_id !== undefined)
      updateData.contact_lens_family_id = body.contact_lens_family_id;
    if (body.contact_lens_rx_sphere_od !== undefined)
      updateData.contact_lens_rx_sphere_od = body.contact_lens_rx_sphere_od;
    if (body.contact_lens_rx_cylinder_od !== undefined)
      updateData.contact_lens_rx_cylinder_od = body.contact_lens_rx_cylinder_od;
    if (body.contact_lens_rx_axis_od !== undefined)
      updateData.contact_lens_rx_axis_od = body.contact_lens_rx_axis_od;
    if (body.contact_lens_rx_add_od !== undefined)
      updateData.contact_lens_rx_add_od = body.contact_lens_rx_add_od;
    if (body.contact_lens_rx_base_curve_od !== undefined)
      updateData.contact_lens_rx_base_curve_od =
        body.contact_lens_rx_base_curve_od;
    if (body.contact_lens_rx_diameter_od !== undefined)
      updateData.contact_lens_rx_diameter_od = body.contact_lens_rx_diameter_od;
    if (body.contact_lens_rx_sphere_os !== undefined)
      updateData.contact_lens_rx_sphere_os = body.contact_lens_rx_sphere_os;
    if (body.contact_lens_rx_cylinder_os !== undefined)
      updateData.contact_lens_rx_cylinder_os = body.contact_lens_rx_cylinder_os;
    if (body.contact_lens_rx_axis_os !== undefined)
      updateData.contact_lens_rx_axis_os = body.contact_lens_rx_axis_os;
    if (body.contact_lens_rx_add_os !== undefined)
      updateData.contact_lens_rx_add_os = body.contact_lens_rx_add_os;
    if (body.contact_lens_rx_base_curve_os !== undefined)
      updateData.contact_lens_rx_base_curve_os =
        body.contact_lens_rx_base_curve_os;
    if (body.contact_lens_rx_diameter_os !== undefined)
      updateData.contact_lens_rx_diameter_os = body.contact_lens_rx_diameter_os;
    if (body.contact_lens_quantity !== undefined)
      updateData.contact_lens_quantity = body.contact_lens_quantity;
    if (body.contact_lens_cost !== undefined)
      updateData.contact_lens_cost = body.contact_lens_cost;
    if (body.contact_lens_price !== undefined)
      updateData.contact_lens_price = body.contact_lens_price;

    const { data: updatedQuote, error } = await supabaseServiceRole
      .from("quotes")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        customer:customers!quotes_customer_id_fkey(id, first_name, last_name, email, phone),
        prescription:prescriptions!quotes_prescription_id_fkey(*)
      `,
      )
      .single();

    if (error) {
      logger.error("Error updating quote", error);
      return NextResponse.json(
        { error: "Failed to update quote" },
        { status: 500 },
      );
    }

    // Send email if status changed to 'sent'
    if (
      body.status === "sent" &&
      updatedQuote.status === "sent" &&
      (updatedQuote.customer?.email || (updatedQuote as unknown).guest_email)
    ) {
      (async () => {
        try {
          const { data: branch } = await supabaseServiceRole
            .from("branches")
            .select("name")
            .eq("id", updatedQuote.branch_id)
            .single();

          await sendQuoteSent(
            {
              customer_name:
                `${updatedQuote.customer?.first_name || ""} ${updatedQuote.customer?.last_name || ""}`.trim() ||
                "Cliente",
              customer_email:
                updatedQuote.customer?.email ||
                (updatedQuote as unknown).guest_email,
              quote_number: updatedQuote.quote_number,
              total_amount: updatedQuote.total_amount,
              expiration_date: updatedQuote.expiration_date,
              branch_name: branch?.name || "",
              items: [],
            },
            branchContext.organizationId ?? undefined,
          );
        } catch (err) {
          logger.error("Error sending quote email on update", err);
        }
      })();
    }

    return createApiSuccessResponse(updatedQuote);
  } catch (error) {
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return createApiErrorResponse(new AuthenticationError("No autorizado"));
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return createApiErrorResponse(new AuthorizationError("Acceso denegado"));
    }

    const { id } = params;

    // First, check if the quote exists and if it's converted
    const { data: quote, error: fetchError } = await supabaseServiceRole
      .from("quotes")
      .select("id, status, converted_to_work_order_id")
      .eq("id", id)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Prevent deletion of converted quotes
    if (
      quote.status === "converted_to_work" ||
      quote.converted_to_work_order_id
    ) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar un presupuesto que ha sido convertido a trabajo",
        },
        { status: 400 },
      );
    }

    // Delete the quote
    const { error: deleteError } = await supabaseServiceRole
      .from("quotes")
      .delete()
      .eq("id", id);

    if (deleteError) {
      logger.error("Error deleting quote", deleteError);
      return NextResponse.json(
        { error: "Failed to delete quote" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Presupuesto eliminado exitosamente",
    });
  } catch (error) {
    logger.error("Error deleting quote", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/whatsapp/oauth-callback
 * Callback de Meta OAuth (Embedded Signup). Intercambia code por token,
 * obtiene WABA y phone_number_id, guarda en whatsapp_phone_numbers.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const META_GRAPH = "https://graph.facebook.com/v18.0";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectTarget = `${baseUrl}/admin/system?tab=whatsapp`;

  if (errorParam) {
    logger.warn("WhatsApp OAuth error from Meta", { error: errorParam });
    return NextResponse.redirect(
      `${redirectTarget}&whatsapp_error=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${redirectTarget}&whatsapp_error=no_code`);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.redirect(
        `${baseUrl}/login?redirect=/admin/system?tab=whatsapp`
      );
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id, organization_id")
      .eq("id", user.id)
      .eq("is_active", true)
      .single();

    if (!adminUser?.organization_id) {
      return NextResponse.redirect(
        `${redirectTarget}&whatsapp_error=no_org`
      );
    }

    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      logger.error("META_APP_ID or META_APP_SECRET not configured");
      return NextResponse.redirect(
        `${redirectTarget}&whatsapp_error=config`
      );
    }

    const callbackUrl = `${baseUrl}/api/admin/whatsapp/oauth-callback`;
    const tokenRes = await fetch(
      `${META_GRAPH}/oauth/access_token?` +
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: callbackUrl,
          code,
        }),
      { method: "GET" }
    );

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error?: { message: string };
    };

    if (!tokenRes.ok || !tokenData.access_token) {
      logger.error("WhatsApp OAuth token exchange failed", {
        status: tokenRes.status,
        data: tokenData,
      });
      return NextResponse.redirect(
        `${redirectTarget}&whatsapp_error=token_exchange`
      );
    }

    const accessToken = tokenData.access_token;

    // Obtener WABAs: probar varios endpoints según documentación Meta
    const wabaRes = await fetch(
      `${META_GRAPH}/me?fields=id&access_token=${accessToken}`
    );
    const meData = (await wabaRes.json()) as { id?: string; error?: { message: string } };
    if (meData.error) {
      logger.error("WhatsApp OAuth: me failed", meData);
      return NextResponse.redirect(
        `${redirectTarget}&whatsapp_error=me_failed`
      );
    }

    // Obtener WABA: probar varios endpoints según documentación Meta
    let wabaId: string | null = null;

    // 1. GET /me/assigned_waba_ids
    const wabaIdsRes = await fetch(
      `${META_GRAPH}/me/assigned_waba_ids?access_token=${accessToken}`
    );
    const wabaIdsData = (await wabaIdsRes.json()) as Record<string, unknown>;
    const wabaDataArr = wabaIdsData?.data as Array<{ waba_id?: string; id?: string }> | undefined;
    if (Array.isArray(wabaDataArr) && wabaDataArr.length > 0) {
      const first = wabaDataArr[0];
      wabaId = first?.waba_id ?? first?.id ?? null;
    } else if (typeof wabaIdsData?.waba_id === "string") {
      wabaId = wabaIdsData.waba_id;
    }

    // 2. Fallback: GET /me/businesses con owned_whatsapp_business_accounts
    if (!wabaId) {
      const bizRes = await fetch(
        `${META_GRAPH}/me/businesses?fields=owned_whatsapp_business_accounts{id}&access_token=${accessToken}`
      );
      const bizData = (await bizRes.json()) as {
        data?: Array<{ owned_whatsapp_business_accounts?: { data?: Array<{ id: string }> } }>;
      };
      const accounts = bizData.data?.[0]?.owned_whatsapp_business_accounts?.data;
      if (accounts?.length) {
        wabaId = accounts[0].id;
      }
    }

    if (!wabaId) {
      logger.warn("WhatsApp OAuth: no WABA found", { meData });
      return NextResponse.redirect(
        `${redirectTarget}&whatsapp_error=no_waba`
      );
    }

    // GET /{waba_id}/phone_numbers
    const phonesRes = await fetch(
      `${META_GRAPH}/${wabaId}/phone_numbers?access_token=${accessToken}`
    );
    const phonesData = (await phonesRes.json()) as {
      data?: Array<{
        id: string;
        display_phone_number?: string;
        verified_name?: string;
      }>;
      error?: { message: string };
    };

    if (phonesData.error || !phonesData.data?.length) {
      logger.warn("WhatsApp OAuth: no phone numbers", phonesData);
      return NextResponse.redirect(
        `${redirectTarget}&whatsapp_error=no_phones`
      );
    }

    const firstPhone = phonesData.data[0];
    const phoneNumberId = firstPhone.id;
    const displayPhone = firstPhone.display_phone_number ?? null;

    const supabaseService = createServiceRoleClient();
    const { data: existing } = await supabaseService
      .from("whatsapp_phone_numbers")
      .select("id")
      .eq("organization_id", adminUser.organization_id)
      .maybeSingle();

    const payload = {
      organization_id: adminUser.organization_id,
      phone_number_id: String(phoneNumberId),
      waba_id: String(wabaId),
      display_phone_number: displayPhone,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error: updateError } = await supabaseService
        .from("whatsapp_phone_numbers")
        .update(payload)
        .eq("id", existing.id);

      if (updateError) {
        logger.error("WhatsApp OAuth: update failed", updateError);
        return NextResponse.redirect(
          `${redirectTarget}&whatsapp_error=save_failed`
        );
      }
    } else {
      const { error: insertError } = await supabaseService
        .from("whatsapp_phone_numbers")
        .insert(payload);

      if (insertError) {
        logger.error("WhatsApp OAuth: insert failed", insertError);
        return NextResponse.redirect(
          `${redirectTarget}&whatsapp_error=save_failed`
        );
      }
    }

    return NextResponse.redirect(`${redirectTarget}&whatsapp_success=1`);
  } catch (err) {
    logger.error("WhatsApp OAuth callback error", err);
    return NextResponse.redirect(
      `${redirectTarget}&whatsapp_error=internal`
    );
  }
}

/**
 * POST /api/admin/subscription/change-plan
 * Cambia el plan de suscripción de la organización del usuario actual.
 * Maneja upgrade/downgrade de forma justa:
 * - Upgrade: cambio inmediato, prorrateo del costo restante del periodo actual
 * - Downgrade: cambio al final del periodo actual (sin prorrateo)
 */
import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { getSubscriptionStatus } from "@/lib/saas/subscription-status";
import { recordTierChange } from "@/lib/saas/tier-change-audit";
import type { SubscriptionTier } from "@/lib/saas/tier-config";
import { canUpgrade } from "@/lib/saas/tier-config";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();

    const organizationId = adminUser?.organization_id;
    if (!organizationId) {
      return NextResponse.json(
        { error: "No tienes una organización asignada" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { newTier, immediate = false } = body;

    if (!newTier || !["basic", "pro", "premium"].includes(newTier)) {
      return NextResponse.json(
        { error: "Tier inválido. Debe ser: basic, pro, o premium" },
        { status: 400 },
      );
    }

    // Get current organization and subscription status
    const { data: org } = await supabase
      .from("organizations")
      .select("id, subscription_tier")
      .eq("id", organizationId)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organización no encontrada" },
        { status: 404 },
      );
    }

    const currentTier = (org.subscription_tier || "basic") as SubscriptionTier;
    const targetTier = newTier as SubscriptionTier;

    if (currentTier === targetTier) {
      return NextResponse.json(
        { error: "Ya estás en ese plan" },
        { status: 400 },
      );
    }

    const subscriptionStatus = await getSubscriptionStatus(organizationId);
    const isUpgrade = canUpgrade(currentTier, targetTier);

    // For upgrades: immediate change (user pays difference)
    // For downgrades: schedule change at end of current period (unless immediate=true)
    const shouldChangeImmediately = immediate || isUpgrade;

    if (shouldChangeImmediately) {
      // Immediate change: update organization tier now
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          subscription_tier: targetTier,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId);

      if (updateError) {
        logger.error("Error updating organization tier", updateError);
        return NextResponse.json(
          { error: "Error al actualizar el plan" },
          { status: 500 },
        );
      }

      await recordTierChange({
        organizationId,
        fromTier: currentTier,
        toTier: targetTier,
        changedByUserId: user.id,
        source: "org_user",
      });

      logger.info("Plan changed immediately", {
        organizationId,
        fromTier: currentTier,
        toTier: targetTier,
        isUpgrade,
      });

      return NextResponse.json({
        success: true,
        message: `Plan actualizado a ${targetTier}. ${
          isUpgrade
            ? "El cambio es efectivo inmediatamente."
            : "El cambio es efectivo ahora."
        }`,
        newTier: targetTier,
        effectiveDate: new Date().toISOString(),
      });
    } else {
      // Scheduled downgrade: store in scheduled_tier, apply at end of period
      const effectiveAt =
        subscriptionStatus.currentPeriodEnd ||
        subscriptionStatus.trialEndsAt ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // fallback: 30 days

      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          scheduled_tier: targetTier,
          scheduled_tier_effective_at: effectiveAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId);

      if (updateError) {
        logger.error("Error scheduling tier change", updateError);
        return NextResponse.json(
          { error: "Error al programar el cambio de plan" },
          { status: 500 },
        );
      }

      logger.info("Plan change scheduled", {
        organizationId,
        fromTier: currentTier,
        toTier: targetTier,
        effectiveDate: effectiveAt,
      });

      return NextResponse.json({
        success: true,
        message: `Plan programado para cambiar a ${targetTier} al final del período actual (${effectiveAt.toLocaleDateString("es-CL")}).`,
        newTier: targetTier,
        effectiveDate: effectiveAt.toISOString(),
        scheduled: true,
      });
    }
  } catch (error) {
    logger.error("Error in change-plan API", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

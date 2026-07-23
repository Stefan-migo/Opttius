import { NextResponse } from "next/server";

import type { GetAdminRoleParams, GetAdminRoleResult } from "@/types/supabase-rpc";
import type { createClient } from "@/utils/supabase/server";

const ALLOWED_ROLES = ["admin", "super_admin", "root", "dev", "employee", "vendedor"];

export async function checkAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { user, error: null as NextResponse | null };
}

export async function getAdminRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase.rpc("get_admin_role", { user_id: userId } as GetAdminRoleParams) as { data: GetAdminRoleResult | null };
  return data;
}

export async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const role = await getAdminRole(supabase, userId);
  if (!role || !ALLOWED_ROLES.includes(role)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  return null;
}

export function getMostFrequentActions(activities: unknown[]) {
  const actionCounts = activities.reduce((acc: unknown, activity: unknown) => { acc[activity.action] = (acc[activity.action] || 0) + 1; return acc; }, {});
  return Object.entries(actionCounts).map(([action, count]) => ({ action, count })).sort((a: unknown, b: unknown) => b.count - a.count).slice(0, 5);
}

export function getActivityByDay(recentActivity: unknown[], now: Date) {
  const activityByDay = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    activityByDay.push({ date: dayStart.toISOString().split("T")[0], count: recentActivity.filter((a: unknown) => new Date(a.created_at) >= dayStart && new Date(a.created_at) < dayEnd).length });
  }
  return activityByDay;
}

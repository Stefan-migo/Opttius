import { createClient } from "@/utils/supabase/server";
import AdminDashboardContent from "./_components/AdminDashboardContent";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <AdminDashboardContent />;
}

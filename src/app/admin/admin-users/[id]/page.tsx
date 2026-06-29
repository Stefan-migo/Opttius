import { createClient } from "@/utils/supabase/server";
import AdminUserDetailContent from "./_components/AdminUserDetailContent";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <AdminUserDetailContent />;
}

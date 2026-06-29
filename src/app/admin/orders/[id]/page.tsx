import { createClient } from "@/utils/supabase/server";
import AdminOrderDetailContent from "./_components/AdminOrderDetailContent";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <AdminOrderDetailContent />;
}

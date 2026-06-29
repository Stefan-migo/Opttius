import { createClient } from "@/utils/supabase/server";
import AdminUsersContent from "./_components/AdminUsersContent";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <AdminUsersContent />;
}

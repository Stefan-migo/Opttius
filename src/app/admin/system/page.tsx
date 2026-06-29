import { createClient } from "@/utils/supabase/server";
import SystemAdminContent from "./_components/SystemAdminContent";

export const dynamic = "force-dynamic";

export default async function SystemAdministrationPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <SystemAdminContent />;
}

import { createClient } from "@/utils/supabase/server";
import UsersManagementContent from "./_components/UsersManagementContent";

export const dynamic = "force-dynamic";

export default async function UsersManagementPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <UsersManagementContent />;
}

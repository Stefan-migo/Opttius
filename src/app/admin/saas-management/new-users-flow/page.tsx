import { createClient } from "@/utils/supabase/server";
import NewUsersFlowContent from "./_components/NewUsersFlowContent";

export const dynamic = "force-dynamic";

export default async function NewUsersFlowPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <NewUsersFlowContent />;
}

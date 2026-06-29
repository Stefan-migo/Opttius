import { createClient } from "@/utils/supabase/server";
import WorkOrdersContent from "./_components/WorkOrdersContent";

export const dynamic = "force-dynamic";

export default async function WorkOrdersPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <WorkOrdersContent />;
}

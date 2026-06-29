import { createClient } from "@/utils/supabase/server";
import WorkOrderDetailContent from "./_components/WorkOrderDetailContent";

export const dynamic = "force-dynamic";

export default async function WorkOrderDetailPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <WorkOrderDetailContent />;
}

import { createClient } from "@/utils/supabase/server";
import TicketDetailContent from "./_components/TicketDetailContent";

export const dynamic = "force-dynamic";

export default async function OpticalInternalSupportTicketDetailPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <TicketDetailContent />;
}

import { createClient } from "@/utils/supabase/server";
import PrescriptionsContent from "./_components/PrescriptionsContent";

export const dynamic = "force-dynamic";

export default async function PrescriptionsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <PrescriptionsContent />;
}

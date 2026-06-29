import { createClient } from "@/utils/supabase/server";
import SubscriptionsContent from "./_components/SubscriptionsContent";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <SubscriptionsContent />;
}

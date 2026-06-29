import { createClient } from "@/utils/supabase/server";
import SubscriptionDetailsContent from "./_components/SubscriptionDetailsContent";

export const dynamic = "force-dynamic";

export default async function SubscriptionDetailsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <SubscriptionDetailsContent />;
}

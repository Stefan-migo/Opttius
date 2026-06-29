import { createClient } from "@/utils/supabase/server";
import SaaSAnalyticsContent from "./_components/SaaSAnalyticsContent";

export const dynamic = "force-dynamic";

export default async function SaaSAnalyticsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <SaaSAnalyticsContent />;
}

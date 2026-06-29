import { createClient } from "@/utils/supabase/server";
import AnalyticsContent from "./_components/AnalyticsContent";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <AnalyticsContent />;
}

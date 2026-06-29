import { createClient } from "@/utils/supabase/server";
import QuoteSettingsContent from "./_components/QuoteSettingsContent";

export const dynamic = "force-dynamic";

export default async function QuoteSettingsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <QuoteSettingsContent />;
}

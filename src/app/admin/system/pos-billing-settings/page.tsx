import { createClient } from "@/utils/supabase/server";
import POSBillingSettingsContent from "./_components/POSBillingSettingsContent";

export const dynamic = "force-dynamic";

export default async function POSBillingSettingsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <POSBillingSettingsContent />;
}

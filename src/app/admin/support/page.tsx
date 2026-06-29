import { createClient } from "@/utils/supabase/server";
import OpticalInternalSupportContent from "./_components/OpticalInternalSupportContent";

export const dynamic = "force-dynamic";

export default async function OpticalInternalSupportPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <OpticalInternalSupportContent />;
}

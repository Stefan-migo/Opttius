import { createClient } from "@/utils/supabase/server";
import SupportContent from "./_components/SupportContent";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <SupportContent />;
}

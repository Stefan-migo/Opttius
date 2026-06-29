import { createClient } from "@/utils/supabase/server";
import CashClosureContent from "./_components/CashClosureContent";

export const dynamic = "force-dynamic";

export default async function CashClosureDetailPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <CashClosureContent />;
}

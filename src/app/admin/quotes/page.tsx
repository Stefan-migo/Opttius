import { createClient } from "@/utils/supabase/server";
import QuotesContent from "./_components/QuotesContent";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <QuotesContent />;
}

import { createClient } from "@/utils/supabase/server";
import CustomerDetailContent from "./_components/CustomerDetailContent";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <CustomerDetailContent />;
}

import { createClient } from "@/utils/supabase/server";
import BulkOperationsContent from "./_components/BulkOperationsContent";

export const dynamic = "force-dynamic";

export default async function BulkOperationsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <BulkOperationsContent />;
}

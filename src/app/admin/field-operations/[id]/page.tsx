import { createClient } from "@/utils/supabase/server";
import FieldOpDetailContent from "./_components/FieldOpDetailContent";

export const dynamic = "force-dynamic";

export default async function FieldOperationDetailPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <FieldOpDetailContent />;
}

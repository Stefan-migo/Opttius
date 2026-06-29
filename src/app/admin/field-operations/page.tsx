import { createClient } from "@/utils/supabase/server";
import FieldOperationsContent from "./_components/FieldOperationsContent";

export const dynamic = "force-dynamic";

export default async function FieldOperationsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <FieldOperationsContent />;
}

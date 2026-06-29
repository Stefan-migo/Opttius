import { createClient } from "@/utils/supabase/server";
import TemplatesContent from "./_components/TemplatesContent";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <TemplatesContent />;
}

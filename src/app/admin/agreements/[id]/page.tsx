import { createClient } from "@/utils/supabase/server";
import AgreementDetailContent from "./_components/AgreementDetailContent";

export const dynamic = "force-dynamic";

export default async function AgreementDetailPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <AgreementDetailContent />;
}

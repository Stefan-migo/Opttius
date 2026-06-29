import { createClient } from "@/utils/supabase/server";
import OrgsContent from "./_components/OrgsContent";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <OrgsContent />;
}

import { createClient } from "@/utils/supabase/server";
import OrganizationDetailsContent from "./_components/OrganizationDetailsContent";

export const dynamic = "force-dynamic";

export default async function OrganizationDetailsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <OrganizationDetailsContent />;
}

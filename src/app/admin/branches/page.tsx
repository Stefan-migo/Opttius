import { createClient } from "@/utils/supabase/server";
import BranchesContent from "./_components/BranchesContent";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <BranchesContent />;
}

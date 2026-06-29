import { createClient } from "@/utils/supabase/server";
import SaaSDashboardContent from "./_components/SaaSDashboardContent";

export const dynamic = "force-dynamic";

export default async function SaaSDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <SaaSDashboardContent
      initialUser={user ? { id: user.id, email: user.email } : null}
    />
  );
}

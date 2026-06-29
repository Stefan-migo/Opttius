import { createClient } from "@/utils/supabase/server";
import AppointmentsContent from "./_components/AppointmentsContent";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <AppointmentsContent />;
}

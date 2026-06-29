import { createClient } from "@/utils/supabase/server";
import NotificationsContent from "./_components/NotificationsContent";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <NotificationsContent />;
}

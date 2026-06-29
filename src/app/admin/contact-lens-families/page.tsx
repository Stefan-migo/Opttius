import { createClient } from "@/utils/supabase/server";
import ContactLensFamiliesContent from "./_components/ContactLensFamiliesContent";

export const dynamic = "force-dynamic";

export default async function ContactLensFamiliesPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <ContactLensFamiliesContent />;
}

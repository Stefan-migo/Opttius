import { createClient } from "@/utils/supabase/server";
import ContactLensMatricesContent from "./_components/ContactLensMatricesContent";

export const dynamic = "force-dynamic";

export default async function ContactLensMatricesPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <ContactLensMatricesContent />;
}

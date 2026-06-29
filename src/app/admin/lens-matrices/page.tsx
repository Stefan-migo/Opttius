import { createClient } from "@/utils/supabase/server";
import LensMatricesContent from "./_components/LensMatricesContent";

export const dynamic = "force-dynamic";

export default async function LensMatricesPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <LensMatricesContent />;
}

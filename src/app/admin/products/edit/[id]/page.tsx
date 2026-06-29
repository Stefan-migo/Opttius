import { createClient } from "@/utils/supabase/server";
import EditProductContent from "./_components/EditProductContent";

export const dynamic = "force-dynamic";

export default async function EditProductPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <EditProductContent />;
}

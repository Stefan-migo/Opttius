import { createClient } from "@/utils/supabase/server";
import AddProductContent from "./_components/AddProductContent";

export const dynamic = "force-dynamic";

export default async function AddProductPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <AddProductContent />;
}

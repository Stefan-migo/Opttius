import { createClient } from "@/utils/supabase/server";
import CategoriesContent from "./_components/CategoriesContent";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <CategoriesContent />;
}

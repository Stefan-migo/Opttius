import { createClient } from "@/utils/supabase/server";
import ProductOptionsContent from "./_components/ProductOptionsContent";

export const dynamic = "force-dynamic";

export default async function ProductOptionsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  return <ProductOptionsContent />;
}

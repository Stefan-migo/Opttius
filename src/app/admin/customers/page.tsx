import { createClient } from "@/utils/supabase/server";
import CustomersContent from "./_components/CustomersContent";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id) {
    return (
      <CustomersContent
        initialCustomers={[]}
        currentBranchId={null}
        isSuperAdmin={false}
        organizationId={null}
      />
    );
  }

  // Get branch context from user's admin profile
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("organization_id, branch_id")
    .eq("id", user.id)
    .single();

  const currentBranchId = adminUser?.branch_id ?? null;
  const organizationId = adminUser?.organization_id ?? null;

  // Check super admin status
  const { data: isSuperAdminData } = await supabase.rpc("is_super_admin", {
    user_id: user.id,
  });

  const isSuperAdmin = !!isSuperAdminData;

  // Fetch initial data
  const { data: initialCustomers } = organizationId
    ? await supabase
        .from("customers")
        .select("*")
        .eq("organization_id", organizationId)
        .limit(25)
    : { data: [] };

  return (
    <CustomersContent
      initialCustomers={initialCustomers ?? []}
      currentBranchId={currentBranchId}
      isSuperAdmin={isSuperAdmin}
      organizationId={organizationId}
    />
  );
}

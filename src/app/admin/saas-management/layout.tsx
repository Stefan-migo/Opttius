import { redirect } from "next/navigation";
import { ReactNode } from "react";

import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { SaasManagementSidebar } from "@/components/admin/saas-management/SaasManagementSidebar";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface SaasManagementLayoutProps {
  children: ReactNode;
}

export default async function SaasManagementLayout({
  children,
}: SaasManagementLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verificar si el usuario es root/dev usando service role
  const supabaseServiceRole = createServiceRoleClient();
  const { data: adminUser } = await supabaseServiceRole
    .from("admin_users")
    .select("role, email")
    .eq("id", user.id)
    .single();

  const isRoot = adminUser?.role === "root" || adminUser?.role === "dev";

  if (!isRoot) {
    redirect("/admin");
  }

  return (
    <div className="flex h-screen bg-[#0D1117]">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-[280px] flex-shrink-0">
        <SaasManagementSidebar />
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0D1117]">
          {/* Mobile Menu Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="p-0 w-[300px] bg-[#0D1117] border-r border-white/10"
            >
              <SaasManagementSidebar />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#C5A059] to-[#8B7355] flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#0D1117]"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span className="text-white font-bold font-display">
              SaaS Engine
            </span>
          </div>

          {/* Spacer for balance */}
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}

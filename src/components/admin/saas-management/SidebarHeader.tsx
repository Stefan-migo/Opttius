"use client";

import { ArrowLeft, Loader2, Zap } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";

interface Stats {
  totalOrganizations: number;
  activeOrganizations: number;
}

export function SidebarHeader({
  onNavigate,
  stats,
  loading,
}: {
  onNavigate?: () => void;
  stats: Stats;
  loading: boolean;
}) {
  return (
    <>
      <div className="saas-sidebar-header relative z-10 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between py-4 px-4">
          <Link
            className="saas-sidebar-logo group flex items-center gap-3"
            href="/admin/saas-management/dashboard"
            onClick={onNavigate}
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#C5A059] to-[#8B7355] flex items-center justify-center shadow-lg">
              <Zap className="h-6 w-6 text-[#0D1117]" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white tracking-tight font-display">
                SaaS Engine
              </span>
              <span className="text-[10px] text-white/50 font-medium">
                OPTTIUS
              </span>
            </div>
          </Link>
          {onNavigate && (
            <SheetClose asChild>
              <Button
                className="rounded-xl text-white/70 hover:bg-white/10 hover:text-white shrink-0"
                size="icon"
                variant="ghost"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </SheetClose>
          )}
        </div>
      </div>
      <div className="px-3 py-3 border-b border-white/5">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-lg p-2.5">
            <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-0.5">
              Organizaciones
            </div>
            <div className="text-lg font-bold text-white font-display">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                stats.totalOrganizations
              )}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-2.5">
            <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-0.5">
              Activas
            </div>
            <div className="text-lg font-bold text-emerald-400 font-display">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                stats.activeOrganizations
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

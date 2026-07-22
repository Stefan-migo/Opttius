"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface Props {
  onSignOut: () => void;
  onNavigate?: () => void;
}

export function SidebarFooter({ onSignOut, onNavigate }: Props) {
  return (
    <div className="saas-sidebar-footer border-t border-white/10 p-3 flex-shrink-0">
      <div className="flex flex-col gap-2">
        <Link
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-colors"
          href="/admin"
          onClick={onNavigate}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Volver a Óptica</span>
        </Link>
        <Button
          className="justify-start px-3 py-2 text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          variant="ghost"
          onClick={onSignOut}
        >
          <span className="text-sm font-medium flex items-center gap-2">
            <svg
              fill="none"
              height="16"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            Cerrar sesión
          </span>
        </Button>
      </div>
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="text-center text-[10px] text-white/30">
          Opttius SaaS Engine v2.0
        </div>
      </div>
    </div>
  );
}

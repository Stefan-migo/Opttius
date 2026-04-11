"use client";

import { Building2, MessageSquare, Sparkles } from "lucide-react";

import AdminNotificationDropdown from "@/components/admin/AdminNotificationDropdown";
import { BranchSelector } from "@/components/admin/BranchSelector";
import { ThemeSelector } from "@/components/theme-selector";
import { Button } from "@/components/ui/button";

interface AdminMobileNavProps {
  onChatbotClick: () => void;
  onInsightsClick: () => void;
}

export function AdminMobileNav({
  onChatbotClick,
  onInsightsClick,
}: AdminMobileNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-admin-bg-secondary border-t border-admin-border-primary/20 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-1 [&_button]:text-[#F9F7F2] [&_button:hover]:text-white [&_button:hover]:bg-white/10 [&_svg]:text-[#F9F7F2]">
        <div className="relative flex items-center justify-center min-w-[44px] min-h-[44px]">
          <Building2
            aria-hidden
            className="h-5 w-5 flex-shrink-0 text-[#F9F7F2] pointer-events-none"
          />
          <div className="absolute inset-0 flex items-center justify-center [&_button]:border-0 [&_button]:shadow-none [&_button]:bg-transparent [&_button]:opacity-0 [&_button>span]:hidden [&_button]:w-full [&_button]:h-full [&_button]:min-w-0">
            <BranchSelector />
          </div>
        </div>
        <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
          <AdminNotificationDropdown variant="sheet" />
        </div>
        {/* Chatbot - center, opens full screen */}
        <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
          <Button
            aria-label="Asistente IA"
            className="min-w-[44px] min-h-[44px] rounded-xl text-[#F9F7F2] hover:bg-white/10 hover:text-white"
            size="icon"
            variant="ghost"
            onClick={onChatbotClick}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
        {/* Insights */}
        <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
          <Button
            aria-label="Insights Inteligentes"
            className="min-w-[44px] min-h-[44px] rounded-xl text-[#F9F7F2] hover:bg-white/10 hover:text-white"
            size="icon"
            variant="ghost"
            onClick={onInsightsClick}
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
          <ThemeSelector />
        </div>
      </div>
    </nav>
  );
}

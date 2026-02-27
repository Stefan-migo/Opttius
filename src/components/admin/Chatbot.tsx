"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MessageSquare, X } from "lucide-react";
import { ChatbotContent } from "./ChatbotContent";
import { cn } from "@/lib/utils";
import type { InsightSection } from "@/lib/ai/insights/schemas";

const STORAGE_KEY = "opttius-chat-expanded";

interface ChatbotProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Map pathname to section
function getSectionFromPathname(pathname: string): InsightSection | null {
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  if (pathname.startsWith("/admin/pos")) return "pos";
  if (pathname.startsWith("/admin/products")) return "inventory";
  if (pathname.startsWith("/admin/customers")) return "clients";
  if (pathname.startsWith("/admin/analytics")) return "analytics";
  return null;
}

function getStoredExpanded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export default function Chatbot(
  {
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
  }: ChatbotProps = {} as ChatbotProps,
) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(getStoredExpanded);
  const pathname = usePathname();
  const currentSection = getSectionFromPathname(pathname);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled
    ? (controlledOnOpenChange ?? (() => {}))
    : setInternalOpen;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isExpanded));
    } catch {
      /* ignore */
    }
  }, [isExpanded]);

  const handleExpandClick = () => {
    setIsExpanded(true);
    setIsOpen(true);
  };

  const handleCollapseClick = () => {
    setIsExpanded(false);
    setIsOpen(false);
  };

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [setIsOpen]);

  const chatContent = (
    <ChatbotContent
      className="h-full"
      currentSection={currentSection}
      onClose={() => setIsOpen(false)}
      onExpandClick={isExpanded ? handleCollapseClick : handleExpandClick}
      isSidebarMode={isExpanded || isControlled}
    />
  );

  // When controlled (mobile nav) or expanded: use Sheet. Full-screen on mobile.
  const useSheet = isExpanded || (isControlled && isOpen);

  return (
    <div className="relative z-[100] flex flex-col items-end justify-end w-fit">
      {useSheet ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent
            side="right"
            elevateZIndex
            className="w-full max-w-full sm:w-[420px] p-0 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
              {chatContent}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <div
          className={cn(
            "absolute right-0 bottom-full mb-2 w-[90vw] sm:w-[400px] h-[600px] max-h-[80vh] bg-white dark:bg-slate-950 rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right",
            isOpen
              ? "scale-100 opacity-100 translate-y-0 pointer-events-auto"
              : "scale-95 opacity-0 translate-y-4 pointer-events-none invisible",
          )}
        >
          {chatContent}
        </div>
      )}

      {/* Trigger Bubble - desktop only (mobile uses bottom nav) */}
      <div className="hidden lg:flex">
        <Button
          variant="default"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "rounded-full w-14 h-14 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 hover:scale-110 active:scale-95",
            isOpen
              ? "bg-slate-100 dark:bg-slate-800 text-slate-500 rotate-90 shadow-none"
              : "bg-gradient-to-tr from-primary via-primary to-primary/80 text-white",
          )}
          title="Asistente de Inteligencia Opttius"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <div className="relative">
              <MessageSquare className="w-6 h-6" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-primary animate-pulse" />
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}

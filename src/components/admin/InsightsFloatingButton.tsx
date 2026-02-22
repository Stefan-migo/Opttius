"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sparkles } from "lucide-react";
import { SmartContextWidget } from "@/components/ai/SmartContextWidget";
import type { InsightSection } from "@/lib/ai/insights/schemas";
import { cn } from "@/lib/utils";

function getSectionFromPathname(pathname: string): InsightSection | null {
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  if (pathname.startsWith("/admin/pos")) return "pos";
  if (pathname.startsWith("/admin/products")) return "inventory";
  if (pathname.startsWith("/admin/customers")) return "clients";
  if (pathname.startsWith("/admin/analytics")) return "analytics";
  return null;
}

export function InsightsFloatingButton() {
  const pathname = usePathname();
  const section = getSectionFromPathname(pathname);
  const [open, setOpen] = useState(false);

  if (section == null) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className={cn(
            "rounded-full w-14 h-14 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:scale-110 active:scale-95",
            "bg-primary text-primary-foreground",
          )}
          title="Insights Inteligentes"
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[420px] p-0 flex flex-col overflow-hidden"
      >
        <div className="flex-1 overflow-hidden min-h-0">
          <SmartContextWidget
            section={section}
            variant="embedded"
            onClose={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

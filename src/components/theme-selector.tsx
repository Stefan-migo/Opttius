"use client";

import * as React from "react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Check } from "lucide-react";
import { ThemeId, themes } from "@/config/themes";
import { cn } from "@/lib/utils";

export function ThemeSelector() {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Palette className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Palette className="h-4 w-4 text-admin-text-primary" />
          <span className="sr-only">Select theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themes.map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.id}
            onClick={() => setTheme(themeOption.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-4 w-4 rounded-full border-2 border-border",
                  themeOption.id === "light" && "bg-[#F9F7F2]",
                  themeOption.id === "dark" && "bg-[#1A2B23]",
                  themeOption.id === "blue" && "bg-[#102A43]",
                  themeOption.id === "green" && "bg-[#1A2B23]",
                  themeOption.id === "red" && "bg-[#4D1414]",
                )}
              />
              <span>{themeOption.name}</span>
            </div>
            {theme === themeOption.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

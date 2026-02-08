"use client";

import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export function TypingIndicator() {
  return (
    <div className="flex flex-col mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex gap-3 max-w-[90%] flex-row">
        {/* Avatar */}
        <div className="flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-primary shadow-lg shadow-slate-200/50 dark:shadow-none">
          <Bot className="w-5 h-5 animate-pulse" />
        </div>

        {/* Bubble */}
        <div className="flex flex-col gap-1.5">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-tl-none px-5 py-3.5 shadow-sm shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            Analizando datos...
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizonal, Sparkles, Command } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Pregunta sobre Opttius...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  return (
    <div className="p-4 bg-white dark:bg-slate-950/20 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800/50">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-2 bg-white dark:bg-slate-900 rounded-[24px] p-2 pr-2.5 border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="resize-none min-h-[44px] max-h-48 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 text-[14.5px] leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <Button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            size="icon"
            className={cn(
              "shrink-0 rounded-xl w-10 h-10 transition-all duration-300",
              message.trim()
                ? "bg-primary text-white shadow-md shadow-primary/20 scale-100 opacity-100"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 scale-90 opacity-50",
            )}
          >
            <SendHorizonal className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center justify-between px-4 mt-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
              <Command className="w-3 h-3" />
              <span>Enter para enviar</span>
            </div>
            <span className="text-slate-200 dark:text-slate-800 text-[10px]">
              |
            </span>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
              <span>Shift+Enter para nueva línea</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-primary/70 font-black uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            Opttius Intelligence
          </div>
        </div>
      </div>
    </div>
  );
}

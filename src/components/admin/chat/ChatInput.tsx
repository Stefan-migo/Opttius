"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizonal, Sparkles, Command, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string, fileId?: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Pregunta sobre Opttius...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<{
    fileId: string;
    filename: string;
    rowCount: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || disabled || uploading) return;

    const isCSV = file.name.toLowerCase().endsWith(".csv");
    const isExcel =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls");
    if (!isCSV && !isExcel) {
      alert("Solo se permiten archivos CSV o Excel (.xlsx, .xls)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo no puede superar 5MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/chat/upload-import-file", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al subir");
      }
      const data = await res.json();
      setAttachedFile({
        fileId: data.fileId,
        filename: data.filename,
        rowCount: data.rowCount ?? 0,
      });
    } catch (err: any) {
      alert(err?.message || "Error al subir el archivo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSend = () => {
    if ((message.trim() || attachedFile) && !disabled) {
      const text = message.trim() || "Importa los datos de este archivo";
      onSend(text, attachedFile?.fileId);
      setMessage("");
      setAttachedFile(null);
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileSelect}
      />
      <div className="max-w-4xl mx-auto">
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm">
            <Paperclip className="h-4 w-4 text-primary" />
            <span className="truncate flex-1">{attachedFile.filename}</span>
            <span className="text-muted-foreground text-xs">
              {attachedFile.rowCount} filas
            </span>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="p-1 hover:bg-primary/20 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="relative flex items-end gap-2 bg-white dark:bg-slate-900 rounded-[24px] p-2 pr-2.5 border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-xl w-10 h-10"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            title="Adjuntar CSV o Excel para importar"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
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
            disabled={disabled || (!message.trim() && !attachedFile)}
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

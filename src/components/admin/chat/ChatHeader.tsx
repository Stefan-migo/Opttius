"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Settings,
  History,
  Wrench,
  MoreVertical,
  Download,
  Trash2,
  Copy,
  Plus,
  Edit2,
  X,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  onSettingsClick: () => void;
  onHistoryClick: () => void;
  onNewConversation: () => void;
  onExport: () => void;
  onClear: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onClose?: () => void;
}

export function ChatHeader({
  title,
  onTitleChange,
  onSettingsClick,
  onHistoryClick,
  onNewConversation,
  onExport,
  onClear,
  onDelete,
  onDuplicate,
  onClose,
}: ChatHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  const handleTitleSubmit = () => {
    if (editTitle.trim()) {
      onTitleChange(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSubmit();
    } else if (e.key === "Escape") {
      setEditTitle(title);
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-primary px-5 py-2 flex items-center justify-between text-white shadow-md relative group">
      <div className="flex items-center gap-4">
        {/* Avatar Area */}
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
          <Bot className="w-6 h-6 text-white" />
        </div>

        {/* Title & Status */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 group/title">
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleTitleKeyDown}
                className="h-7 text-sm font-bold bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30"
                autoFocus
              />
            ) : (
              <h2
                className="text-lg font-bold truncate cursor-pointer hover:text-white/80 transition-colors flex items-center gap-1.5"
                onClick={() => setIsEditing(true)}
              >
                {title || "Opttius IA"}
                <Edit2 className="w-3 h-3 opacity-0 group-hover/title:opacity-50 transition-opacity" />
              </h2>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[11px] font-medium text-white/80 tracking-wide uppercase">
              En línea ahora
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 rounded-full h-9 w-9"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 z-[200]">
            <DropdownMenuLabel>Gestión de Sesión</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onNewConversation} className="gap-2">
              <Plus className="w-4 h-4" /> Nueva conversación
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onHistoryClick} className="gap-2">
              <History className="w-4 h-4" /> Ver historial
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSettingsClick} className="gap-2">
              <Settings className="w-4 h-4" /> Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExport} className="gap-2">
              <Download className="w-4 h-4" /> Exportar chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClear}>
              Limpiar mensajes
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive gap-2 font-medium"
            >
              <Trash2 className="w-4 h-4" /> Eliminar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10 rounded-full h-9 w-9"
          >
            <X className="w-6 h-6" />
          </Button>
        )}
      </div>
    </div>
  );
}

"use client";

import {
  Bot,
  Download,
  Edit2,
  History,
  MoreVertical,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

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
  /** When provided, shows expand/collapse sidebar button */
  onExpandClick?: () => void;
  /** When true, shows collapse icon; when false, expand icon */
  isSidebarMode?: boolean;
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
  onExpandClick,
  isSidebarMode = false,
}: ChatHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  useEffect(() => {
    setEditTitle(title);
  }, [title]);

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
    <div className="bg-primary px-3 sm:px-5 py-2 flex items-center justify-between gap-2 text-white shadow-md relative group min-h-0 shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 overflow-hidden">
        {/* Avatar Area */}
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner shrink-0">
          <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>

        {/* Title & Status */}
        <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-2 group/title min-w-0">
            {isEditing ? (
              <Input
                autoFocus
                className="h-6 sm:h-7 text-xs sm:text-sm font-bold bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30 min-w-0"
                value={editTitle}
                onBlur={handleTitleSubmit}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
              />
            ) : (
              <h2
                className="text-sm sm:text-base font-bold truncate cursor-pointer hover:text-white/80 transition-colors flex items-center gap-1 min-w-0"
                onClick={() => setIsEditing(true)}
              >
                <span className="truncate block">{title || "Opttius IA"}</span>
                <Edit2 className="w-3 h-3 shrink-0 opacity-0 group-hover/title:opacity-50 transition-opacity" />
              </h2>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[11px] font-medium text-white/80 tracking-wide uppercase">
              En línea ahora
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="text-white hover:bg-white/10 rounded-full h-9 w-9"
              size="icon"
              variant="ghost"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 z-[200]">
            <DropdownMenuLabel>Gestión de Sesión</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onClick={onNewConversation}>
              <Plus className="w-4 h-4" /> Nueva conversación
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={onHistoryClick}>
              <History className="w-4 h-4" /> Ver historial
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={onSettingsClick}>
              <Settings className="w-4 h-4" /> Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onClick={onExport}>
              <Download className="w-4 h-4" /> Exportar chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClear}>
              Limpiar mensajes
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive gap-2 font-medium"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4" /> Eliminar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {onExpandClick && (
          <Button
            className="text-white hover:bg-white/10 rounded-xl h-9 w-9"
            size="icon"
            title={
              isSidebarMode
                ? "Volver a ventana flotante"
                : "Expandir como panel lateral"
            }
            variant="ghost"
            onClick={onExpandClick}
          >
            {isSidebarMode ? (
              <PanelRightClose className="w-5 h-5" />
            ) : (
              <PanelRightOpen className="w-5 h-5" />
            )}
          </Button>
        )}

        {onClose && (
          <Button
            className="text-white hover:bg-white/10 rounded-full h-9 w-9"
            size="icon"
            variant="ghost"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>
        )}
      </div>
    </div>
  );
}

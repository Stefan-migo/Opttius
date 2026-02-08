"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trash2,
  Plus,
  Search,
  MessageSquare,
  Clock,
  Loader2,
  X,
  History,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatSession {
  id: string;
  title: string | null;
  provider: string;
  model: string | null;
  created_at: string;
  updated_at: string;
  last_message_preview?: string | null;
  message_count?: number | null;
}

interface ChatHistorySidebarProps {
  currentSessionId?: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onClose?: () => void;
  className?: string;
}

export function ChatHistorySidebar({
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onClose,
  className,
}: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredSessions(
        sessions.filter(
          (session) =>
            session.title?.toLowerCase().includes(query) ||
            session.last_message_preview?.toLowerCase().includes(query),
        ),
      );
    } else {
      setFilteredSessions(sessions);
    }
  }, [searchQuery, sessions]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/chat/history?limit=50");
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm("¿Estás seguro de que deseas eliminar esta conversación?")) {
      return;
    }

    try {
      setDeletingId(sessionId);
      const response = await fetch(
        `/api/admin/chat/history?sessionId=${sessionId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          onNewSession();
        }
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;

    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  };

  const getSessionTitle = (session: ChatSession) => {
    return session.title || "Nueva conversación";
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-white dark:bg-slate-950 shadow-2xl transition-all duration-300",
        className,
      )}
    >
      <div className="p-5 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <History className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Historial de Consultas
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5 text-slate-500" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={onNewSession}
            size="sm"
            className="flex-1 rounded-xl h-10 font-bold tracking-tight shadow-md hover:shadow-primary/20 transition-all font-sans"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva conversación
          </Button>
        </div>

        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Buscar en el historial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-primary/10 transition-all text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 pb-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Cargando sesiones...
            </p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {searchQuery ? "Sin resultados" : "Historial vacío"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 max-w-[200px] leading-relaxed">
              {searchQuery
                ? `No encontramos nada parecido a "${searchQuery}"`
                : "Tus conversaciones con el Experto IA aparecerán aquí."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                className={cn(
                  "group relative p-4 rounded-2xl cursor-pointer transition-all border duration-200 animate-in fade-in slide-in-from-bottom-1",
                  currentSessionId === session.id
                    ? "bg-primary/5 border-primary/20 shadow-sm"
                    : "bg-white dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 hover:border-primary/20 hover:shadow-md hover:shadow-slate-200/20 dark:hover:shadow-none hover:-translate-y-0.5",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          currentSessionId === session.id
                            ? "bg-primary animate-pulse"
                            : "bg-slate-300 dark:bg-slate-600",
                        )}
                      />
                      <h3
                        className={cn(
                          "text-sm font-bold truncate tracking-tight",
                          currentSessionId === session.id
                            ? "text-primary"
                            : "text-slate-800 dark:text-slate-200",
                        )}
                      >
                        {getSessionTitle(session)}
                      </h3>
                    </div>

                    {session.last_message_preview && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
                        {session.last_message_preview}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(session.updated_at)}</span>
                      </div>
                      {session.message_count !== null &&
                        session.message_count !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{session.message_count} msgs</span>
                          </div>
                        )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all",
                      "hover:bg-destructive/10 hover:text-destructive",
                    )}
                    onClick={(e) => handleDelete(session.id, e)}
                    disabled={deletingId === session.id}
                  >
                    {deletingId === session.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

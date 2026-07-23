"use client";

import { ChevronRight, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Organization { id: string; name: string; slug: string; }
interface Conversation { id: string; title: string | null; wa_id: string | null; organization_id: string | null; message_count: number | null; last_message_preview: string | null; updated_at: string; organization?: { name: string; slug: string } | null; }
interface ChatMessage { id: string; role: string; content: string; created_at: string; }

interface WhatsAppConversationsPanelProps {
  organizations: Organization[];
  filterOrgId: string;
  onFilterChange: (id: string) => void;
  conversations: Conversation[];
  conversationsLoading: boolean;
  selectedSessionId: string | null;
  onSessionSelect: (id: string | null) => void;
  messages: ChatMessage[];
  messagesLoading: boolean;
  onRefresh: () => void;
  formatDate: (date: string) => string;
}

export function WhatsAppConversationsPanel({
  organizations,
  filterOrgId,
  onFilterChange,
  conversations,
  conversationsLoading,
  selectedSessionId,
  onSessionSelect,
  messages,
  messagesLoading,
  onRefresh,
  formatDate,
}: WhatsAppConversationsPanelProps) {
  return (
    <Card className="admin-card">
      <CardHeader>
        <CardTitle>Conversaciones WhatsApp</CardTitle>
        <p className="text-sm text-muted-foreground">Historial de mensajes recibidos por canal WhatsApp</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <Label>Filtrar por organización</Label>
          <Select value={filterOrgId} onValueChange={onFilterChange}>
            <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={conversationsLoading} size="sm" variant="outline" onClick={onRefresh}>
            {conversationsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar"}
          </Button>
        </div>

        <div className="flex gap-4 min-h-[400px]">
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[500px]">
            {conversationsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No hay conversaciones</div>
            ) : (
              conversations.map((c) => (
                <div className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedSessionId === c.id ? "bg-epoch-primary/10 border-epoch-primary" : "hover:bg-muted/50"}`}
                  key={c.id} onClick={() => onSessionSelect(c.id)}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.wa_id ?? c.title ?? "Sin contacto"}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-1">{c.organization?.name ?? "—"} • {c.message_count ?? 0} mensajes</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.last_message_preview ? c.last_message_preview.length > 50 ? `${c.last_message_preview.slice(0, 50)}...` : c.last_message_preview : "—"} • {formatDate(c.updated_at)}</p>
                </div>
              ))
            )}
          </div>

          {selectedSessionId && (
            <div className="w-[400px] border rounded-lg flex flex-col">
              <div className="p-2 border-b flex items-center justify-between">
                <span className="font-medium">Mensajes</span>
                <Button size="icon" variant="ghost" onClick={() => onSessionSelect(null)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
                {messagesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  messages.map((m) => (
                    <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} key={m.id}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 ${m.role === "user" ? "bg-epoch-primary text-white" : "bg-muted"}`}>
                        <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                        <p className="text-xs opacity-70 mt-1">{formatDate(m.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

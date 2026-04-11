"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  Loader2,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface WhatsAppNumber {
  id: string;
  organization_id: string;
  phone_number_id: string;
  waba_id: string;
  display_phone_number: string | null;
  organization?: { name: string; slug: string } | null;
}

interface Conversation {
  id: string;
  title: string | null;
  wa_id: string | null;
  organization_id: string | null;
  message_count: number | null;
  last_message_preview: string | null;
  updated_at: string;
  organization?: { name: string; slug: string } | null;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export default function SaasWhatsAppPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [form, setForm] = useState({
    waba_id: "",
    phone_number_id: "",
    display_phone_number: "",
  });
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [filterOrgId, setFilterOrgId] = useState<string>("all");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch(
        "/api/admin/saas-management/organizations?limit=500",
      );
      const data = await res.json();
      if (res.ok && data.organizations) {
        setOrganizations(data.organizations);
        if (data.organizations.length > 0 && !selectedOrgId) {
          setSelectedOrgId(data.organizations[0].id);
        }
      }
    } catch {
      toast.error("Error al cargar organizaciones");
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/admin/saas-management/whatsapp/status");
      const data = await res.json();
      if (res.ok) {
        setNumbers(data.numbers || []);
      }
    } catch {
      toast.error("Error al cargar estado de WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    setConversationsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterOrgId && filterOrgId !== "all") {
        params.set("organization_id", filterOrgId);
      }
      const res = await fetch(
        `/api/admin/saas-management/whatsapp/conversations?${params}`,
      );
      const data = await res.json();
      if (res.ok) {
        setConversations(data.sessions || []);
      }
    } catch {
      toast.error("Error al cargar conversaciones");
    } finally {
      setConversationsLoading(false);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(
        `/api/admin/saas-management/whatsapp/conversations/${sessionId}/messages`,
      );
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
      }
    } catch {
      toast.error("Error al cargar mensajes");
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
    fetchStatus();
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [filterOrgId]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchMessages(selectedSessionId);
    } else {
      setMessages([]);
    }
  }, [selectedSessionId]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedOrgId ||
      !form.waba_id.trim() ||
      !form.phone_number_id.trim()
    ) {
      toast.error(
        "Selecciona organización e ingresa WABA ID y Phone Number ID",
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/saas-management/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: selectedOrgId,
          waba_id: form.waba_id.trim(),
          phone_number_id: form.phone_number_id.trim(),
          display_phone_number: form.display_phone_number.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al conectar");
        return;
      }
      toast.success(data.message);
      setForm({ waba_id: "", phone_number_id: "", display_phone_number: "" });
      fetchStatus();
    } catch {
      toast.error("Error al conectar WhatsApp");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          className="rounded-xl text-epoch-primary hover:bg-epoch-primary/10"
          size="icon"
          title="Volver al dashboard"
          variant="ghost"
          onClick={() => router.push("/admin/saas-management/dashboard")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
            WhatsApp Business
          </h1>
          <p className="text-muted-foreground mt-2">
            Configurar números y ver conversaciones del canal WhatsApp
          </p>
        </div>
      </div>

      {/* Configuración de números */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Configuración de números
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Asocia un número de WhatsApp a cada organización. El número
            principal de Opttius debe ir en la organización &quot;Opttius
            Platform&quot;.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-4" onSubmit={handleConnect}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org">Organización</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger id="org">
                    <SelectValue placeholder="Selecciona organización" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} ({org.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="waba_id">WABA ID (Business Account ID)</Label>
                <Input
                  id="waba_id"
                  placeholder="Ej: 123456789012345"
                  value={form.waba_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, waba_id: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number_id">Phone Number ID</Label>
                <Input
                  id="phone_number_id"
                  placeholder="Ej: 987654321098765"
                  value={form.phone_number_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone_number_id: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_phone_number">
                  Número mostrado (opcional)
                </Label>
                <Input
                  id="display_phone_number"
                  placeholder="+56912345678"
                  value={form.display_phone_number}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      display_phone_number: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <Button disabled={saving} type="submit">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Conectar WhatsApp
                </>
              )}
            </Button>
          </form>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : numbers.length > 0 ? (
            <div className="space-y-2">
              <h4 className="font-medium">Números configurados</h4>
              <div className="rounded-lg border divide-y">
                {numbers.map((n) => (
                  <div
                    className="flex items-center justify-between p-4"
                    key={n.id}
                  >
                    <div>
                      <p className="font-medium">
                        {n.display_phone_number || `ID: ${n.phone_number_id}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {n.organization?.name ?? "—"} | WABA: {n.waba_id}
                      </p>
                    </div>
                    <Badge className="gap-1" variant="default">
                      <CheckCircle className="h-3 w-3" />
                      Conectado
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              No hay números configurados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversaciones */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Conversaciones WhatsApp</CardTitle>
          <p className="text-sm text-muted-foreground">
            Historial de mensajes recibidos por canal WhatsApp
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Label>Filtrar por organización</Label>
            <Select value={filterOrgId} onValueChange={setFilterOrgId}>
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={conversationsLoading}
              size="sm"
              variant="outline"
              onClick={fetchConversations}
            >
              {conversationsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Actualizar"
              )}
            </Button>
          </div>

          <div className="flex gap-4 min-h-[400px]">
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[500px]">
              {conversationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No hay conversaciones
                </div>
              ) : (
                conversations.map((c) => (
                  <div
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedSessionId === c.id
                        ? "bg-epoch-primary/10 border-epoch-primary"
                        : "hover:bg-muted/50"
                    }`}
                    key={c.id}
                    onClick={() => setSelectedSessionId(c.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {c.wa_id ?? c.title ?? "Sin contacto"}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {c.organization?.name ?? "—"} • {c.message_count ?? 0}{" "}
                      mensajes
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.last_message_preview
                        ? c.last_message_preview.length > 50
                          ? `${c.last_message_preview.slice(0, 50)}...`
                          : c.last_message_preview
                        : "—"}{" "}
                      • {formatDate(c.updated_at)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {selectedSessionId && (
              <div className="w-[400px] border rounded-lg flex flex-col">
                <div className="p-2 border-b flex items-center justify-between">
                  <span className="font-medium">Mensajes</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSelectedSessionId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
                  {messagesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div
                        className={`flex ${
                          m.role === "user" ? "justify-end" : "justify-start"
                        }`}
                        key={m.id}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 ${
                            m.role === "user"
                              ? "bg-epoch-primary text-white"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {m.content}
                          </p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatDate(m.created_at)}
                          </p>
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
    </div>
  );
}

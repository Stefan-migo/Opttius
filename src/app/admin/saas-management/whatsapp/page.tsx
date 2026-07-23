"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { WhatsAppConnectionForm } from "./_components/WhatsAppConnectionForm";
import { WhatsAppConversationsPanel } from "./_components/WhatsAppConversationsPanel";

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

      <WhatsAppConnectionForm
        form={form}
        loading={loading}
        numbers={numbers}
        organizations={organizations}
        saving={saving}
        selectedOrgId={selectedOrgId}
        onFormChange={(data) => setForm((f) => ({ ...f, ...data }))}
        onSelectedOrgChange={setSelectedOrgId}
        onSubmit={handleConnect}
      />

      <WhatsAppConversationsPanel
        conversations={conversations}
        conversationsLoading={conversationsLoading}
        filterOrgId={filterOrgId}
        formatDate={formatDate}
        messages={messages}
        messagesLoading={messagesLoading}
        organizations={organizations}
        selectedSessionId={selectedSessionId}
        onFilterChange={setFilterOrgId}
        onRefresh={fetchConversations}
        onSessionSelect={setSelectedSessionId}
      />
    </div>
  );
}

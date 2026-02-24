"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppNumber {
  id: string;
  phone_number_id: string;
  waba_id: string;
  display_phone_number: string | null;
  created_at: string;
}

const OAUTH_SCOPES = "whatsapp_business_management,whatsapp_business_messaging";

export default function WhatsAppSettingsCard() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<{
    connected: boolean;
    numbers: WhatsAppNumber[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    waba_id: "",
    phone_number_id: "",
    display_phone_number: "",
  });

  useEffect(() => {
    const success = searchParams.get("whatsapp_success");
    const error = searchParams.get("whatsapp_error");
    if (success === "1") {
      toast.success("WhatsApp conectado correctamente con Meta");
    } else if (error) {
      const messages: Record<string, string> = {
        no_code: "No se recibió código de autorización",
        no_org: "No tienes organización asignada",
        config: "Configuración de Meta incompleta (App ID / Secret)",
        token_exchange: "Error al intercambiar código por token",
        me_failed: "Error al obtener datos de Meta",
        no_waba: "No se encontró cuenta de WhatsApp Business",
        no_phones: "No hay números de teléfono en tu cuenta",
        save_failed: "Error al guardar la configuración",
        internal: "Error interno. Intenta de nuevo.",
      };
      toast.error(messages[error] || `Error: ${error}`);
    }
  }, [searchParams]);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/admin/whatsapp/status");
      const data = await res.json();
      if (res.ok) setStatus(data);
    } catch {
      toast.error("Error al cargar estado de WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.waba_id.trim() || !form.phone_number_id.trim()) {
      toast.error("WABA ID y Phone Number ID son requeridos");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-admin-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando configuración de WhatsApp...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp Business
          </CardTitle>
          <p className="text-sm text-admin-text-tertiary">
            Conecta tu número de WhatsApp para que tus clientes puedan escribirte
            y recibir respuestas del asistente IA.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {status?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Conectado
                </Badge>
              </div>
              {status.numbers.map((n) => (
                <div
                  key={n.id}
                  className="rounded-lg border p-4 bg-admin-surface-secondary"
                >
                  <p className="font-medium">
                    {n.display_phone_number || `ID: ${n.phone_number_id}`}
                  </p>
                  <p className="text-xs text-admin-text-tertiary mt-1">
                    WABA: {n.waba_id} | Phone ID: {n.phone_number_id}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                No conectado
              </Badge>
            </div>
          )}

          <div className="space-y-4">
            {process.env.NEXT_PUBLIC_META_APP_ID && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const base = typeof window !== "undefined" ? window.location.origin : "";
                    const callback = `${base}/api/admin/whatsapp/oauth-callback`;
                    const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_META_APP_ID}&redirect_uri=${encodeURIComponent(callback)}&scope=${encodeURIComponent(OAUTH_SCOPES)}&response_type=code`;
                    window.location.href = url;
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Conectar con Meta (Embedded Signup)
                </Button>
                <p className="text-xs text-admin-text-tertiary mt-2">
                  Abre el flujo oficial de Meta para conectar tu número.
                </p>
              </div>
            )}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-admin-surface-primary px-2 text-admin-text-tertiary">
                  O ingresa manualmente
                </span>
              </div>
            </div>
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="waba_id">WABA ID (Business Account ID)</Label>
              <Input
                id="waba_id"
                value={form.waba_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, waba_id: e.target.value }))
                }
                placeholder="Ej: 123456789012345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number_id">Phone Number ID</Label>
              <Input
                id="phone_number_id"
                value={form.phone_number_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone_number_id: e.target.value }))
                }
                placeholder="Ej: 987654321098765"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_phone_number">
                Número mostrado (opcional)
              </Label>
              <Input
                id="display_phone_number"
                value={form.display_phone_number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, display_phone_number: e.target.value }))
                }
                placeholder="+56912345678"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : status?.connected ? (
                "Actualizar"
              ) : (
                "Conectar WhatsApp"
              )}
            </Button>
          </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instrucciones</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-admin-text-secondary space-y-3">
          <p>
            <strong>Paso 1:</strong> Crea una app en{" "}
            <a
              href="https://developers.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-epoch-primary underline"
            >
              Meta for Developers
            </a>{" "}
            y añade el producto WhatsApp Cloud API.
          </p>
          <p>
            <strong>Paso 2:</strong> Configura el webhook en Meta:{" "}
            <code className="bg-admin-surface-secondary px-1 rounded">
              {typeof window !== "undefined"
                ? `${window.location.origin}/api/webhooks/whatsapp`
                : "/api/webhooks/whatsapp"}
            </code>
          </p>
          <p>
            <strong>Paso 3:</strong>{" "}
            {process.env.NEXT_PUBLIC_META_APP_ID
              ? "Usa el botón «Conectar con Meta» para el flujo oficial, o ingresa manualmente el WABA ID y Phone Number ID desde el panel de Meta (WhatsApp &gt; API Setup)."
              : "Obtén el WABA ID y Phone Number ID desde el panel de Meta (WhatsApp &gt; API Setup) e ingrésalos arriba."}
          </p>
          <p>
            <strong>Paso 4:</strong> Configura la facturación en tu Business
            Manager de Meta. Meta te cobrará directamente según el volumen de
            mensajes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

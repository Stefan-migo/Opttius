"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export interface LeadEmailModalProps {
  lead: {
    id: string;
    email: string;
    full_name?: string | null;
    optica_name?: string | null;
    funnel_stage?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (leadId: string, subject: string, body: string) => Promise<void>;
}

const EMAIL_TEMPLATES = [
  {
    id: "followup",
    label: "Follow-up",
    subject: "Seguimiento - {{optica_name}}",
    body: `Hola {{first_name}},

Espero que estés bien. Me contacto contigo para hacer seguimiento a tu interés en Opttius.

¿Tienes alguna duda sobre la plataforma? ¿Te gustaría agendar una demostración personalizada?

Quedo atento a tu respuesta.

Saludos`,
  },
  {
    id: "proposal",
    label: "Propuesta",
    subject: "Propuesta comercial - {{optica_name}}",
    body: `Hola {{first_name}},

Gracias por tu interés en Opttius. Adjuntamos la propuesta comercial para {{optica_name}}.

La propuesta incluye:
- Acceso completo a la plataforma
- Capacitación personalizada
- Soporte técnico dedicado

¿Tienes alguna consulta sobre los términos?

Saludos`,
  },
  {
    id: "meeting",
    label: "Agendar reunión",
    subject: "Agendemos una reunión - {{optica_name}}",
    body: `Hola {{first_name}},

Nos encantaría mostrarte cómo Opttius puede transformar la gestión de tu óptica.

Tengo disponible los siguientes horarios esta semana:
- Lunes a viernes: 10:00 - 18:00 hrs

¿Cuál te funciona mejor?

Saludos`,
  },
  {
    id: "reminder",
    label: "Recordatorio demo",
    subject: "Tu demo de Opttius está lista",
    body: `Hola {{first_name}},

Tu período de prueba de Opttius está activo. Aquí tienes algunos recursos para comenzar:

📚 [Guía de inicio]
🎥 [Videos tutoriales]
💬 [Soporte en vivo]

¿Necesitas ayuda con algo específico?

Saludos`,
  },
];

export function LeadEmailModal({
  lead,
  open,
  onOpenChange,
  onSend,
}: LeadEmailModalProps) {
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const handleTemplateSelect = (templateId: string) => {
    const template = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      const firstName = lead?.full_name?.split(" ")[0] || "";
      setSubject(
        template.subject
          .replace("{{first_name}}", firstName)
          .replace("{{optica_name}}", lead?.optica_name || ""),
      );
      setBody(
        template.body
          .replace("{{first_name}}", firstName)
          .replace("{{optica_name}}", lead?.optica_name || ""),
      );
    }
  };

  const handleSend = async () => {
    if (!lead || !subject.trim() || !body.trim()) {
      toast.error("Por favor completa el asunto y el cuerpo del email");
      return;
    }

    setSending(true);
    try {
      await onSend(lead.id, subject, body);
      onOpenChange(false);
      setSubject("");
      setBody("");
      setSelectedTemplate(null);
    } catch (error) {
      toast.error("Error al enviar email");
    } finally {
      setSending(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0D1117] border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            Enviar Email a {lead.full_name || lead.email}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Selector */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">
              Plantilla
            </label>
            <div className="flex flex-wrap gap-2">
              {EMAIL_TEMPLATES.map((template) => (
                <Button
                  key={template.id}
                  variant={
                    selectedTemplate === template.id ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  {template.label}
                </Button>
              ))}
            </div>
          </div>

          {/* To */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-1 block">
              Para
            </label>
            <div className="flex items-center gap-2">
              <input
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white disabled:opacity-50"
                value={lead.email}
                disabled
              />
              {lead.funnel_stage && (
                <Badge variant="outline" className="text-white border-white/30">
                  {lead.funnel_stage}
                </Badge>
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-1 block">
              Asunto
            </label>
            <input
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white placeholder:text-white/30"
              placeholder="Asunto del email..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-1 block">
              Cuerpo del email
            </label>
            <Textarea
              className="min-h-[200px] bg-white/5 border-white/10 text-white placeholder:text-white/30"
              placeholder="Escribe el cuerpo del email..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              disabled={sending || !subject.trim() || !body.trim()}
              onClick={handleSend}
            >
              {sending ? "Enviando..." : "Enviar Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

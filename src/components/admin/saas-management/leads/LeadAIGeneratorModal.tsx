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

export interface LeadAIGeneratorModalProps {
  lead: {
    id: string;
    email: string;
    full_name?: string | null;
    optica_name?: string | null;
    funnel_stage?: string | null;
    lead_score?: number;
    priority_level?: string;
    notes?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (
    leadId: string,
    prompt: string,
  ) => Promise<{ subject: string; body: string }>;
  onSend: (leadId: string, subject: string, body: string) => Promise<void>;
}

const GENERATION_TYPES = [
  {
    id: "followup",
    label: "Follow-up",
    description: "Email de seguimiento después de contacto inicial",
    icon: "📬",
  },
  {
    id: "proposal",
    label: "Propuesta comercial",
    description: "Envío de propuesta o cotización",
    icon: "📄",
  },
  {
    id: "case_study",
    label: "Caso de éxito",
    description: "Compartir caso de éxito relevante",
    icon: "⭐",
  },
  {
    id: "reactivation",
    label: "Reactivación",
    description: "Reconectar con lead sin actividad",
    icon: "🔄",
  },
  {
    id: "custom",
    label: "Personalizado",
    description: "Generar email con instrucciones específicas",
    icon: "✏️",
  },
];

export function LeadAIGeneratorModal({
  lead,
  open,
  onOpenChange,
  onGenerate,
  onSend,
}: LeadAIGeneratorModalProps) {
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedSubject, setGeneratedSubject] = useState("");
  const [generatedBody, setGeneratedBody] = useState("");
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);

  const handleGenerate = async () => {
    if (!lead) return;

    setGenerating(true);
    try {
      let prompt = "";

      switch (selectedType) {
        case "followup":
          prompt = `Genera un email de seguimiento profesional para un lead llamado "${lead.full_name || "Cliente"}" de la óptica "${lead.optica_name || "una óptica"}" que está en la etapa "${lead.funnel_stage || "pendiente"}" del funnel de ventas. El lead tiene un score de ${lead.lead_score || 0}. El tono debe ser profesional pero cercano.`;
          break;
        case "proposal":
          prompt = `Genera un email de envío de propuesta comercial para un lead llamado "${lead.full_name || "Cliente"}" de la óptica "${lead.optica_name || "una óptica"}" que está en etapa de negociación. Incluye información sobre beneficios de Opttius para ópticas.`;
          break;
        case "case_story":
          prompt = `Genera un email que presente un caso de éxito relevante para una óptica llamada "${lead.optica_name || "una óptica"}". El tono debe ser profesional y convincente, destacando resultados measurable.`;
          break;
        case "reactivation":
          prompt = `Genera un email de reactivación para reconectar con un lead de "${lead.optica_name || "una óptica"}" que ha estado sin actividad. El tono debe ser cálido, no invasivo, ofreciendo valor.`;
          break;
        case "custom":
          prompt = customPrompt;
          break;
        default:
          toast.error("Por favor selecciona un tipo de generación");
          return;
      }

      const result = await onGenerate(lead.id, prompt);
      setGeneratedSubject(result.subject);
      setGeneratedBody(result.body);
    } catch (error) {
      toast.error("Error al generar email");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!lead || !generatedSubject.trim() || !generatedBody.trim()) return;

    setSending(true);
    try {
      await onSend(lead.id, generatedSubject, generatedBody);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error("Error al enviar email");
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSelectedType(null);
    setCustomPrompt("");
    setGeneratedSubject("");
    setGeneratedBody("");
    setShowCustomPrompt(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-[#0D1117] border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <span>🤖</span>
            Generar Email con IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lead Info */}
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                {lead.full_name || lead.email}
              </p>
              <p className="text-xs text-white/50">
                {lead.optica_name || "Sin óptica"}
              </p>
            </div>
            {lead.priority_level && (
              <Badge variant="outline" className="text-white border-white/30">
                {lead.priority_level}
              </Badge>
            )}
            {lead.lead_score !== undefined && lead.lead_score > 0 && (
              <Badge variant="outline" className="text-white border-white/30">
                Score: {lead.lead_score}
              </Badge>
            )}
          </div>

          {/* Generation Type Selection */}
          {!generatedSubject && (
            <>
              <div>
                <label className="text-sm font-medium text-white/70 mb-2 block">
                  ¿Qué tipo de email necesitas?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {GENERATION_TYPES.map((type) => (
                    <button
                      key={type.id}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedType === type.id
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                      onClick={() => {
                        setSelectedType(type.id);
                        setShowCustomPrompt(type.id === "custom");
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{type.icon}</span>
                        <span className="text-sm font-medium text-white">
                          {type.label}
                        </span>
                      </div>
                      <p className="text-xs text-white/50">
                        {type.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt Input */}
              {showCustomPrompt && (
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">
                    Describe qué necesitas
                  </label>
                  <Textarea
                    className="min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    placeholder="Ej: Genera un email para..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                  />
                </div>
              )}

              {/* Generate Button */}
              <div className="flex justify-end">
                <Button
                  disabled={
                    !selectedType ||
                    generating ||
                    (selectedType === "custom" && !customPrompt.trim())
                  }
                  onClick={handleGenerate}
                >
                  {generating ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Generando...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🤖</span>
                      Generar con IA
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Generated Result */}
          {generatedSubject && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-sm text-emerald-400">
                  ✓ Email generado correctamente
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-white/70 mb-1 block">
                  Asunto
                </label>
                <input
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white"
                  value={generatedSubject}
                  onChange={(e) => setGeneratedSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-white/70 mb-1 block">
                  Cuerpo del email
                </label>
                <Textarea
                  className="min-h-[200px] bg-white/5 border-white/10 text-white"
                  value={generatedBody}
                  onChange={(e) => setGeneratedBody(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedSubject("");
                    setGeneratedBody("");
                  }}
                >
                  Regenerar
                </Button>
                <div className="flex-1" />
                <Button variant="ghost" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  disabled={
                    sending || !generatedSubject.trim() || !generatedBody.trim()
                  }
                  onClick={handleSend}
                >
                  {sending ? "Enviando..." : "Enviar Email"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

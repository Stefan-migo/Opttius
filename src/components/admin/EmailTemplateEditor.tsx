"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, X, Eye, Code, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  replaceTemplateVariables,
  getDefaultVariables,
} from "@/lib/email/template-utils";
import { getVariablesForEditor } from "@/lib/email/ai-template-variables";

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  content: string;
  variables: string[];
  is_active: boolean;
  is_system?: boolean;
}

interface EmailTemplateEditorProps {
  template?: EmailTemplate;
  mode?: "organization" | "saas";
  organizationId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  /** Tipo pre-seleccionado al crear (ej. desde placeholder) */
  initialType?: string;
}

// Predefined email templates
const emailTemplates = {
  simple: {
    name: "Plantilla Simple",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1A2B23; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #fff; }
    .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{company_name}}</h1>
    </div>
    <div class="content">
      <p>Hola {{customer_name}},</p>
      <p>Tu mensaje aquí...</p>
    </div>
    <div class="footer">
      <p>{{company_name}} | {{support_email}}</p>
    </div>
  </div>
</body>
</html>`,
  },
  modern: {
    name: "Plantilla Moderna",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1A2B23 0%, #2C3E33 100%); color: white; padding: 30px 20px; text-align: center; }
    .content { padding: 30px; }
    .button { display: inline-block; padding: 12px 24px; background: #C5A059; color: #1A1A1A; text-decoration: none; border-radius: 0; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">{{company_name}}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">{{organization_name}}</p>
    </div>
    <div class="content">
      <h2>Hola {{customer_name}},</h2>
      <p>Tu mensaje aquí...</p>
      <a href="#" class="button">Acción</a>
    </div>
    <div class="footer">
      <p><strong>{{company_name}}</strong><br>{{support_email}}</p>
    </div>
  </div>
</body>
</html>`,
  },
  minimal: {
    name: "Plantilla Minimalista",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 40px 20px; background: #fff; }
    .container { max-width: 600px; margin: 0 auto; }
    .content { padding: 20px 0; border-top: 2px solid #1A2B23; border-bottom: 2px solid #1A2B23; margin: 20px 0; }
    .signature { margin-top: 40px; font-style: italic; }
  </style>
</head>
<body>
  <div class="container">
    <h1 style="color: #1A2B23; margin-bottom: 30px;">{{company_name}}</h1>
    <div class="content">
      <p>Hola {{customer_name}},</p>
      <p>Tu mensaje aquí...</p>
    </div>
    <div class="signature">
      <p>Con amor y luz,<br>El equipo de {{company_name}}</p>
    </div>
  </div>
</body>
</html>`,
  },
};

export default function EmailTemplateEditor({
  template,
  mode = "organization",
  organizationId,
  open,
  onOpenChange,
  onSave,
  initialType,
}: EmailTemplateEditorProps) {
  const apiBase =
    mode === "saas"
      ? "/api/admin/saas-management/email-templates"
      : "/api/admin/system/email-templates";
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showAiAssistDialog, setShowAiAssistDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "custom",
    subject: "",
    content: "",
    is_active: true,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || "",
        type: template.type || "custom",
        subject: template.subject || "",
        content: template.content || "",
        is_active: template.is_active ?? true,
      });
    } else {
      setFormData({
        name: "",
        type: initialType || "custom",
        subject: "",
        content: emailTemplates.modern.html,
        is_active: true,
      });
    }
  }, [template, open, initialType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.subject || !formData.content) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    try {
      setLoading(true);

      const submitData = {
        ...formData,
      };

      if (template) {
        // Update existing template
        const response = await fetch(`${apiBase}/${template.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Error al actualizar plantilla");
        }

        toast.success("Plantilla actualizada exitosamente");
      } else {
        // Create new template
        const response = await fetch(apiBase, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Error al crear plantilla");
        }

        toast.success("Plantilla creada exitosamente");
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al guardar plantilla",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAiAssist = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Describe lo que quieres que genere la IA");
      return;
    }
    try {
      setAiLoading(true);
      const res = await fetch("/api/admin/email-templates/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          organizationId: organizationId || null,
          userPrompt: aiPrompt.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al generar plantilla");
      }
      if (data.subject || data.content) {
        setFormData((prev) => ({
          ...prev,
          subject: data.subject || prev.subject,
          content: data.content || prev.content,
        }));
        setShowAiAssistDialog(false);
        setAiPrompt("");
        toast.success("Plantilla generada. Puedes editarla antes de guardar.");
      } else {
        toast.error(data.error || "No se pudo generar la plantilla");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al generar plantilla",
      );
    } finally {
      setAiLoading(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + `{{${variable}}}` + after;
      setFormData({ ...formData, content: newText });

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + variable.length + 4,
          start + variable.length + 4,
        );
      }, 0);
    }
  };

  const applyTemplate = (templateKey: keyof typeof emailTemplates) => {
    const selectedTemplate = emailTemplates[templateKey];
    setFormData({ ...formData, content: selectedTemplate.html });
    toast.success(`Plantilla "${selectedTemplate.name}" aplicada`);
  };

  // Get preview HTML with variables replaced
  const getPreviewHtml = (): string => {
    const defaultVars = getDefaultVariables();
    const previewVars = {
      ...defaultVars,
      customer_name: "María González",
      order_number: "ORD-12345",
      order_total: "$15.000,00",
      order_date: "15 de enero de 2025",
      order_items:
        "<div>Producto 1 x 2 - $10.000</div><div>Producto 2 x 1 - $5.000</div>",
      tracking_number: "ABC123456789",
      carrier: "Correo Argentino",
      estimated_delivery: "22 de enero de 2025",
      delivery_date: "20 de enero de 2025",
      payment_method: "Tarjeta de Crédito",
      transaction_id: "MP-123456789",
      amount: "$15.000,00",
      membership_tier: "Transformación Completa",
      membership_start_date: "15 de enero de 2025",
      access_url: "https://opttius.com/mi-cuenta",
      reset_link: "https://opttius.com/reset-password?token=xxx",
      reset_url: "https://opttius.com/reset-password?token=xxx",
      account_url: "https://opttius.com/mi-cuenta",
      renewal_url: "https://opttius.com/membresias",
      days_remaining: "15",
      low_stock_products:
        "<div>Producto A - Stock: 3</div><div>Producto B - Stock: 2</div>",
    };

    return replaceTemplateVariables(formData.content, previewVars);
  };

  const getPreviewSubject = (): string => {
    const previewVars = {
      ...getDefaultVariables(),
      customer_name: "María González",
      order_number: "ORD-12345",
      order_total: "$15.000,00",
      order_date: "15 de enero de 2025",
    };
    return replaceTemplateVariables(formData.subject, previewVars);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-7xl max-h-[90vh] sm:max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base sm:text-lg">
              {template ? "Editar Plantilla" : "Nueva Plantilla"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {template
                ? "Modifica la plantilla de email. Los cambios se aplicarán automáticamente en los próximos emails."
                : "Crea una nueva plantilla de email para el sistema"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Plantilla *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ej: Confirmación de Pedido"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <p className="text-xs text-muted-foreground">
                  Los tipos con trigger automático se envían cuando ocurre el
                  evento correspondiente. &quot;Personalizado&quot; y
                  &quot;Marketing&quot; requieren envío manual.
                </p>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                  disabled={!!template?.is_system}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mode === "saas" ? (
                      <>
                        <SelectItem value="saas_welcome">
                          Bienvenida SaaS
                        </SelectItem>
                        <SelectItem value="saas_trial_ending">
                          Fin de Prueba
                        </SelectItem>
                        <SelectItem value="saas_subscription_success">
                          Suscripción Exitosa
                        </SelectItem>
                        <SelectItem value="saas_payment_failed">
                          Pago Fallido SaaS
                        </SelectItem>
                        <SelectItem value="saas_payment_reminder">
                          Recordatorio Pago
                        </SelectItem>
                        <SelectItem value="saas_security_alert">
                          Alerta de Seguridad
                        </SelectItem>
                        <SelectItem value="saas_onboarding">
                          Onboarding
                        </SelectItem>
                        <SelectItem value="saas_maintenance">
                          Mantenimiento Programado
                        </SelectItem>
                        <SelectItem value="saas_support_ticket_created">
                          Ticket Creado
                        </SelectItem>
                        <SelectItem value="saas_support_new_response">
                          Nueva Respuesta
                        </SelectItem>
                        <SelectItem value="saas_support_ticket_assigned">
                          Ticket Asignado
                        </SelectItem>
                        <SelectItem value="saas_support_ticket_resolved">
                          Ticket Resuelto
                        </SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="order_confirmation">
                          Confirmación de Pedido
                        </SelectItem>
                        <SelectItem value="order_shipped">
                          Pedido Enviado
                        </SelectItem>
                        <SelectItem value="order_delivered">
                          Pedido Entregado
                        </SelectItem>
                        <SelectItem value="password_reset">
                          Restablecer Contraseña
                        </SelectItem>
                        <SelectItem value="account_welcome">
                          Bienvenida
                        </SelectItem>
                        <SelectItem value="appointment_confirmation">
                          Confirmación de Cita
                        </SelectItem>
                        <SelectItem value="appointment_reminder">
                          Recordatorio de Cita (24h)
                        </SelectItem>
                        <SelectItem value="appointment_reminder_2h">
                          Recordatorio de Cita (2h)
                        </SelectItem>
                        <SelectItem value="appointment_cancelation">
                          Cancelación de Cita
                        </SelectItem>
                        <SelectItem value="appointment_rescheduled">
                          Cita Reprogramada
                        </SelectItem>
                        <SelectItem value="appointment_follow_up_reminder">
                          Recordatorio de Control
                        </SelectItem>
                        <SelectItem value="prescription_expiring">
                          Receta por Vencer
                        </SelectItem>
                        <SelectItem value="quote_sent">
                          Presupuesto Enviado
                        </SelectItem>
                        <SelectItem value="quote_expiring">
                          Presupuesto Por Expirar
                        </SelectItem>
                        <SelectItem value="work_order_ready">
                          Lentes Listo para Retiro
                        </SelectItem>
                        <SelectItem value="work_order_delivered">
                          Entrega Completada + Encuesta
                        </SelectItem>
                        <SelectItem value="payment_success">
                          Pago Exitoso
                        </SelectItem>
                        <SelectItem value="payment_failed">
                          Pago Fallido
                        </SelectItem>
                        <SelectItem value="low_stock_alert">
                          Alerta de Stock Bajo
                        </SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Asunto *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="Ej: Confirmación de tu pedido {{order_number}}"
                required
              />
              <p className="text-xs text-muted-foreground">
                Puedes usar variables como {"{{customer_name}}"},{" "}
                {"{{order_number}}"}, etc.
              </p>
            </div>

            {/* Content Editor */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Contenido HTML del Email *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showPreview ? "Ocultar" : "Mostrar"} Vista Previa
                  </Button>
                </div>
              </div>

              <div
                className={`grid gap-4 ${showPreview ? "grid-cols-2" : "grid-cols-1"}`}
              >
                {/* Editor Section */}
                <div className="space-y-2">
                  <div className="border rounded-lg p-2 bg-muted/50">
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <Select
                        onValueChange={(v) =>
                          applyTemplate(v as keyof typeof emailTemplates)
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Aplicar plantilla" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {emailTemplates.simple.name}
                            </div>
                          </SelectItem>
                          <SelectItem value="modern">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              {emailTemplates.modern.name}
                            </div>
                          </SelectItem>
                          <SelectItem value="minimal">
                            <div className="flex items-center gap-2">
                              <Code className="h-4 w-4" />
                              {emailTemplates.minimal.name}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAiAssistDialog(true)}
                        className="gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Asistir con IA
                      </Button>
                    </div>
                    <Textarea
                      ref={textareaRef}
                      id="content"
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      placeholder="<html><body>...</body></html>"
                      rows={20}
                      className="font-mono text-sm"
                      required
                    />
                  </div>

                  {/* Variables Panel */}
                  <div className="border rounded-lg p-3 bg-muted/30">
                    <Label className="text-sm font-semibold mb-2 block">
                      Variables Disponibles
                    </Label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {getVariablesForEditor(formData.type).map((varItem) => (
                        <Badge
                          key={varItem.key}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => insertVariable(varItem.key)}
                          title={varItem.description}
                        >
                          {varItem.label}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Haz clic en una variable para insertarla en el contenido
                      HTML
                    </p>
                  </div>
                </div>

                {/* Preview Section */}
                {showPreview && (
                  <div className="space-y-2">
                    <Label>Vista Previa en Tiempo Real</Label>
                    <div className="border rounded-lg p-4 bg-white max-h-[600px] overflow-y-auto">
                      <div className="mb-4 pb-4 border-b">
                        <p className="text-sm font-semibold text-muted-foreground mb-1">
                          Asunto:
                        </p>
                        <p className="text-base font-medium">
                          {getPreviewSubject()}
                        </p>
                      </div>
                      <div
                        className="email-preview [&_img]:max-w-full [&_img]:h-auto [&_table]:w-full [&_table]:border-collapse [&_a]:text-[#8B4513] [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                        style={{
                          fontFamily: "Arial, sans-serif",
                          lineHeight: "1.6",
                          maxWidth: "100%",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Plantilla Activa</Label>
                <p className="text-xs text-muted-foreground">
                  Solo las plantillas activas se usarán para enviar emails
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Guardando..." : "Guardar Plantilla"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAiAssistDialog} onOpenChange={setShowAiAssistDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Asistir con IA
            </DialogTitle>
            <DialogDescription>
              Describe lo que quieres que genere la IA (ej. &quot;Plantilla de
              bienvenida para clientes nuevos&quot;). Usará el tipo de plantilla
              actual y las variables disponibles.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ej: Plantilla de bienvenida cálida para clientes nuevos que acaban de registrarse..."
            rows={4}
            className="resize-none"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAiAssistDialog(false);
                setAiPrompt("");
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleAiAssist} disabled={aiLoading}>
              {aiLoading ? "Generando..." : "Generar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

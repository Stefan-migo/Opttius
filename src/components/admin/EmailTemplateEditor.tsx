"use client";

import { Save, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getDefaultVariables,
  replaceTemplateVariables,
} from "@/lib/email/template-utils";

import { EmailTemplateEditorAiDialog } from "./EmailTemplateEditorAiDialog";
import { EmailTemplateEditorBasicInfo } from "./EmailTemplateEditorBasicInfo";
import { EmailTemplateEditorContent } from "./EmailTemplateEditorContent";

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
  const [aiLoading, setAiLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "custom",
    subject: "",
    content: "",
    is_active: true,
  });

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

  const handleAiAssist = async (prompt: string) => {
    try {
      setAiLoading(true);
      const res = await fetch("/api/admin/email-templates/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          organizationId: organizationId || null,
          userPrompt: prompt,
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

          <form className="space-y-4" onSubmit={handleSubmit}>
            <EmailTemplateEditorBasicInfo
              mode={mode}
              formData={{ name: formData.name, type: formData.type }}
              isSystem={!!template?.is_system}
              onChange={(field, value) =>
                setFormData((prev) => ({ ...prev, [field]: value }))
              }
            />

            <EmailTemplateEditorContent
              formType={formData.type}
              subject={formData.subject}
              content={formData.content}
              showPreview={showPreview}
              onSubjectChange={(value) =>
                setFormData((prev) => ({ ...prev, subject: value }))
              }
              onContentChange={(value) =>
                setFormData((prev) => ({ ...prev, content: value }))
              }
              onTogglePreview={() => setShowPreview(!showPreview)}
              onTemplateApply={(key) =>
                applyTemplate(key as keyof typeof emailTemplates)
              }
              onAiAssist={() => setShowAiAssistDialog(true)}
              getPreviewSubject={getPreviewSubject}
              getPreviewHtml={getPreviewHtml}
            />

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Plantilla Activa</Label>
                <p className="text-xs text-muted-foreground">
                  Solo las plantillas activas se usarán para enviar emails
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                id="is_active"
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            <DialogFooter>
              <Button
                disabled={loading}
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button disabled={loading} type="submit">
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Guardando..." : "Guardar Plantilla"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <EmailTemplateEditorAiDialog
        open={showAiAssistDialog}
        loading={aiLoading}
        onOpenChange={setShowAiAssistDialog}
        onGenerate={handleAiAssist}
      />
    </>
  );
}

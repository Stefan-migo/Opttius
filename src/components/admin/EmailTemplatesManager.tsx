"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Mail,
  Plus,
  Edit,
  Trash2,
  Send,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import EmailTemplateEditor from "./EmailTemplateEditor";

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  content: string;
  variables: string[];
  is_active: boolean;
  is_system: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  template_group?: string | null;
}

interface EmailTemplatesManagerProps {
  mode?: "organization" | "saas";
  organizationId?: string;
}

const ESSENTIAL_TYPES = [
  "appointment_confirmation",
  "appointment_reminder",
  "appointment_reminder_2h",
  "appointment_cancelation",
  "appointment_rescheduled",
  "appointment_follow_up_reminder",
  "prescription_expiring",
  "low_stock_alert",
  "order_confirmation",
  "quote_sent",
  "work_order_ready",
  "order_delivered",
  "quote_expiring",
  "account_welcome",
] as const;

const TYPE_DESCRIPTIONS: Record<string, string> = {
  appointment_confirmation: "Se envía automáticamente al crear la cita",
  appointment_reminder: "Se envía automáticamente 24h antes (cron diario)",
  appointment_reminder_2h: "Se envía automáticamente 2h antes (cron cada hora)",
  appointment_cancelation: "Se envía cuando se cancela una cita",
  appointment_rescheduled:
    "Se envía cuando se reprograma una cita (cambio fecha/hora)",
  appointment_follow_up_reminder:
    "Se envía 7 días antes de follow_up_date (Requiere Seguimiento)",
  prescription_expiring:
    "Se envía 30 días antes de que venza la receta (cron diario)",
  low_stock_alert:
    "Se envía automáticamente al email de la óptica (contacto/reply-to)",
  order_confirmation: "Se envía automáticamente al crear la orden",
  quote_sent: "Se envía automáticamente al enviar el presupuesto",
  work_order_ready:
    "Se envía automáticamente cuando los lentes están listos para retiro",
  order_delivered:
    "Se envía automáticamente al confirmar entrega (requiere flujo de entrega)",
  quote_expiring: "Se envía automáticamente 48h antes de expirar (cron diario)",
  account_welcome: "Se envía automáticamente al crear cliente con email",
};

export default function EmailTemplatesManager({
  mode = "organization",
  organizationId,
}: EmailTemplatesManagerProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] =
    useState<EmailTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [createInitialType, setCreateInitialType] = useState<
    string | undefined
  >();

  useEffect(() => {
    fetchTemplates();
  }, [typeFilter, groupFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== "all") {
        params.set("type", typeFilter);
      }
      if (mode === "saas") {
        params.set("category", "saas");
        if (groupFilter !== "all") {
          params.set("template_group", groupFilter);
        }
      }

      const apiUrl =
        mode === "saas"
          ? `/api/admin/saas-management/email-templates?${params}`
          : `/api/admin/system/email-templates?${params}`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await response.json();
      setTemplates(data.templates ?? data.data ?? []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Error al cargar plantillas");
    } finally {
      setLoading(false);
    }
  };

  const templatesApiBase =
    mode === "saas"
      ? "/api/admin/saas-management/email-templates"
      : "/api/admin/system/email-templates";

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`${templatesApiBase}/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !template.is_active }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const details =
          errBody?.details ?? errBody?.error ?? response.statusText;
        throw new Error(details);
      }

      toast.success(
        `Plantilla ${!template.is_active ? "activada" : "desactivada"}`,
      );
      fetchTemplates();
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Error al actualizar plantilla";
      console.error("Error updating template:", error);
      toast.error(msg);
    }
  };

  const handleDeleteClick = (template: EmailTemplate) => {
    if (template.is_system) {
      toast.error("No se pueden eliminar plantillas del sistema");
      return;
    }
    setTemplateToDelete(template);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(
        `${templatesApiBase}/${templateToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      toast.success("Plantilla eliminada");
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Error al eliminar plantilla");
    } finally {
      setDeleting(false);
    }
  };

  const handleTestEmail = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTestEmail("");
    setShowTestDialog(true);
  };

  const confirmTestEmail = async () => {
    if (!selectedTemplate || !testEmail) {
      toast.error("Por favor ingresa un email válido");
      return;
    }

    try {
      setTesting(selectedTemplate.id);
      const response = await fetch(
        `${templatesApiBase}/${selectedTemplate.id}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testEmail }),
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || "Email de prueba enviado");
        setShowTestDialog(false);
        setTestEmail("");
      } else {
        toast.error(data.error || "Error al enviar email de prueba");
      }
    } catch (error) {
      console.error("Error testing email:", error);
      toast.error("Error al enviar email de prueba");
    } finally {
      setTesting(null);
    }
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      appointment_confirmation: "Confirmación de Cita",
      appointment_reminder: "Recordatorio de Cita (24h)",
      appointment_reminder_2h: "Recordatorio de Cita (2h)",
      appointment_cancelation: "Cancelación de Cita",
      appointment_rescheduled: "Cita Reprogramada",
      appointment_follow_up_reminder: "Recordatorio de Control",
      prescription_expiring: "Receta por Vencer",
      low_stock_alert: "Alerta de Stock Bajo",
      order_confirmation: "Confirmación de Orden",
      quote_sent: "Presupuesto Enviado",
      work_order_ready: "Lentes listo para retiro",
      order_delivered: "Confirmación de entrega",
      quote_expiring: "Presupuesto por expirar",
      account_welcome: "Bienvenida de cuenta",
      order_shipped: "Pedido Enviado",
      password_reset: "Restablecer Contraseña",
      membership_welcome: "Bienvenida Membresía",
      membership_reminder: "Recordatorio Membresía",
      marketing: "Marketing",
      custom: "Personalizado",
      saas_welcome: "Bienvenida SaaS",
      saas_trial_ending: "Fin de Prueba",
      saas_subscription_success: "Suscripción Exitosa",
      saas_subscription_failed: "Error Suscripción",
      saas_payment_reminder: "Recordatorio Pago",
      saas_onboarding_step_1: "Onboarding Paso 1",
      saas_support_ticket_created: "Ticket Creado",
      saas_support_new_response: "Nueva Respuesta",
      saas_support_ticket_assigned: "Ticket Asignado",
      saas_support_ticket_resolved: "Ticket Resuelto",
      demo_approved: "Demo Aprobada",
      demo_expiring: "Demo por Vencer",
      demo_expired: "Demo Expirada",
      demo_post_meeting_followup: "Post-Reunión Followup",
    };
    return labels[type] || type;
  };

  // En modo organization: mostrar todos los ESSENTIAL_TYPES, con placeholder si no existe plantilla
  const templatesFilteredByEssential =
    mode === "organization"
      ? templates.filter((t) => ESSENTIAL_TYPES.includes(t.type as any))
      : templates;

  const templatesByType = new Map(
    templatesFilteredByEssential.map((t) => [t.type, t]),
  );

  const displayRows =
    mode === "organization"
      ? ESSENTIAL_TYPES.filter(
          (type) => typeFilter === "all" || type === typeFilter,
        ).map((type) => ({
          type,
          template: templatesByType.get(type) ?? null,
        }))
      : templatesFilteredByEssential
          .filter((t) => typeFilter === "all" || t.type === typeFilter)
          .map((template) => ({ type: template.type, template }));

  const filteredTemplates = displayRows;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - reorganizado en filas para móvil */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-epoch-primary font-display">
            Plantillas de Email
          </h2>
          <p className="text-xs sm:text-sm text-epoch-primary/80 mt-1">
            Gestiona las plantillas de email del sistema
          </p>
        </div>
        <Button
          onClick={() => {
            setCreateInitialType(undefined);
            setShowCreateDialog(true);
          }}
          className="rounded-xl min-h-[44px] w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2 shrink-0" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-4 sm:items-center flex-wrap">
            {mode === "saas" && (
              <>
                <Label className="text-xs sm:text-sm">Grupo:</Label>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="w-full sm:w-[200px] rounded-xl min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="funnel">Funnel</SelectItem>
                    <SelectItem value="support">Soporte</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            <Label className="text-xs sm:text-sm">Filtrar por tipo:</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[250px] rounded-xl min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {mode === "organization" &&
                  ESSENTIAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getTypeLabel(type)}
                    </SelectItem>
                  ))}
                {mode === "saas" && (
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
                    <SelectItem value="demo_approved">Demo Aprobada</SelectItem>
                    <SelectItem value="demo_expiring">
                      Demo por Vencer
                    </SelectItem>
                    <SelectItem value="demo_expired">Demo Expirada</SelectItem>
                    <SelectItem value="demo_post_meeting_followup">
                      Post-Reunión Followup
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card className="rounded-xl border border-border overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 sm:p-8 text-center text-epoch-primary/80 text-sm">
              Cargando...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-epoch-primary/80 text-sm">
              No se encontraron plantillas
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">
                      Nombre
                    </TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">
                      Tipo
                    </TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm hidden md:table-cell">
                      Envío
                    </TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">
                      Asunto
                    </TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">
                      Estado
                    </TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm hidden sm:table-cell">
                      Uso
                    </TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map(({ type, template }) => (
                    <TableRow
                      key={type}
                      className={
                        template && !template.is_active
                          ? "opacity-70"
                          : undefined
                      }
                    >
                      <TableCell className="font-medium text-xs sm:text-sm">
                        <span className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                          <span className="truncate">
                            {template?.name ?? (
                              <span className="text-epoch-primary/70 italic">
                                Sin plantilla
                              </span>
                            )}
                          </span>
                          {template && !template.is_active && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] sm:text-xs w-fit shrink-0"
                            >
                              Inactiva
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] sm:text-xs"
                        >
                          {getTypeLabel(type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] hidden md:table-cell">
                        {mode === "organization" && TYPE_DESCRIPTIONS[type] ? (
                          <span
                            className="text-xs text-epoch-primary/70"
                            title={TYPE_DESCRIPTIONS[type]}
                          >
                            {TYPE_DESCRIPTIONS[type]}
                          </span>
                        ) : (
                          <span className="text-xs text-epoch-primary/70">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[120px] sm:max-w-xs truncate text-xs sm:text-sm">
                        {template?.subject ?? "—"}
                      </TableCell>
                      <TableCell>
                        {template ? (
                          <Switch
                            checked={template.is_active}
                            onCheckedChange={() => handleToggleActive(template)}
                          />
                        ) : (
                          <span className="text-epoch-primary/70">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                        {template?.usage_count ?? 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {template ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setShowPreviewDialog(true);
                                }}
                                title="Ver plantilla"
                                className="h-9 w-9 sm:h-9 sm:w-9 p-0 rounded-xl"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setShowEditDialog(true);
                                }}
                                title="Editar plantilla"
                                className="h-9 w-9 sm:h-9 sm:w-9 p-0 rounded-xl"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTestEmail(template)}
                                disabled={testing === template.id}
                                title="Enviar email de prueba"
                                className="h-9 w-9 sm:h-9 sm:w-9 p-0 rounded-xl"
                              >
                                <Send
                                  className={`h-4 w-4 ${testing === template.id ? "animate-spin" : ""}`}
                                />
                              </Button>
                              {!template.is_system && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(template)}
                                  className="text-red-600 h-9 w-9 sm:h-9 sm:w-9 p-0 rounded-xl"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setCreateInitialType(type);
                                setShowCreateDialog(true);
                              }}
                              className="rounded-xl min-h-[44px] text-xs sm:text-sm"
                            >
                              <Plus className="h-4 w-4 mr-1 shrink-0" />
                              <span className="truncate">Crear plantilla</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {showEditDialog && selectedTemplate && (
        <EmailTemplateEditor
          template={selectedTemplate}
          mode={mode}
          organizationId={organizationId}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSave={() => {
            setShowEditDialog(false);
            fetchTemplates();
          }}
        />
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <EmailTemplateEditor
          mode={mode}
          organizationId={organizationId}
          open={showCreateDialog}
          onOpenChange={(open) => {
            if (!open) setCreateInitialType(undefined);
            setShowCreateDialog(open);
          }}
          onSave={() => {
            setShowCreateDialog(false);
            setCreateInitialType(undefined);
            fetchTemplates();
          }}
          initialType={createInitialType}
        />
      )}

      {/* Preview Dialog */}
      {showPreviewDialog && selectedTemplate && (
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTemplate.name}</DialogTitle>
              <DialogDescription>
                Vista previa de la plantilla
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Asunto:</Label>
                <p className="font-medium">{selectedTemplate.subject}</p>
              </div>
              <div>
                <Label>Contenido:</Label>
                <div
                  className="border rounded-lg p-4 bg-admin-bg-primary"
                  dangerouslySetInnerHTML={{ __html: selectedTemplate.content }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPreviewDialog(false)}
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar plantilla</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la plantilla &quot;
              {templateToDelete?.name}&quot;? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setTemplateToDelete(null);
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      {showTestDialog && selectedTemplate && (
        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Enviar Email de Prueba
              </DialogTitle>
              <DialogDescription>
                Envía un email de prueba de la plantilla &quot;
                {selectedTemplate.name}&quot; a una dirección de correo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-email">Email de destino *</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="ejemplo@email.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  El email se enviará con variables de ejemplo reemplazadas.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTestDialog(false);
                  setTestEmail("");
                }}
                disabled={testing === selectedTemplate.id}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmTestEmail}
                disabled={!testEmail || testing === selectedTemplate.id}
              >
                {testing === selectedTemplate.id ? (
                  <>
                    <Send className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Prueba
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

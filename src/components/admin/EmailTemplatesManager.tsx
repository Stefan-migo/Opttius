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
}

interface EmailTemplatesManagerProps {
  mode?: "organization" | "saas";
  organizationId?: string;
}

export default function EmailTemplatesManager({
  mode = "organization",
  organizationId,
}: EmailTemplatesManagerProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
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

  useEffect(() => {
    fetchTemplates();
  }, [typeFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== "all") {
        params.set("type", typeFilter);
      }
      if (mode === "saas") {
        params.set("category", "saas");
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
        throw new Error("Failed to update template");
      }

      toast.success(
        `Plantilla ${!template.is_active ? "activada" : "desactivada"}`,
      );
      fetchTemplates();
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Error al actualizar plantilla");
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
      order_confirmation: "Confirmación de Pedido",
      order_shipped: "Pedido Enviado",
      order_delivered: "Pedido Entregado",
      password_reset: "Restablecer Contraseña",
      account_welcome: "Bienvenida",
      membership_welcome: "Bienvenida Membresía",
      membership_reminder: "Recordatorio Membresía",
      low_stock_alert: "Alerta de Stock Bajo",
      marketing: "Marketing",
      custom: "Personalizado",
      // SaaS types
      saas_welcome: "Bienvenida SaaS",
      saas_trial_ending: "Fin de Prueba",
      saas_subscription_success: "Suscripción Exitosa",
      saas_subscription_failed: "Error Suscripción",
      saas_payment_reminder: "Recordatorio Pago",
      saas_onboarding_step_1: "Onboarding Paso 1",
    };
    return labels[type] || type;
  };

  const filteredTemplates = templates.filter(
    (t) => typeFilter === "all" || t.type === typeFilter,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-azul-profundo">
            Plantillas de Email
          </h2>
          <p className="text-tierra-media">
            Gestiona las plantillas de email del sistema
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Filters */}
      <Card
        className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: "var(--admin-border-primary)" }}
      >
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Label>Filtrar por tipo:</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="order_confirmation">
                  Confirmación de Pedido
                </SelectItem>
                <SelectItem value="order_shipped">Pedido Enviado</SelectItem>
                <SelectItem value="order_delivered">
                  Pedido Entregado
                </SelectItem>
                <SelectItem value="password_reset">
                  Restablecer Contraseña
                </SelectItem>
                <SelectItem value="account_welcome">Bienvenida</SelectItem>
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
                  </>
                )}
                <SelectItem value="low_stock_alert">Alerta de Stock</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card
        className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: "var(--admin-border-primary)" }}
      >
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-tierra-media">Cargando...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-8 text-center text-tierra-media">
              No se encontraron plantillas
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Uso</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        {template.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTypeLabel(template.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {template.subject}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={template.is_active}
                          onCheckedChange={() => handleToggleActive(template)}
                        />
                      </TableCell>
                      <TableCell>{template.usage_count || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setShowPreviewDialog(true);
                            }}
                            title="Ver plantilla"
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
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestEmail(template)}
                            disabled={testing === template.id}
                            title="Enviar email de prueba"
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
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
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
          onOpenChange={setShowCreateDialog}
          onSave={() => {
            setShowCreateDialog(false);
            fetchTemplates();
          }}
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

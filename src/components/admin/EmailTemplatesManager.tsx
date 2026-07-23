"use client";

import { Edit, Eye, Plus, Send, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { ESSENTIAL_TYPES, getTypeLabel, TYPE_DESCRIPTIONS } from "./_components/EmailTemplatesConstants";
import { useEmailTemplates } from "./_hooks/useEmailTemplates";
import { EmailTemplateDeleteDialog } from "./EmailTemplateDeleteDialog";
import EmailTemplateEditor from "./EmailTemplateEditor";
import { EmailTemplatePreviewDialog } from "./EmailTemplatePreviewDialog";
import { EmailTemplateTestDialog } from "./EmailTemplateTestDialog";

interface EmailTemplatesManagerProps {
  mode?: "organization" | "saas";
  organizationId?: string;
}

export default function EmailTemplatesManager({ mode = "organization", organizationId }: EmailTemplatesManagerProps) {
  const {
    templates, loading, typeFilter, setTypeFilter, groupFilter, setGroupFilter,
    showCreateDialog, setShowCreateDialog, showEditDialog, setShowEditDialog,
    showPreviewDialog, setShowPreviewDialog, showTestDialog, setShowTestDialog,
    showDeleteDialog, setShowDeleteDialog, templateToDelete, setTemplateToDelete,
    deleting, selectedTemplate, setSelectedTemplate, testing,
    createInitialType, setCreateInitialType,
    fetchTemplates, handleToggleActive, handleDeleteClick, confirmDelete,
    handleTestEmail, confirmTestEmailWith,
  } = useEmailTemplates({ mode, organizationId });

  const templatesByType = new Map(templates.map((t) => [t.type, t]));
  const displayRows = mode === "organization"
    ? ESSENTIAL_TYPES.filter((t) => typeFilter === "all" || t === typeFilter).map((type) => ({ type, template: templatesByType.get(type) ?? null }))
    : templates.filter((t) => typeFilter === "all" || t.type === typeFilter).map((template) => ({ type: template.type, template }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:gap-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-epoch-primary font-display">Plantillas de Email</h2>
          <p className="text-xs sm:text-sm text-epoch-primary/80 mt-1">Gestiona las plantillas de email del sistema</p>
        </div>
        <Button className="rounded-xl min-h-[44px] w-full sm:w-auto" onClick={() => { setCreateInitialType(undefined); setShowCreateDialog(true); }}>
          <Plus className="h-4 w-4 mr-2 shrink-0" />Nueva Plantilla
        </Button>
      </div>

      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-4 sm:items-center flex-wrap">
            {mode === "saas" && (
              <>
                <Label className="text-xs sm:text-sm">Grupo:</Label>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="w-full sm:w-[200px] rounded-xl min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem><SelectItem value="funnel">Funnel</SelectItem><SelectItem value="support">Soporte</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            <Label className="text-xs sm:text-sm">Filtrar por tipo:</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[250px] rounded-xl min-h-[44px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {mode === "organization" && ESSENTIAL_TYPES.map((type) => <SelectItem key={type} value={type}>{getTypeLabel(type)}</SelectItem>)}
                {mode === "saas" && <>
                  <SelectItem value="saas_welcome">Bienvenida SaaS</SelectItem>
                  <SelectItem value="saas_trial_ending">Fin de Prueba</SelectItem>
                  <SelectItem value="saas_subscription_success">Suscripción Exitosa</SelectItem>
                  <SelectItem value="saas_support_ticket_created">Ticket Creado</SelectItem>
                  <SelectItem value="saas_support_new_response">Nueva Respuesta</SelectItem>
                  <SelectItem value="saas_support_ticket_assigned">Ticket Asignado</SelectItem>
                  <SelectItem value="saas_support_ticket_resolved">Ticket Resuelto</SelectItem>
                  <SelectItem value="demo_approved">Demo Aprobada</SelectItem>
                  <SelectItem value="demo_expiring">Demo por Vencer</SelectItem>
                  <SelectItem value="demo_expired">Demo Expirada</SelectItem>
                  <SelectItem value="demo_post_meeting_followup">Post-Reunión Followup</SelectItem>
                </>}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 sm:p-8 text-center text-epoch-primary/80 text-sm">Cargando...</div>
          ) : displayRows.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-epoch-primary/80 text-sm">No se encontraron plantillas</div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">Nombre</TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">Tipo</TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm hidden md:table-cell">Envío</TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">Asunto</TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">Estado</TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm hidden sm:table-cell">Uso</TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.map(({ type, template }) => (
                    <TableRow className={template && !template.is_active ? "opacity-70" : undefined} key={type}>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        <span className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                          <span className="truncate">{template?.name ?? <span className="text-epoch-primary/70 italic">Sin plantilla</span>}</span>
                          {template && !template.is_active && <Badge className="text-[10px] sm:text-xs w-fit shrink-0" variant="secondary">Inactiva</Badge>}
                        </span>
                      </TableCell>
                      <TableCell><Badge className="text-[10px] sm:text-xs" variant="outline">{getTypeLabel(type)}</Badge></TableCell>
                      <TableCell className="max-w-[200px] hidden md:table-cell">
                        {mode === "organization" && TYPE_DESCRIPTIONS[type] ? <span className="text-xs text-epoch-primary/70" title={TYPE_DESCRIPTIONS[type]}>{TYPE_DESCRIPTIONS[type]}</span> : <span className="text-xs text-epoch-primary/70">—</span>}
                      </TableCell>
                      <TableCell className="max-w-[120px] sm:max-w-xs truncate text-xs sm:text-sm">{template?.subject ?? "—"}</TableCell>
                      <TableCell>
                        {template ? <Switch checked={template.is_active} onCheckedChange={() => handleToggleActive(template)} /> : <span className="text-epoch-primary/70">—</span>}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{template?.usage_count ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {template ? (
                            <>
                              <Button className="h-9 w-9 sm:h-9 sm:w-9 p-0 rounded-xl" size="sm" title="Ver plantilla" variant="ghost" onClick={() => { setSelectedTemplate(template); setShowPreviewDialog(true); }}><Eye className="h-4 w-4" /></Button>
                              <Button className="h-9 w-9 sm:h-9 sm:w-9 p-0 rounded-xl" size="sm" title="Editar plantilla" variant="ghost" onClick={() => { setSelectedTemplate(template); setShowEditDialog(true); }}><Edit className="h-4 w-4" /></Button>
                              <Button className="h-9 w-9 sm:h-9 sm:w-9 p-0 rounded-xl" disabled={testing === template.id} size="sm" title="Enviar email de prueba" variant="ghost" onClick={() => handleTestEmail(template)}><Send className={`h-4 w-4 ${testing === template.id ? "animate-spin" : ""}`} /></Button>
                              {!template.is_system && <Button className="text-red-600 h-9 w-9 sm:h-9 sm:w-9 p-0 rounded-xl" size="sm" variant="ghost" onClick={() => handleDeleteClick(template)}><Trash2 className="h-4 w-4" /></Button>}
                            </>
                          ) : (
                            <Button className="rounded-xl min-h-[44px] text-xs sm:text-sm" size="sm" onClick={() => { setCreateInitialType(type); setShowCreateDialog(true); }}>
                              <Plus className="h-4 w-4 mr-1 shrink-0" /><span className="truncate">Crear plantilla</span>
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

      {showEditDialog && selectedTemplate && <EmailTemplateEditor mode={mode} open={showEditDialog} organizationId={organizationId} template={selectedTemplate} onOpenChange={setShowEditDialog} onSave={() => { setShowEditDialog(false); fetchTemplates(); }} />}
      {showCreateDialog && <EmailTemplateEditor initialType={createInitialType} mode={mode} open={showCreateDialog} organizationId={organizationId} onOpenChange={(open) => { if (!open) setCreateInitialType(undefined); setShowCreateDialog(open); }} onSave={() => { setShowCreateDialog(false); setCreateInitialType(undefined); fetchTemplates(); }} />}
      {showPreviewDialog && selectedTemplate && <EmailTemplatePreviewDialog open={showPreviewDialog} template={selectedTemplate} onOpenChange={setShowPreviewDialog} />}
      <EmailTemplateDeleteDialog deleting={deleting} open={showDeleteDialog} template={templateToDelete} onConfirm={confirmDelete} onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) setTemplateToDelete(null); }} />
      {showTestDialog && selectedTemplate && <EmailTemplateTestDialog open={showTestDialog} template={selectedTemplate} testing={testing} onOpenChange={setShowTestDialog} onSend={(id, email) => confirmTestEmailWith(id, email)} />}
    </div>
  );
}

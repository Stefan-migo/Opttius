"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { appLogger } from '@/lib/logger';

import type { EmailTemplate } from "../_components/EmailTemplatesConstants";

interface UseEmailTemplatesProps {
  mode: "organization" | "saas";
  organizationId?: string;
}

export function useEmailTemplates({ mode, organizationId }: UseEmailTemplatesProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [createInitialType, setCreateInitialType] = useState<string | undefined>();

  const templatesApiBase = mode === "saas"
    ? "/api/admin/saas-management/email-templates"
    : "/api/admin/system/email-templates";

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (mode === "saas") {
        params.set("category", "saas");
        if (groupFilter !== "all") params.set("template_group", groupFilter);
      }
      const apiUrl = mode === "saas"
        ? `/api/admin/saas-management/email-templates?${params}`
        : `/api/admin/system/email-templates?${params}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data.templates ?? data.data ?? []);
    } catch (error) {
      appLogger.error("Error fetching templates:", error);
      toast.error("Error al cargar plantillas");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, groupFilter, mode]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`${templatesApiBase}/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !template.is_active }),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.details ?? errBody?.error ?? response.statusText);
      }
      toast.success(`Plantilla ${!template.is_active ? "activada" : "desactivada"}`);
      fetchTemplates();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error al actualizar plantilla";
      appLogger.error("Error updating template:", error);
      toast.error(msg);
    }
  };

  const handleDeleteClick = (template: EmailTemplate) => {
    if (template.is_system) { toast.error("No se pueden eliminar plantillas del sistema"); return; }
    setTemplateToDelete(template);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      setDeleting(true);
      const response = await fetch(`${templatesApiBase}/${templateToDelete.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete template");
      toast.success("Plantilla eliminada");
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (error) {
      appLogger.error("Error deleting template:", error);
      toast.error("Error al eliminar plantilla");
    } finally { setDeleting(false); }
  };

  const handleTestEmail = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowTestDialog(true);
  };

  const confirmTestEmailWith = async (templateId: string, email: string) => {
    try {
      setTesting(templateId);
      const response = await fetch(`${templatesApiBase}/${templateId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: email }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || "Email de prueba enviado");
        setShowTestDialog(false);
      } else {
        toast.error(data.error || "Error al enviar email de prueba");
      }
    } catch (error) {
      appLogger.error("Error testing email:", error);
      toast.error("Error al enviar email de prueba");
    } finally { setTesting(null); }
  };

  return {
    templates, loading, typeFilter, setTypeFilter, groupFilter, setGroupFilter,
    showCreateDialog, setShowCreateDialog, showEditDialog, setShowEditDialog,
    showPreviewDialog, setShowPreviewDialog, showTestDialog, setShowTestDialog,
    showDeleteDialog, setShowDeleteDialog, templateToDelete, setTemplateToDelete,
    deleting, selectedTemplate, setSelectedTemplate, testing,
    createInitialType, setCreateInitialType,
    fetchTemplates, handleToggleActive, handleDeleteClick, confirmDelete,
    handleTestEmail, confirmTestEmailWith, templatesApiBase,
  };
}

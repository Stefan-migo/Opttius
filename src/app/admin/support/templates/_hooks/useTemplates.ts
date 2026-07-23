"use client";

import { useCallback, useEffect, useState } from "react";

import { extractDataFromResponse } from "@/lib/api/response-helpers";
import { appLogger } from '@/lib/logger';

interface SupportTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category_id?: string;
  variables: string[];
  usage_count: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string };
  creator?: { id: string; email: string };
}

interface Category {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  color: string;
}

interface TemplateForm {
  name: string;
  subject: string;
  content: string;
  category_id: string;
  variables: string[];
}

export function useTemplates() {
  const [templates, setTemplates] = useState<SupportTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<SupportTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] =
    useState<SupportTemplate | null>(null);

  const [form, setForm] = useState<TemplateForm>({
    name: "",
    subject: "",
    content: "",
    category_id: "",
    variables: [],
  });

  const [previewData, setPreviewData] = useState({
    subject: "",
    content: "",
    variables: {} as Record<string, string>,
  });

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, activeFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== "all")
        params.append("category_id", categoryFilter);
      if (activeFilter !== "all")
        params.append(
          "active_only",
          activeFilter === "active" ? "true" : "false",
        );

      const response = await fetch(`/api/admin/support/templates?${params}`);
      if (!response.ok) throw new Error("Failed to fetch templates");

      const data = await response.json();
      setTemplates(data.templates || []);
      setError(null);
    } catch (err) {
      appLogger.error("Error fetching templates:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/support/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(extractDataFromResponse(data));
      }
    } catch (err) {
      appLogger.error("Error fetching categories:", err);
    }
  }, []);

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setForm({
      name: "",
      subject: "",
      content: "",
      category_id: "",
      variables: [],
    });
    setEditDialogOpen(true);
  };

  const openEditDialog = (template: SupportTemplate) => {
    setEditingTemplate(template);
    setSelectedTemplateForEdit(template);
    setForm({
      name: template.name,
      subject: template.subject,
      content: template.content,
      category_id: template.category_id || "",
      variables: Array.isArray(template.variables)
        ? template.variables
        : typeof template.variables === "string"
          ? JSON.parse(template.variables || "[]")
          : [],
    });
    setEditDialogOpen(true);
  };

  const openPreviewDialog = (template: SupportTemplate) => {
    const variableMatches = template.content.match(/\{\{(\w+)\}\}/g) || [];
    const subjectMatches = template.subject.match(/\{\{(\w+)\}\}/g) || [];
    const allMatches = [...variableMatches, ...subjectMatches];
    const uniqueVariables = [
      ...new Set(allMatches.map((m) => m.replace(/\{\{|\}\}/g, ""))),
    ];

    const sampleVariables: Record<string, string> = {};
    uniqueVariables.forEach((variable) => {
      const samples: Record<string, string> = {
        customer_name: "María González",
        order_number: "ORD-001",
        product_name: "Crema Facial de Rosa Mosqueta",
        tracking_number: "TR123456789",
        delivery_date: "25 de enero de 2025",
      };
      sampleVariables[variable] = samples[variable] || `[${variable}]`;
    });

    setPreviewData({
      subject: template.subject,
      content: template.content,
      variables: sampleVariables,
    });
    setPreviewDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!form.name.trim() || !form.content.trim()) {
      alert("Por favor, completa los campos obligatorios.");
      return;
    }
    try {
      setSaving(true);
      const method = editingTemplate ? "PUT" : "POST";
      const url = editingTemplate
        ? `/api/admin/support/templates/${editingTemplate.id}`
        : "/api/admin/support/templates";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          subject: form.subject.trim(),
          content: form.content.trim(),
          category_id: form.category_id || null,
          variables: form.variables,
        }),
      });

      if (!response.ok) throw new Error("Failed to save template");
      await fetchTemplates();
      setEditDialogOpen(false);
    } catch (err) {
      appLogger.error("Error saving template:", err);
      alert("Error al guardar la plantilla. Por favor, inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyTemplate = async (template: SupportTemplate) => {
    try {
      await navigator.clipboard.writeText(template.content);
      alert("Plantilla copiada al portapapeles");
    } catch (err) {
      appLogger.error("Error copying template:", err);
      alert("Error al copiar la plantilla");
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return {
    templates,
    categories,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    activeFilter,
    setActiveFilter,
    fetchTemplates,
    editDialogOpen,
    setEditDialogOpen,
    previewDialogOpen,
    setPreviewDialogOpen,
    editingTemplate,
    saving,
    form,
    previewData,
    openCreateDialog,
    openEditDialog,
    openPreviewDialog,
    handleSaveTemplate,
    handleCopyTemplate,
    handleFormChange,
  };
}

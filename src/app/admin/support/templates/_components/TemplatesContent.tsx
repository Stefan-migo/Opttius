"use client";

import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { extractDataFromResponse } from "@/lib/api/response-helpers";

import { TemplateEditDialog } from "./TemplateEditDialog";
import { TemplateFilters } from "./TemplateFilters";
import { TemplateGrid } from "./TemplateGrid";
import { TemplatePreviewDialog } from "./TemplatePreviewDialog";
import { TemplateStats } from "./TemplateStats";

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
  category?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    email: string;
  };
}

interface Category {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  color: string;
}

export default function TemplatesContent() {
  const [templates, setTemplates] = useState<SupportTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  // Template creation/editing
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<SupportTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] =
    useState<SupportTemplate | null>(null);

  const [form, setForm] = useState({
    name: "",
    subject: "",
    content: "",
    category_id: "",
    variables: [] as string[],
  });

  const [previewData, setPreviewData] = useState({
    subject: "",
    content: "",
    variables: {} as Record<string, string>,
  });

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
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
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await response.json();
      setTemplates(data.templates || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching templates:", err);
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
      console.error("Error fetching categories:", err);
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
      ...new Set(allMatches.map((match) => match.replace(/\{\{|\}\}/g, ""))),
    ];

    const sampleVariables: Record<string, string> = {};
    uniqueVariables.forEach((variable) => {
      switch (variable) {
        case "customer_name":
          sampleVariables[variable] = "María González";
          break;
        case "order_number":
          sampleVariables[variable] = "ORD-001";
          break;
        case "product_name":
          sampleVariables[variable] = "Crema Facial de Rosa Mosqueta";
          break;
        case "tracking_number":
          sampleVariables[variable] = "TR123456789";
          break;
        case "delivery_date":
          sampleVariables[variable] = "25 de enero de 2025";
          break;
        default:
          sampleVariables[variable] = `[${variable}]`;
      }
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          subject: form.subject.trim(),
          content: form.content.trim(),
          category_id: form.category_id || null,
          variables: form.variables,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save template");
      }

      await fetchTemplates();
      setEditDialogOpen(false);
    } catch (err) {
      console.error("Error saving template:", err);
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
      console.error("Error copying template:", err);
      alert("Error al copiar la plantilla");
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading && templates.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-epoch-primary">
              Plantillas de Soporte
            </h1>
            <p className="text-admin-text-tertiary">Cargando plantillas...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card className="animate-pulse" key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Link href="/admin/support">
            <Button size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-epoch-primary">
              Plantillas de Soporte
            </h1>
            <p className="text-admin-text-tertiary">
              Gestiona plantillas de respuestas para agilizar el soporte al cliente
            </p>
          </div>
        </div>

        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      <TemplateStats
        totalTemplates={templates.length}
        maxUsageCount={Math.max(...templates.map((t) => t.usage_count), 0)}
        categoriesCount={categories.length}
        activeCount={templates.filter((t) => t.is_active).length}
      />

      <TemplateFilters
        searchTerm={searchTerm}
        categoryFilter={categoryFilter}
        activeFilter={activeFilter}
        categories={categories}
        onSearchChange={setSearchTerm}
        onCategoryChange={setCategoryFilter}
        onActiveChange={setActiveFilter}
      />

      <TemplateGrid
        templates={templates}
        onPreview={openPreviewDialog}
        onCopy={handleCopyTemplate}
        onEdit={openEditDialog}
        onCreateNew={openCreateDialog}
        searchTerm={searchTerm}
      />

      <TemplateEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        editingTemplate={editingTemplate}
        saving={saving}
        form={form}
        categories={categories}
        onFormChange={handleFormChange}
        onSave={handleSaveTemplate}
      />

      <TemplatePreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        subject={previewData.subject}
        content={previewData.content}
        variables={previewData.variables}
      />
    </div>
  );
}

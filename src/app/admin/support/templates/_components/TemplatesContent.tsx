"use client";

import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useTemplates } from "../_hooks/useTemplates";
import { TemplateEditDialog } from "./TemplateEditDialog";
import { TemplateFilters } from "./TemplateFilters";
import { TemplateGrid } from "./TemplateGrid";
import { TemplatePreviewDialog } from "./TemplatePreviewDialog";
import { TemplateStats } from "./TemplateStats";

export default function TemplatesContent() {
  const {
    templates,
    categories,
    loading,
    error,
    fetchTemplates,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    activeFilter,
    setActiveFilter,
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
  } = useTemplates();

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
              Gestiona plantillas de respuestas para agilizar el soporte al
              cliente
            </p>
          </div>
        </div>

        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      <TemplateStats
        activeCount={templates.filter((t) => t.is_active).length}
        categoriesCount={categories.length}
        maxUsageCount={Math.max(...templates.map((t) => t.usage_count), 0)}
        totalTemplates={templates.length}
      />

      <TemplateFilters
        activeFilter={activeFilter}
        categories={categories}
        categoryFilter={categoryFilter}
        searchTerm={searchTerm}
        onActiveChange={setActiveFilter}
        onCategoryChange={setCategoryFilter}
        onSearchChange={setSearchTerm}
      />

      <TemplateGrid
        searchTerm={searchTerm}
        templates={templates}
        onCopy={handleCopyTemplate}
        onCreateNew={openCreateDialog}
        onEdit={openEditDialog}
        onPreview={openPreviewDialog}
      />

      <TemplateEditDialog
        categories={categories}
        editingTemplate={editingTemplate}
        form={form}
        open={editDialogOpen}
        saving={saving}
        onFormChange={handleFormChange}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveTemplate}
      />

      <TemplatePreviewDialog
        content={previewData.content}
        open={previewDialogOpen}
        subject={previewData.subject}
        variables={previewData.variables}
        onOpenChange={setPreviewDialogOpen}
      />
    </div>
  );
}

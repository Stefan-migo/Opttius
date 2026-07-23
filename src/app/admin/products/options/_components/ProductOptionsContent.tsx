"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { AddOptionValueDialog } from "./_components/AddOptionValueDialog";
import { EditOptionValueDialog } from "./_components/EditOptionValueDialog";
import { OptionFieldCard } from "./_components/OptionFieldCard";
import type { OptionField, OptionValue } from "./types";

export default function ProductOptionsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<OptionField[]>([]);
  const [selectedField, setSelectedField] = useState<OptionField | null>(null);
  const [showAddValueDialog, setShowAddValueDialog] = useState(false);
  const [showEditValueDialog, setShowEditValueDialog] = useState(false);
  const [editingValue, setEditingValue] = useState<OptionValue | null>(null);
  const [newValue, setNewValue] = useState({
    value: "",
    label: "",
    is_default: false,
  });
  const [categories] = useState([
    { value: "general", label: "General" },
    { value: "frame", label: "Armazón" },
    { value: "lens", label: "Lente" },
    { value: "accessory", label: "Accesorio" },
  ]);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "/api/admin/product-options?form_type=product&include_inactive=true",
      );
      const data = await response.json();
      if (response.ok) {
        setFields(data.fields || []);
      } else {
        toast.error(data.error || "Error al cargar opciones");
      }
    } catch (error) {
      console.error("Error fetching fields:", error);
      toast.error("Error al cargar opciones");
    } finally {
      setLoading(false);
    }
  };

  const handleAddValue = async () => {
    if (!selectedField || !newValue.value || !newValue.label) {
      toast.error("Completa todos los campos");
      return;
    }

    try {
      const response = await fetch("/api/admin/product-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "value",
          valueData: {
            field_id: selectedField.id,
            value: newValue.value.toLowerCase().replace(/\s+/g, "_"),
            label: newValue.label,
            is_default: newValue.is_default,
            display_order: (selectedField.values?.length || 0) + 1,
          },
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Opción agregada exitosamente");
        setShowAddValueDialog(false);
        setNewValue({ value: "", label: "", is_default: false });
        fetchFields();
      } else {
        toast.error(data.error || "Error al agregar opción");
      }
    } catch (error) {
      console.error("Error adding value:", error);
      toast.error("Error al agregar opción");
    }
  };

  const handleEditValue = async () => {
    if (!editingValue || !newValue.label) {
      toast.error("Completa todos los campos");
      return;
    }

    try {
      const response = await fetch("/api/admin/product-options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "value",
          id: editingValue.id,
          data: {
            label: newValue.label,
            is_default: newValue.is_default,
            is_active: true,
          },
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Opción actualizada exitosamente");
        setShowEditValueDialog(false);
        setEditingValue(null);
        setNewValue({ value: "", label: "", is_default: false });
        fetchFields();
      } else {
        toast.error(data.error || "Error al actualizar opción");
      }
    } catch (error) {
      console.error("Error updating value:", error);
      toast.error("Error al actualizar opción");
    }
  };

  const handleDeleteValue = async (value: OptionValue) => {
    if (!confirm(`¿Estás seguro de eliminar "${value.label}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/product-options?type=value&id=${value.id}`,
        { method: "DELETE" },
      );

      const data = await response.json();
      if (response.ok) {
        toast.success("Opción eliminada exitosamente");
        fetchFields();
      } else {
        toast.error(data.error || "Error al eliminar opción");
      }
    } catch (error) {
      console.error("Error deleting value:", error);
      toast.error("Error al eliminar opción");
    }
  };

  const handleToggleValueActive = async (value: OptionValue) => {
    try {
      const response = await fetch("/api/admin/product-options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "value",
          id: value.id,
          data: { is_active: !value.is_active },
        }),
      });

      if (response.ok) {
        toast.success(
          value.is_active ? "Opción desactivada" : "Opción activada",
        );
        fetchFields();
      } else {
        toast.error("Error al actualizar opción");
      }
    } catch (error) {
      console.error("Error toggling value:", error);
      toast.error("Error al actualizar opción");
    }
  };

  const openEditDialog = (value: OptionValue) => {
    setEditingValue(value);
    setNewValue({
      value: value.value,
      label: value.label,
      is_default: value.is_default,
    });
    setShowEditValueDialog(true);
  };

  const openAddDialog = (field: OptionField) => {
    setSelectedField(field);
    setNewValue({ value: "", label: "", is_default: false });
    setShowAddValueDialog(true);
  };

  const groupedFields = categories.map((cat) => ({
    ...cat,
    fields: fields.filter((f) => f.field_category === cat.value),
  }));

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-admin-text-primary">
            Personalizar Opciones de Productos
          </h1>
        </div>
        <Button
          className="h-10 w-10 sm:h-auto sm:w-auto sm:px-4 shrink-0"
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Volver</span>
        </Button>
      </div>

      <div className="mb-4 sm:mb-6">
        <p className="text-sm text-admin-text-secondary">
          Personaliza las opciones disponibles en los menús desplegables del
          formulario de productos. Puedes agregar, editar, eliminar y
          activar/desactivar opciones.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {groupedFields.map((category) => (
          <Card
            className="bg-admin-bg-tertiary overflow-hidden"
            key={category.value}
          >
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
              <CardTitle className="text-base sm:text-lg">
                {category.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
              {category.fields.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No hay campos en esta categoría
                </p>
              ) : (
                category.fields.map((field) => (
                  <OptionFieldCard
                    field={field}
                    key={field.id}
                    onAddValue={openAddDialog}
                    onDeleteValue={handleDeleteValue}
                    onEditValue={openEditDialog}
                    onToggleValue={handleToggleValueActive}
                  />
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AddOptionValueDialog
        newValue={newValue}
        open={showAddValueDialog}
        selectedField={selectedField}
        onAdd={handleAddValue}
        onNewValueChange={setNewValue}
        onOpenChange={setShowAddValueDialog}
      />
      <EditOptionValueDialog
        editingValue={editingValue}
        newValue={newValue}
        open={showEditValueDialog}
        onNewValueChange={setNewValue}
        onOpenChange={setShowEditValueDialog}
        onSave={handleEditValue}
      />
    </div>
  );
}

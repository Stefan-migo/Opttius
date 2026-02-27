"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

interface OptionField {
  id: string;
  field_key: string;
  field_label: string;
  field_category: string;
  is_array: boolean;
  is_active: boolean;
  display_order: number;
  values?: OptionValue[];
}

interface OptionValue {
  id: string;
  field_id: string;
  value: string;
  label: string;
  display_order: number;
  is_active: boolean;
  is_default: boolean;
}

export default function ProductOptionsPage() {
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
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
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
          variant="outline"
          onClick={() => router.back()}
          className="h-10 w-10 sm:h-auto sm:w-auto sm:px-4 shrink-0"
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
            key={category.value}
            className="bg-admin-bg-tertiary overflow-hidden"
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
                  <div key={field.id} className="border rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-start gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {field.field_label}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Campo:{" "}
                          <code className="bg-gray-100 px-1 rounded">
                            {field.field_key}
                          </code>
                          {field.is_array && (
                            <Badge variant="secondary" className="ml-2">
                              Múltiples valores
                            </Badge>
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openAddDialog(field)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar Opción
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {field.values && field.values.length > 0 ? (
                        field.values.map((value) => (
                          <div
                            key={value.id}
                            className={`flex items-center justify-between p-2 rounded border ${
                              !value.is_active
                                ? "bg-gray-50 opacity-60"
                                : "bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <GripVertical className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{value.label}</span>
                              <code className="text-xs bg-gray-100 px-1 rounded text-gray-600">
                                {value.value}
                              </code>
                              {value.is_default && (
                                <Badge variant="default" className="text-xs">
                                  Por defecto
                                </Badge>
                              )}
                              {!value.is_active && (
                                <Badge variant="secondary" className="text-xs">
                                  Inactivo
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleValueActive(value)}
                                title={
                                  value.is_active ? "Desactivar" : "Activar"
                                }
                              >
                                {value.is_active ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(value)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteValue(value)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm py-2">
                          No hay opciones configuradas
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Value Dialog */}
      <Dialog open={showAddValueDialog} onOpenChange={setShowAddValueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nueva Opción</DialogTitle>
            <DialogDescription>
              Agrega una nueva opción para: {selectedField?.field_label}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new_value">Valor</Label>
              <p className="text-xs text-gray-500 mb-1">
                Código interno utilizado por el sistema
              </p>
              <Input
                id="new_value"
                value={newValue.value}
                onChange={(e) =>
                  setNewValue({
                    ...newValue,
                    value: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                  })
                }
                placeholder="Ej: nuevo_tipo"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se convertirá automáticamente a formato snake_case
              </p>
            </div>
            <div>
              <Label htmlFor="new_label">Etiqueta (mostrar)</Label>
              <Input
                id="new_label"
                value={newValue.label}
                onChange={(e) =>
                  setNewValue({ ...newValue, label: e.target.value })
                }
                placeholder="Ej: Nuevo Tipo"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_default"
                checked={newValue.is_default}
                onChange={(e) =>
                  setNewValue({ ...newValue, is_default: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="is_default">Marcar como opción por defecto</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddValueDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddValue}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Value Dialog */}
      <Dialog open={showEditValueDialog} onOpenChange={setShowEditValueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Opción</DialogTitle>
            <DialogDescription>
              Edita la opción: {editingValue?.label}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_value">Valor</Label>
              <p className="text-xs text-gray-500 mb-1">
                Código interno utilizado por el sistema
              </p>
              <Input
                id="edit_value"
                value={newValue.value}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                El valor no se puede modificar
              </p>
            </div>
            <div>
              <Label htmlFor="edit_label">Etiqueta (mostrar)</Label>
              <Input
                id="edit_label"
                value={newValue.label}
                onChange={(e) =>
                  setNewValue({ ...newValue, label: e.target.value })
                }
                placeholder="Ej: Nuevo Tipo"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit_is_default"
                checked={newValue.is_default}
                onChange={(e) =>
                  setNewValue({ ...newValue, is_default: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="edit_is_default">
                Marcar como opción por defecto
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditValueDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditValue}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

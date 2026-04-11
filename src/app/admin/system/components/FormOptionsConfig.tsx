"use client";

import {
  Edit2,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FORM_TYPES = [
  {
    value: "product",
    label: "Productos",
    description: "Opciones del formulario de productos",
  },
  {
    value: "customer",
    label: "Clientes",
    description: "Género, método de contacto, etc.",
  },
  { value: "appointment", label: "Citas", description: "Tipo de cita" },
  {
    value: "quote",
    label: "Presupuestos",
    description: "Opciones de lentes y presbicia",
  },
  {
    value: "prescription",
    label: "Recetas",
    description: "Opciones del formulario de recetas (tipo, material, etc.)",
  },
  { value: "pos", label: "POS", description: "Opciones del punto de venta" },
  {
    value: "global",
    label: "Global",
    description: "Parámetros usados en múltiples formularios",
  },
] as const;

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "frame", label: "Armazón" },
  { value: "lens", label: "Lente" },
  { value: "accessory", label: "Accesorio" },
];

interface OptionValue {
  id: string;
  field_id: string;
  value: string;
  label: string;
  display_order: number;
  is_active: boolean;
  is_default: boolean;
}

interface OptionField {
  id: string;
  field_key: string;
  field_label: string;
  field_category: string;
  form_type?: string;
  is_array: boolean;
  is_active: boolean;
  display_order: number;
  values?: OptionValue[];
}

/**
 * Configuración de opciones de formularios (productos, clientes, citas, presupuestos, POS).
 * Gestiona product_option_fields y product_option_values vía /api/admin/product-options.
 */
export default function FormOptionsConfig() {
  const [loading, setLoading] = useState(true);
  const [fieldsByFormType, setFieldsByFormType] = useState<
    Record<string, OptionField[]>
  >({});
  const [selectedFormType, setSelectedFormType] = useState<string>("product");
  const [selectedField, setSelectedField] = useState<OptionField | null>(null);
  const [showAddValueDialog, setShowAddValueDialog] = useState(false);
  const [showEditValueDialog, setShowEditValueDialog] = useState(false);
  const [editingValue, setEditingValue] = useState<OptionValue | null>(null);
  const [newValue, setNewValue] = useState({
    value: "",
    label: "",
    is_default: false,
  });

  const fetchAllFields = async () => {
    try {
      setLoading(true);
      const allFields: OptionField[] = [];
      for (const ft of FORM_TYPES) {
        const res = await fetch(
          `/api/admin/product-options?form_type=${ft.value}&include_inactive=true`,
        );
        const data = await res.json();
        if (res.ok && data.fields) {
          allFields.push(...data.fields);
        }
      }
      const grouped: Record<string, OptionField[]> = {};
      FORM_TYPES.forEach((ft) => {
        grouped[ft.value] = allFields.filter(
          (f) => (f.form_type || "product") === ft.value,
        );
      });
      setFieldsByFormType(grouped);
    } catch (error) {
      console.error("Error fetching form options:", error);
      toast.error("Error al cargar opciones de formularios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllFields();
  }, []);

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
        fetchAllFields();
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
        fetchAllFields();
      } else {
        toast.error(data.error || "Error al actualizar opción");
      }
    } catch (error) {
      console.error("Error updating value:", error);
      toast.error("Error al actualizar opción");
    }
  };

  const handleDeleteValue = async (value: OptionValue) => {
    if (!confirm(`¿Estás seguro de eliminar "${value.label}"?`)) return;

    try {
      const response = await fetch(
        `/api/admin/product-options?type=value&id=${value.id}`,
        { method: "DELETE" },
      );

      const data = await response.json();
      if (response.ok) {
        toast.success("Opción eliminada exitosamente");
        fetchAllFields();
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
        fetchAllFields();
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

  const currentFields = fieldsByFormType[selectedFormType] || [];
  const formTypeInfo = FORM_TYPES.find((ft) => ft.value === selectedFormType);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-admin-border-primary/30 rounded-xl w-64" />
          <div className="h-32 bg-admin-border-primary/20 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:gap-4">
        <h2 className="text-xl sm:text-2xl font-display font-bold text-epoch-primary tracking-tight uppercase">
          Configuración de Formularios
        </h2>
        <p className="text-[10px] sm:text-xs text-epoch-primary/80 uppercase tracking-wider">
          Personaliza las opciones de los menús desplegables en cada formulario
          del sistema.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-56 flex-shrink-0 space-y-2">
          <Label className="text-[10px] font-display font-bold text-epoch-primary uppercase tracking-widest">
            Formulario
          </Label>
          <Select value={selectedFormType} onValueChange={setSelectedFormType}>
            <SelectTrigger className="h-11 min-h-[44px] w-full sm:w-56 bg-epoch-background/50 border-border rounded-xl font-display text-[10px] tracking-widest uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-admin-border-primary/20">
              {FORM_TYPES.map((ft) => (
                <SelectItem
                  className="font-display text-[10px] tracking-widest uppercase"
                  key={ft.value}
                  value={ft.value}
                >
                  {ft.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="rounded-xl border border-border overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg font-display font-bold text-epoch-primary uppercase tracking-tight">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              {formTypeInfo?.label}
            </span>
          </CardTitle>
          <p className="text-[10px] sm:text-xs text-epoch-primary/80 uppercase tracking-wider mt-1">
            {formTypeInfo?.description}
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          {currentFields.length === 0 ? (
            <p className="text-epoch-primary/70 text-[10px] sm:text-xs py-3 sm:py-4">
              No hay campos configurados para este formulario.
            </p>
          ) : (
            currentFields.map((field) => (
              <div
                className="border border-border rounded-lg p-2 sm:p-3 bg-epoch-background/30 overflow-hidden"
                key={field.id}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-epoch-primary text-xs sm:text-sm uppercase tracking-tight break-words">
                      {field.field_label}
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-epoch-primary/70 mt-0.5">
                      Campo:{" "}
                      <code className="bg-epoch-background/50 border border-border px-1 py-0.5 rounded text-epoch-primary/80 font-display text-[9px]">
                        {field.field_key}
                      </code>
                      {field.is_array && (
                        <Badge
                          className="ml-1.5 rounded text-[8px] font-display font-bold uppercase tracking-wider"
                          variant="secondary"
                        >
                          Múltiples valores
                        </Badge>
                      )}
                    </p>
                  </div>
                  <Button
                    className="flex items-center gap-1.5 h-8 px-2 sm:px-3 rounded-lg border-border font-display font-bold text-[9px] sm:text-[10px] tracking-widest uppercase w-full sm:w-auto shrink-0"
                    size="sm"
                    onClick={() => openAddDialog(field)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar Opción
                  </Button>
                </div>

                <div className="space-y-1.5">
                  {field.values && field.values.length > 0 ? (
                    field.values.map((value) => (
                      <div
                        className={`flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-lg border border-border overflow-hidden min-w-0 ${
                          !value.is_active
                            ? "bg-epoch-background/20 opacity-60"
                            : "bg-epoch-background/40"
                        }`}
                        key={value.id}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 overflow-hidden">
                          <GripVertical className="h-3.5 w-3.5 text-epoch-primary/50 shrink-0" />
                          <span className="font-display font-bold text-epoch-primary text-[10px] sm:text-xs uppercase tracking-tight truncate">
                            {value.label}
                          </span>
                          <code className="text-[8px] sm:text-[9px] bg-epoch-background/60 border border-border px-1 py-0.5 rounded text-epoch-primary/80 font-display shrink-0 max-w-[80px] sm:max-w-none truncate">
                            {value.value}
                          </code>
                          {value.is_default && (
                            <Badge className="text-[7px] sm:text-[8px] font-display font-bold uppercase tracking-wider rounded shrink-0">
                              Por defecto
                            </Badge>
                          )}
                          {!value.is_active && (
                            <Badge
                              className="text-[7px] sm:text-[8px] font-display font-bold uppercase rounded shrink-0"
                              variant="secondary"
                            >
                              Inactivo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                          <Button
                            className="text-epoch-primary/70 hover:text-epoch-primary hover:bg-epoch-primary/10 rounded h-7 w-7 p-0 min-w-7"
                            size="sm"
                            title={value.is_active ? "Desactivar" : "Activar"}
                            variant="ghost"
                            onClick={() => handleToggleValueActive(value)}
                          >
                            {value.is_active ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            className="text-epoch-primary/70 hover:text-epoch-primary hover:bg-epoch-primary/10 rounded h-7 w-7 p-0 min-w-7"
                            size="sm"
                            title="Editar"
                            variant="ghost"
                            onClick={() => openEditDialog(value)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            className="text-red-600 hover:text-red-700 hover:bg-red-500/10 rounded h-7 w-7 p-0 min-w-7"
                            size="sm"
                            title="Eliminar"
                            variant="ghost"
                            onClick={() => handleDeleteValue(value)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-epoch-primary/70 text-[9px] sm:text-[10px] py-2">
                      No hay opciones configuradas
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add Value Dialog */}
      <Dialog open={showAddValueDialog} onOpenChange={setShowAddValueDialog}>
        <DialogContent className="rounded-xl border-admin-border-primary/20 bg-admin-bg-primary">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold text-admin-text-primary uppercase tracking-tight">
              Agregar Nueva Opción
            </DialogTitle>
            <DialogDescription className="text-[11px] font-serif italic text-admin-text-tertiary">
              Agrega una nueva opción para: {selectedField?.field_label}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label
                className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest block mb-2"
                htmlFor="new_value"
              >
                Valor
              </Label>
              <p className="text-[11px] font-serif italic text-admin-text-tertiary mb-1">
                Código interno utilizado por el sistema
              </p>
              <Input
                className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-sm"
                id="new_value"
                placeholder="Ej: nuevo_tipo"
                value={newValue.value}
                onChange={(e) =>
                  setNewValue({
                    ...newValue,
                    value: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                  })
                }
              />
            </div>
            <div>
              <Label
                className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest block mb-2"
                htmlFor="new_label"
              >
                Etiqueta (mostrar)
              </Label>
              <Input
                className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-sm"
                id="new_label"
                placeholder="Ej: Nuevo Tipo"
                value={newValue.label}
                onChange={(e) =>
                  setNewValue({ ...newValue, label: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                checked={newValue.is_default}
                className="rounded border-admin-border-primary text-admin-accent-primary focus:ring-admin-accent-primary"
                id="is_default"
                type="checkbox"
                onChange={(e) =>
                  setNewValue({ ...newValue, is_default: e.target.checked })
                }
              />
              <Label
                className="text-[11px] font-serif italic text-admin-text-secondary"
                htmlFor="is_default"
              >
                Marcar como opción por defecto
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="rounded-xl border-admin-border-primary/20 font-display font-bold text-[10px] tracking-widest uppercase"
              variant="outline"
              onClick={() => setShowAddValueDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23] font-display font-bold text-[10px] tracking-widest uppercase"
              onClick={handleAddValue}
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Value Dialog */}
      <Dialog open={showEditValueDialog} onOpenChange={setShowEditValueDialog}>
        <DialogContent className="rounded-xl border-admin-border-primary/20 bg-admin-bg-primary">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold text-admin-text-primary uppercase tracking-tight">
              Editar Opción
            </DialogTitle>
            <DialogDescription className="text-[11px] font-serif italic text-admin-text-tertiary">
              Edita la opción: {editingValue?.label}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label
                className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest block mb-2"
                htmlFor="edit_value"
              >
                Valor
              </Label>
              <Input
                disabled
                className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-sm text-admin-text-tertiary"
                id="edit_value"
                value={newValue.value}
              />
              <p className="text-[11px] font-serif italic text-admin-text-tertiary mt-1">
                El valor no se puede modificar
              </p>
            </div>
            <div>
              <Label
                className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest block mb-2"
                htmlFor="edit_label"
              >
                Etiqueta (mostrar)
              </Label>
              <Input
                className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-sm"
                id="edit_label"
                placeholder="Ej: Nuevo Tipo"
                value={newValue.label}
                onChange={(e) =>
                  setNewValue({ ...newValue, label: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                checked={newValue.is_default}
                className="rounded border-admin-border-primary text-admin-accent-primary focus:ring-admin-accent-primary"
                id="edit_is_default"
                type="checkbox"
                onChange={(e) =>
                  setNewValue({ ...newValue, is_default: e.target.checked })
                }
              />
              <Label
                className="text-[11px] font-serif italic text-admin-text-secondary"
                htmlFor="edit_is_default"
              >
                Marcar como opción por defecto
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="rounded-xl border-admin-border-primary/20 font-display font-bold text-[10px] tracking-widest uppercase"
              variant="outline"
              onClick={() => setShowEditValueDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23] font-display font-bold text-[10px] tracking-widest uppercase"
              onClick={handleEditValue}
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

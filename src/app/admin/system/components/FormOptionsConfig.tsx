"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-admin-text-primary tracking-tight uppercase mb-1">
          Configuración de Formularios
        </h2>
        <p className="text-[11px] font-serif italic text-admin-text-tertiary uppercase tracking-wider">
          Personaliza las opciones de los menús desplegables en cada formulario
          del sistema.
        </p>
      </div>

      <div className="flex gap-4">
        <div className="w-56 flex-shrink-0 space-y-2">
          <Label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest">
            Formulario
          </Label>
          <Select value={selectedFormType} onValueChange={setSelectedFormType}>
            <SelectTrigger className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-admin-border-primary/20">
              {FORM_TYPES.map((ft) => (
                <SelectItem
                  key={ft.value}
                  value={ft.value}
                  className="font-display text-[10px] tracking-widest uppercase"
                >
                  {ft.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-admin-bg-tertiary border border-admin-border-primary/20 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-display font-bold text-admin-text-primary uppercase tracking-tight">
            <FileText className="h-5 w-5 text-admin-accent-primary" />
            {formTypeInfo?.label}
          </CardTitle>
          <p className="text-[11px] font-serif italic text-admin-text-tertiary uppercase tracking-wider">
            {formTypeInfo?.description}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentFields.length === 0 ? (
            <p className="text-admin-text-tertiary text-[11px] font-serif italic py-4">
              No hay campos configurados para este formulario.
            </p>
          ) : (
            currentFields.map((field) => (
              <div
                key={field.id}
                className="border border-admin-border-primary/20 rounded-xl p-4 bg-admin-bg-primary/50"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-display font-bold text-admin-text-primary text-base uppercase tracking-tight">
                      {field.field_label}
                    </h3>
                    <p className="text-[11px] font-serif italic text-admin-text-tertiary mt-1">
                      Campo:{" "}
                      <code className="bg-admin-bg-tertiary border border-admin-border-primary/10 px-1.5 py-0.5 rounded-xl text-admin-text-secondary font-display text-[10px]">
                        {field.field_key}
                      </code>
                      {field.is_array && (
                        <Badge
                          variant="secondary"
                          className="ml-2 rounded-xl text-[9px] font-display font-bold uppercase tracking-wider border-admin-border-primary/20"
                        >
                          Múltiples valores
                        </Badge>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openAddDialog(field)}
                    className="flex items-center gap-2 h-9 rounded-xl border-admin-border-primary/20 font-display font-bold text-[10px] tracking-widest uppercase bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23]"
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
                        className={`flex items-center justify-between p-3 rounded-xl border border-admin-border-primary/20 ${
                          !value.is_active
                            ? "bg-admin-bg-tertiary/50 opacity-60"
                            : "bg-admin-bg-tertiary"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical className="h-4 w-4 text-admin-text-tertiary" />
                          <span className="font-display font-bold text-admin-text-primary text-sm uppercase tracking-tight">
                            {value.label}
                          </span>
                          <code className="text-[10px] bg-admin-bg-primary/50 border border-admin-border-primary/10 px-1.5 py-0.5 rounded-xl text-admin-text-secondary font-display">
                            {value.value}
                          </code>
                          {value.is_default && (
                            <Badge className="text-[9px] font-display font-bold uppercase tracking-wider rounded-xl bg-admin-accent-primary/20 text-admin-accent-primary border border-admin-accent-primary/30">
                              Por defecto
                            </Badge>
                          )}
                          {!value.is_active && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] font-display font-bold uppercase rounded-xl border-admin-border-primary/20 text-admin-text-tertiary"
                            >
                              Inactivo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleValueActive(value)}
                            title={value.is_active ? "Desactivar" : "Activar"}
                            className="text-admin-text-tertiary hover:text-admin-text-primary hover:bg-admin-accent-primary/10 rounded-xl h-8 w-8 p-0"
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
                            className="text-admin-text-tertiary hover:text-admin-text-primary hover:bg-admin-accent-primary/10 rounded-xl h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteValue(value)}
                            className="text-admin-error hover:text-admin-error hover:bg-admin-error/10 rounded-xl h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-admin-text-tertiary text-[11px] font-serif italic py-2">
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
                htmlFor="new_value"
                className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest block mb-2"
              >
                Valor
              </Label>
              <p className="text-[11px] font-serif italic text-admin-text-tertiary mb-1">
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
                className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-sm"
              />
            </div>
            <div>
              <Label
                htmlFor="new_label"
                className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest block mb-2"
              >
                Etiqueta (mostrar)
              </Label>
              <Input
                id="new_label"
                value={newValue.label}
                onChange={(e) =>
                  setNewValue({ ...newValue, label: e.target.value })
                }
                placeholder="Ej: Nuevo Tipo"
                className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-sm"
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
                className="rounded border-admin-border-primary text-admin-accent-primary focus:ring-admin-accent-primary"
              />
              <Label
                htmlFor="is_default"
                className="text-[11px] font-serif italic text-admin-text-secondary"
              >
                Marcar como opción por defecto
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddValueDialog(false)}
              className="rounded-xl border-admin-border-primary/20 font-display font-bold text-[10px] tracking-widest uppercase"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddValue}
              className="rounded-xl bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23] font-display font-bold text-[10px] tracking-widest uppercase"
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
                htmlFor="edit_value"
                className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest block mb-2"
              >
                Valor
              </Label>
              <Input
                id="edit_value"
                value={newValue.value}
                disabled
                className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-sm text-admin-text-tertiary"
              />
              <p className="text-[11px] font-serif italic text-admin-text-tertiary mt-1">
                El valor no se puede modificar
              </p>
            </div>
            <div>
              <Label
                htmlFor="edit_label"
                className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest block mb-2"
              >
                Etiqueta (mostrar)
              </Label>
              <Input
                id="edit_label"
                value={newValue.label}
                onChange={(e) =>
                  setNewValue({ ...newValue, label: e.target.value })
                }
                placeholder="Ej: Nuevo Tipo"
                className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-sm"
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
                className="rounded border-admin-border-primary text-admin-accent-primary focus:ring-admin-accent-primary"
              />
              <Label
                htmlFor="edit_is_default"
                className="text-[11px] font-serif italic text-admin-text-secondary"
              >
                Marcar como opción por defecto
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditValueDialog(false)}
              className="rounded-xl border-admin-border-primary/20 font-display font-bold text-[10px] tracking-widest uppercase"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditValue}
              className="rounded-xl bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23] font-display font-bold text-[10px] tracking-widest uppercase"
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { Edit2, Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { OptionField, OptionValue } from "../types";

interface Props {
  field: OptionField & { values?: OptionValue[] };
  onAddValue: (field: OptionField) => void;
  onEditValue: (value: OptionValue) => void;
  onDeleteValue: (value: OptionValue) => void;
  onToggleValue: (value: OptionValue) => void;
}

export function OptionFieldCard({ field, onAddValue, onEditValue, onDeleteValue, onToggleValue }: Props) {
  return (
    <div className="border rounded-lg p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-start gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-lg">{field.field_label}</h3>
          <p className="text-sm text-gray-500">
            Campo: <code className="bg-gray-100 px-1 rounded">{field.field_key}</code>
            {field.is_array && <Badge className="ml-2" variant="secondary">Múltiples valores</Badge>}
          </p>
        </div>
        <Button className="flex items-center gap-2" size="sm" onClick={() => onAddValue(field)}>
          <Plus className="h-4 w-4" /> Agregar Opción
        </Button>
      </div>
      <div className="space-y-2">
        {field.values && field.values.length > 0 ? field.values.map((value) => (
          <div className={`flex items-center justify-between p-2 rounded border ${!value.is_active ? "bg-gray-50 opacity-60" : "bg-white"}`} key={value.id}>
            <div className="flex items-center gap-3 flex-1">
              <GripVertical className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{value.label}</span>
              <code className="text-xs bg-gray-100 px-1 rounded text-gray-600">{value.value}</code>
              {value.is_default && <Badge className="text-xs" variant="default">Por defecto</Badge>}
              {!value.is_active && <Badge className="text-xs" variant="secondary">Inactivo</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" title={value.is_active ? "Desactivar" : "Activar"} variant="ghost" onClick={() => onToggleValue(value)}>
                {value.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onEditValue(value)}><Edit2 className="h-4 w-4" /></Button>
              <Button className="text-red-600 hover:text-red-700" size="sm" variant="ghost" onClick={() => onDeleteValue(value)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        )) : (
          <p className="text-gray-500 text-sm py-2">No hay opciones configuradas</p>
        )}
      </div>
    </div>
  );
}

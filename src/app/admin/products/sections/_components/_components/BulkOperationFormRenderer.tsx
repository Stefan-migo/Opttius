"use client";

import { AlertTriangle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BulkOperationFormRenderer(
  bulkOperation: string,
  bulkUpdates: unknown,
  setBulkUpdates: (updates: unknown) => void,
  categories: unknown[],
  forceDelete: boolean,
  setForceDelete: (v: boolean) => void,
) {
  const updates = bulkUpdates as Record<string, string | number>;

  switch (bulkOperation) {
    case "update_status":
      return (
        <div className="space-y-2">
          <Label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block" htmlFor="status">
            Nuevo Estado
          </Label>
          <Select value={String(updates?.status ?? "")} onValueChange={(v) => setBulkUpdates({ ...updates, status: v })}>
            <SelectTrigger className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="archived">Archivado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

    case "update_category":
      return (
        <div className="space-y-2">
          <Label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block" htmlFor="category">
            Nueva Categoría
          </Label>
          <Select value={String(updates?.category_id ?? "")} onValueChange={(v) => setBulkUpdates({ ...updates, category_id: v })}>
            <SelectTrigger className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              {(categories as Array<{ id: string; name: string }>).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "update_pricing":
      return (
        <div className="space-y-2">
          <Label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block">Tipo de Ajuste</Label>
          <Select value={String(updates?.adjustment_type ?? "")} onValueChange={(v) => setBulkUpdates({ ...updates, adjustment_type: v })}>
            <SelectTrigger className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
              <SelectValue placeholder="Tipo de ajuste" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Porcentaje</SelectItem>
              <SelectItem value="fixed">Monto Fijo</SelectItem>
            </SelectContent>
          </Select>
          <Label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block">
            Ajuste {updates?.adjustment_type === "percentage" ? "(%)" : "($)"}
          </Label>
          <Input
            className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest"
            placeholder={updates?.adjustment_type === "percentage" ? "ej: 10 para +10%" : "ej: 500 para +$500"}
            step="0.01" type="number"
            onChange={(e) => setBulkUpdates({ ...updates, price_adjustment: parseFloat(e.target.value) })}
          />
        </div>
      );

    case "update_inventory":
      return (
        <div className="space-y-2">
          <Label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block">Tipo de Ajuste</Label>
          <Select value={String(updates?.adjustment_type ?? "")} onValueChange={(v) => setBulkUpdates({ ...updates, adjustment_type: v })}>
            <SelectTrigger className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
              <SelectValue placeholder="Tipo de ajuste" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="set">Establecer cantidad</SelectItem>
              <SelectItem value="add">Agregar/Quitar</SelectItem>
            </SelectContent>
          </Select>
          <Label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block">
            {updates?.adjustment_type === "set" ? "Nueva Cantidad" : "Ajuste (+/-)"}
          </Label>
          <Input
            className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest"
            placeholder={updates?.adjustment_type === "set" ? "ej: 50" : "ej: -10 o +20"}
            type="number"
            onChange={(e) => setBulkUpdates({ ...updates, inventory_adjustment: parseInt(e.target.value) })}
          />
        </div>
      );

    case "delete":
      return (
        <div className="space-y-2">
          <div className="flex items-start space-x-2 p-3 bg-admin-error/5 border border-admin-error/20 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-admin-error mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-display font-bold text-admin-error text-sm uppercase tracking-wider">Confirmar eliminación suave</p>
              <p className="text-[11px] font-serif italic text-admin-text-secondary mt-0.5">Los productos seleccionados serán archivados. Esta acción se puede deshacer.</p>
            </div>
          </div>
        </div>
      );

    case "hard_delete":
      return (
        <div className="space-y-2">
          <div className="flex items-start space-x-2 p-3 bg-admin-error/10 border border-admin-error/30 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-admin-error mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-display font-bold text-admin-error text-sm uppercase tracking-wider">⚠️ ELIMINACIÓN PERMANENTE</p>
              <p className="text-[11px] font-serif italic text-admin-text-secondary mt-0.5">Los productos seleccionados serán ELIMINADOS PERMANENTEMENTE.</p>
              <p className="text-[11px] font-display font-bold text-admin-error mt-1">⚠️ Esta acción NO se puede deshacer.</p>
            </div>
          </div>
          <div className="p-2.5 bg-admin-warning/10 border border-admin-warning/30 rounded-xl">
            <p className="text-[11px] font-serif italic text-admin-text-secondary">
              <strong>Recomendación:</strong> Considera usar &quot;Eliminación suave&quot; (archivar) en su lugar.
            </p>
          </div>
          <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl">
            <div className="flex items-start space-x-2">
              <input checked={forceDelete} className="mt-0.5" id="force-delete" type="checkbox"
                onChange={(e) => setForceDelete(e.target.checked)} />
              <label className="text-xs text-orange-900 font-medium cursor-pointer leading-tight" htmlFor="force-delete">
                Confirmo que entiendo que esta acción es irreversible y deseo continuar.
              </label>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

"use client";

import { AlertTriangle, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { Branch, Driver, InternalOrder, Vehicle } from "./types";

interface OrderDialogsProps {
  showOrderDialog: boolean;
  showDeleteDialog: boolean;
  editingOrder: InternalOrder | null;
  deletingItem: { type: "order"; id: string; orderNumber: string } | null;
  orderForm: {
    origin_branch_id: string;
    destination_branch_id: string;
    priority: string;
    scheduled_pickup_date: string;
    estimated_delivery_date: string;
    notes: string;
    driver_id: string;
    vehicle_id: string;
  };
  branches: Branch[];
  drivers: Driver[];
  vehicles: Vehicle[];
  onOrderDialogChange: (v: boolean) => void;
  onDeleteDialogChange: (v: boolean) => void;
  onFormChange: (v: typeof orderForm) => void;
  onSave: () => void;
  onConfirmDelete: () => void;
}

export function OrderDialogs({
  showOrderDialog, showDeleteDialog, editingOrder, deletingItem,
  orderForm, branches, drivers, vehicles,
  onOrderDialogChange, onDeleteDialogChange, onFormChange,
  onSave, onConfirmDelete,
}: OrderDialogsProps) {
  return (
    <>
      <Dialog open={showOrderDialog} onOpenChange={onOrderDialogChange}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrder ? "Editar Orden Interna" : "Nueva Orden Interna"}</DialogTitle>
            <DialogDescription>Configura una orden de transferencia entre sucursales</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sucursal Origen *</Label>
                <Select value={orderForm.origin_branch_id} onValueChange={(v) => onFormChange({ ...orderForm, origin_branch_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar sucursal origen" /></SelectTrigger>
                  <SelectContent>{branches.filter((b) => b.is_active).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sucursal Destino *</Label>
                <Select value={orderForm.destination_branch_id} onValueChange={(v) => onFormChange({ ...orderForm, destination_branch_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar sucursal destino" /></SelectTrigger>
                  <SelectContent>{branches.filter((b) => b.is_active).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridad</Label>
                <Select value={orderForm.priority} onValueChange={(v) => onFormChange({ ...orderForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Baja</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="urgent">Urgente</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conductor</Label>
                <Select value={orderForm.driver_id} onValueChange={(v) => onFormChange({ ...orderForm, driver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar conductor" /></SelectTrigger>
                  <SelectContent>{drivers.filter((d) => d.is_active).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fecha de Recogida Programada</Label><Input type="datetime-local" value={orderForm.scheduled_pickup_date} onChange={(e) => onFormChange({ ...orderForm, scheduled_pickup_date: e.target.value })} /></div>
              <div><Label>Fecha Estimada de Entrega</Label><Input type="datetime-local" value={orderForm.estimated_delivery_date} onChange={(e) => onFormChange({ ...orderForm, estimated_delivery_date: e.target.value })} /></div>
            </div>
            <div>
              <Label>Vehículo</Label>
              <Select value={orderForm.vehicle_id} onValueChange={(v) => onFormChange({ ...orderForm, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar vehículo" /></SelectTrigger>
                <SelectContent>{vehicles.filter((v) => v.is_active).map((v) => <SelectItem key={v.id} value={v.id}>{v.plate_number} - {v.model}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notas</Label><Textarea placeholder="Instrucciones especiales o notas adicionales" rows={3} value={orderForm.notes} onChange={(e) => onFormChange({ ...orderForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOrderDialogChange(false)}>Cancelar</Button>
            <Button onClick={onSave}><Save className="h-4 w-4 mr-2" />Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={onDeleteDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600"><AlertTriangle className="h-5 w-5 mr-2" />Eliminar Orden</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la orden interna <span className="font-bold">&quot;{deletingItem?.orderNumber}&quot;</span>?<br /><br />Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onDeleteDialogChange(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={onConfirmDelete}><Trash2 className="h-4 w-4 mr-2" />Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

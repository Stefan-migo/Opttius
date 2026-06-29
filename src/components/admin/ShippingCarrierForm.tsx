"use client";

import { Edit, Plus, Save, Truck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ShippingCarrier {
  id: string;
  name: string;
  code: string;
  tracking_url_template?: string;
  api_key?: string;
  is_active: boolean;
}

export default function ShippingCarrierForm() {
  const [carriers, setCarriers] = useState<ShippingCarrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<ShippingCarrier | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  const [form, setForm] = useState({
    name: "",
    code: "",
    tracking_url_template: "",
    api_key: "",
    is_active: true,
  });

  useEffect(() => {
    fetchCarriers();
  }, []);

  const fetchCarriers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/system/shipping/carriers");
      if (res.ok) {
        const data = await res.json();
        setCarriers(data.carriers || []);
      }
    } catch {
      toast.error("Error al cargar transportistas");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCarrier(null);
    setForm({ name: "", code: "", tracking_url_template: "", api_key: "", is_active: true });
    setShowDialog(true);
  };

  const handleEdit = (carrier: ShippingCarrier) => {
    setEditingCarrier(carrier);
    setForm({
      name: carrier.name,
      code: carrier.code,
      tracking_url_template: carrier.tracking_url_template || "",
      api_key: carrier.api_key || "",
      is_active: carrier.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code) {
      toast.error("Nombre y código son requeridos");
      return;
    }
    try {
      const url = "/api/admin/system/shipping/carriers";
      const method = editingCarrier ? "PUT" : "POST";
      const body = editingCarrier ? { id: editingCarrier.id, ...form } : form;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al guardar transportista");
      }
      toast.success(editingCarrier ? "Transportista actualizado" : "Transportista creado");
      setShowDialog(false);
      fetchCarriers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar transportista");
    }
  };

  const handleToggleActive = async (carrier: ShippingCarrier) => {
    try {
      const res = await fetch("/api/admin/system/shipping/carriers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: carrier.id, is_active: !carrier.is_active }),
      });
      if (!res.ok) throw new Error("Error al actualizar transportista");
      toast.success(`Transportista ${!carrier.is_active ? "activado" : "desactivado"}`);
      fetchCarriers();
    } catch {
      toast.error("Error al actualizar transportista");
    }
  };

  const handleDelete = (carrier: ShippingCarrier) => {
    setDeletingId(carrier.id);
    setDeletingName(carrier.name);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/admin/system/shipping/carriers?id=${deletingId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al eliminar");
      }
      toast.success("Transportista eliminado");
      setShowDeleteDialog(false);
      setDeletingId(null);
      fetchCarriers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-tierra-media">Cargando transportistas...</div>;
  }

  return (
    <>
      <Card className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]" style={{ backgroundColor: "var(--admin-border-primary)" }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Transportistas
              </CardTitle>
              <CardDescription>
                {carriers.length} {carriers.length === 1 ? "transportista" : "transportistas"} configurados
              </CardDescription>
            </div>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Transportista
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {carriers.length === 0 ? (
            <p className="text-sm text-tierra-media text-center py-4">No hay transportistas configurados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carriers.map((carrier) => (
                  <TableRow key={carrier.id}>
                    <TableCell className="font-medium">{carrier.name}</TableCell>
                    <TableCell className="font-mono text-sm">{carrier.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={carrier.is_active} onCheckedChange={() => handleToggleActive(carrier)} />
                        <Badge variant={carrier.is_active ? "default" : "outline"}>{carrier.is_active ? "Activo" : "Inactivo"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(carrier)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(carrier)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Carrier Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCarrier ? "Editar Transportista" : "Nuevo Transportista"}</DialogTitle>
            <DialogDescription>Configura un transportista para seguimiento de envíos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input placeholder="Ej: OCA, Andreani" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Código *</Label>
              <Input disabled={!!editingCarrier} placeholder="oca, andreani" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s+/g, "_") })} />
              <p className="text-xs text-tierra-media mt-1">Código único (solo minúsculas y guiones bajos)</p>
            </div>
            <div>
              <Label>URL de Seguimiento</Label>
              <Input placeholder="https://example.com/track/{tracking_number}" value={form.tracking_url_template} onChange={(e) => setForm({ ...form, tracking_url_template: e.target.value })} />
              <p className="text-xs text-tierra-media mt-1">Usa {"{tracking_number}"} como placeholder para el número de seguimiento</p>
            </div>
            <div>
              <Label>API Key (opcional)</Label>
              <Input placeholder="API key para integración" type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
              <Label>Transportista activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>¿Estás seguro de que deseas eliminar {deletingName}? Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}><Trash2 className="h-4 w-4 mr-2" />Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

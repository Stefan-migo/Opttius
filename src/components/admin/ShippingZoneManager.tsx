"use client";

import { Edit, MapPin, Plus, Save, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

interface ShippingZone {
  id: string;
  name: string;
  description?: string;
  countries: string[];
  states?: string[];
  cities?: string[];
  postal_codes?: string[];
  is_active: boolean;
  sort_order?: number;
}

export default function ShippingZoneManager() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    countries: ["Argentina"] as string[],
    states: [] as string[],
    cities: [] as string[],
    postal_codes: [] as string[],
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/system/shipping/zones");
      if (res.ok) {
        const data = await res.json();
        setZones(data.zones || []);
      }
    } catch {
      toast.error("Error al cargar zonas");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingZone(null);
    setForm({
      name: "",
      description: "",
      countries: ["Argentina"],
      states: [],
      cities: [],
      postal_codes: [],
      is_active: true,
      sort_order: 0,
    });
    setShowDialog(true);
  };

  const handleEdit = (zone: ShippingZone) => {
    setEditingZone(zone);
    setForm({
      name: zone.name,
      description: zone.description || "",
      countries: zone.countries || ["Argentina"],
      states: zone.states || [],
      cities: zone.cities || [],
      postal_codes: zone.postal_codes || [],
      is_active: zone.is_active,
      sort_order: zone.sort_order || 0,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error("El nombre es requerido");
      return;
    }
    try {
      const url = editingZone
        ? `/api/admin/system/shipping/zones/${editingZone.id}`
        : "/api/admin/system/shipping/zones";
      const res = await fetch(url, {
        method: editingZone ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al guardar zona");
      }
      toast.success(editingZone ? "Zona actualizada" : "Zona creada");
      setShowDialog(false);
      fetchZones();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar zona");
    }
  };

  const handleToggleActive = async (zone: ShippingZone) => {
    try {
      const res = await fetch(
        `/api/admin/system/shipping/zones/${zone.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: !zone.is_active }),
        },
      );
      if (!res.ok) throw new Error("Error al actualizar zona");
      toast.success(`Zona ${!zone.is_active ? "activada" : "desactivada"}`);
      fetchZones();
    } catch {
      toast.error("Error al actualizar zona");
    }
  };

  const handleDelete = (zone: ShippingZone) => {
    setDeletingId(zone.id);
    setDeletingName(zone.name);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/admin/system/shipping/zones/${deletingId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al eliminar");
      }
      toast.success("Zona eliminada");
      setShowDeleteDialog(false);
      setDeletingId(null);
      fetchZones();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-tierra-media">Cargando zonas...</div>;
  }

  return (
    <>
      <Card className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]" style={{ backgroundColor: "var(--admin-border-primary)" }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Zonas de Envío
              </CardTitle>
              <CardDescription>
                {zones.length} {zones.length === 1 ? "zona" : "zonas"} configuradas
              </CardDescription>
            </div>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Zona
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <p className="text-sm text-tierra-media text-center py-4">No hay zonas configuradas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Países</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">{zone.name}</TableCell>
                    <TableCell>{zone.countries?.join(", ") || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={zone.is_active} onCheckedChange={() => handleToggleActive(zone)} />
                        <Badge variant={zone.is_active ? "default" : "outline"}>
                          {zone.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(zone)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(zone)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Zone Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingZone ? "Editar Zona de Envío" : "Nueva Zona de Envío"}</DialogTitle>
            <DialogDescription>Configura una zona geográfica para aplicar tarifas de envío</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input placeholder="Ej: Argentina, CABA, Interior" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea placeholder="Descripción de la zona" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Países (separados por comas)</Label>
              <Input placeholder="Argentina, Uruguay" value={form.countries.join(", ")} onChange={(e) => setForm({ ...form, countries: e.target.value.split(",").map((c) => c.trim()).filter((c) => c) })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
              <Label>Zona activa</Label>
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

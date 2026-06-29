"use client";

import { DollarSign, Edit, Plus, Save, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}

interface ShippingRate {
  id: string;
  zone_id: string;
  name: string;
  description?: string;
  rate_type: "flat" | "weight" | "price" | "free";
  flat_rate?: number;
  weight_rate_per_kg?: number;
  price_rate_percentage?: number;
  min_weight?: number;
  max_weight?: number;
  min_price?: number;
  max_price?: number;
  free_shipping_threshold?: number;
  estimated_days_min?: number;
  estimated_days_max?: number;
  is_active: boolean;
  sort_order?: number;
}

export default function ShippingRateEditor() {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  const [form, setForm] = useState({
    zone_id: "",
    name: "",
    description: "",
    rate_type: "flat" as "flat" | "weight" | "price" | "free",
    flat_rate: 0,
    weight_rate_per_kg: 0,
    price_rate_percentage: 0,
    min_weight: undefined as number | undefined,
    max_weight: undefined as number | undefined,
    min_price: undefined as number | undefined,
    max_price: undefined as number | undefined,
    free_shipping_threshold: undefined as number | undefined,
    estimated_days_min: undefined as number | undefined,
    estimated_days_max: undefined as number | undefined,
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ratesRes, zonesRes] = await Promise.all([
        fetch("/api/admin/system/shipping/rates"),
        fetch("/api/admin/system/shipping/zones"),
      ]);
      if (ratesRes.ok) {
        const data = await ratesRes.json();
        setRates(data.rates || []);
      }
      if (zonesRes.ok) {
        const data = await zonesRes.json();
        setZones(data.zones || []);
      }
    } catch {
      toast.error("Error al cargar tarifas");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRate(null);
    setForm({
      zone_id: zones[0]?.id || "",
      name: "",
      description: "",
      rate_type: "flat",
      flat_rate: 0,
      weight_rate_per_kg: 0,
      price_rate_percentage: 0,
      min_weight: undefined,
      max_weight: undefined,
      min_price: undefined,
      max_price: undefined,
      free_shipping_threshold: undefined,
      estimated_days_min: undefined,
      estimated_days_max: undefined,
      is_active: true,
      sort_order: 0,
    });
    setShowDialog(true);
  };

  const handleEdit = (rate: ShippingRate) => {
    setEditingRate(rate);
    setForm({
      zone_id: rate.zone_id,
      name: rate.name,
      description: rate.description || "",
      rate_type: rate.rate_type,
      flat_rate: rate.flat_rate || 0,
      weight_rate_per_kg: rate.weight_rate_per_kg || 0,
      price_rate_percentage: rate.price_rate_percentage || 0,
      min_weight: rate.min_weight,
      max_weight: rate.max_weight,
      min_price: rate.min_price,
      max_price: rate.max_price,
      free_shipping_threshold: rate.free_shipping_threshold,
      estimated_days_min: rate.estimated_days_min,
      estimated_days_max: rate.estimated_days_max,
      is_active: rate.is_active,
      sort_order: rate.sort_order || 0,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.zone_id || !form.rate_type) {
      toast.error("Nombre, zona y tipo de tarifa son requeridos");
      return;
    }
    try {
      const url = editingRate
        ? `/api/admin/system/shipping/rates/${editingRate.id}`
        : "/api/admin/system/shipping/rates";
      const res = await fetch(url, {
        method: editingRate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al guardar tarifa");
      }
      toast.success(editingRate ? "Tarifa actualizada" : "Tarifa creada");
      setShowDialog(false);
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar tarifa");
    }
  };

  const handleToggleActive = async (rate: ShippingRate) => {
    try {
      const res = await fetch(`/api/admin/system/shipping/rates/${rate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !rate.is_active }),
      });
      if (!res.ok) throw new Error("Error al actualizar tarifa");
      toast.success(`Tarifa ${!rate.is_active ? "activada" : "desactivada"}`);
      fetchData();
    } catch {
      toast.error("Error al actualizar tarifa");
    }
  };

  const handleDelete = (rate: ShippingRate) => {
    setDeletingId(rate.id);
    setDeletingName(rate.name);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/admin/system/shipping/rates/${deletingId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al eliminar");
      }
      toast.success("Tarifa eliminada");
      setShowDeleteDialog(false);
      setDeletingId(null);
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-tierra-media">Cargando tarifas...</div>;
  }

  return (
    <>
      <Card className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]" style={{ backgroundColor: "var(--admin-border-primary)" }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Tarifas de Envío
              </CardTitle>
              <CardDescription>
                {rates.length} {rates.length === 1 ? "tarifa" : "tarifas"} configuradas
              </CardDescription>
            </div>
            <Button disabled={zones.length === 0} size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tarifa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <p className="text-sm text-tierra-media text-center py-4">No hay tarifas configuradas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => {
                  const zone = zones.find((z) => z.id === rate.zone_id);
                  let priceDisplay = "N/A";
                  if (rate.rate_type === "flat") {
                    priceDisplay = `$${rate.flat_rate?.toLocaleString("es-AR") || "0"}`;
                  } else if (rate.rate_type === "weight") {
                    priceDisplay = `$${rate.weight_rate_per_kg?.toLocaleString("es-AR") || "0"}/kg`;
                  } else if (rate.rate_type === "price") {
                    priceDisplay = `${rate.price_rate_percentage || 0}%`;
                  } else {
                    priceDisplay = "Gratis";
                  }
                  return (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.name}</TableCell>
                      <TableCell>{zone?.name || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {rate.rate_type === "flat" ? "Fija" : rate.rate_type === "weight" ? "Por Peso" : rate.rate_type === "price" ? "Por Precio" : "Gratis"}
                        </Badge>
                      </TableCell>
                      <TableCell>{priceDisplay}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={rate.is_active} onCheckedChange={() => handleToggleActive(rate)} />
                          <Badge variant={rate.is_active ? "default" : "outline"}>{rate.is_active ? "Activa" : "Inactiva"}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(rate)}><Edit className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(rate)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Rate Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRate ? "Editar Tarifa de Envío" : "Nueva Tarifa de Envío"}</DialogTitle>
            <DialogDescription>Configura una tarifa de envío para una zona específica</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Zona *</Label>
              <Select value={form.zone_id} onValueChange={(v) => setForm({ ...form, zone_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar zona" /></SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nombre *</Label>
              <Input placeholder="Ej: Envío Estándar, Envío Express" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea placeholder="Descripción de la tarifa" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Tipo de Tarifa *</Label>
              <Select value={form.rate_type} onValueChange={(v: unknown) => setForm({ ...form, rate_type: v as "flat" | "weight" | "price" | "free" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Fija</SelectItem>
                  <SelectItem value="weight">Por Peso (por kg)</SelectItem>
                  <SelectItem value="price">Por Precio (porcentaje)</SelectItem>
                  <SelectItem value="free">Gratis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.rate_type === "flat" && (
              <div>
                <Label>Precio Fijo (ARS) *</Label>
                <Input placeholder="5000" type="number" value={form.flat_rate} onChange={(e) => setForm({ ...form, flat_rate: parseFloat(e.target.value) || 0 })} />
              </div>
            )}
            {form.rate_type === "weight" && (
              <div>
                <Label>Precio por kg (ARS) *</Label>
                <Input placeholder="1000" type="number" value={form.weight_rate_per_kg} onChange={(e) => setForm({ ...form, weight_rate_per_kg: parseFloat(e.target.value) || 0 })} />
              </div>
            )}
            {form.rate_type === "price" && (
              <div>
                <Label>Porcentaje del precio (%) *</Label>
                <Input placeholder="5" type="number" value={form.price_rate_percentage} onChange={(e) => setForm({ ...form, price_rate_percentage: parseFloat(e.target.value) || 0 })} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Días estimados (mínimo)</Label>
                <Input placeholder="3" type="number" value={form.estimated_days_min || ""} onChange={(e) => setForm({ ...form, estimated_days_min: e.target.value ? parseInt(e.target.value) : undefined })} />
              </div>
              <div>
                <Label>Días estimados (máximo)</Label>
                <Input placeholder="7" type="number" value={form.estimated_days_max || ""} onChange={(e) => setForm({ ...form, estimated_days_max: e.target.value ? parseInt(e.target.value) : undefined })} />
              </div>
            </div>
            <div>
              <Label>Umbral de envío gratis (ARS)</Label>
              <Input placeholder="50000" type="number" value={form.free_shipping_threshold || ""} onChange={(e) => setForm({ ...form, free_shipping_threshold: e.target.value ? parseFloat(e.target.value) : undefined })} />
              <p className="text-xs text-tierra-media mt-1">Si el pedido supera este monto, el envío será gratis</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
              <Label>Tarifa activa</Label>
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

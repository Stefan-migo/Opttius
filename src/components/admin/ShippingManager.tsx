"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Truck,
  Plus,
  MapPin,
  DollarSign,
  Package,
  Edit,
  Trash2,
  X,
  Save,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

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

interface ShippingCarrier {
  id: string;
  name: string;
  code: string;
  tracking_url_template?: string;
  api_key?: string;
  is_active: boolean;
}

export default function ShippingManager() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [carriers, setCarriers] = useState<ShippingCarrier[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [showCarrierDialog, setShowCarrierDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Form states
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [editingCarrier, setEditingCarrier] = useState<ShippingCarrier | null>(
    null,
  );
  const [deletingItem, setDeletingItem] = useState<{
    type: "zone" | "rate" | "carrier";
    id: string;
    name: string;
  } | null>(null);

  // Zone form
  const [zoneForm, setZoneForm] = useState({
    name: "",
    description: "",
    countries: ["Argentina"] as string[],
    states: [] as string[],
    cities: [] as string[],
    postal_codes: [] as string[],
    is_active: true,
    sort_order: 0,
  });

  // Rate form
  const [rateForm, setRateForm] = useState({
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

  // Carrier form
  const [carrierForm, setCarrierForm] = useState({
    name: "",
    code: "",
    tracking_url_template: "",
    api_key: "",
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [zonesRes, ratesRes, carriersRes] = await Promise.all([
        fetch("/api/admin/system/shipping/zones"),
        fetch("/api/admin/system/shipping/rates"),
        fetch("/api/admin/system/shipping/carriers"),
      ]);

      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        setZones(zonesData.zones || []);
      }

      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setRates(ratesData.rates || []);
      }

      if (carriersRes.ok) {
        const carriersData = await carriersRes.json();
        setCarriers(carriersData.carriers || []);
      }
    } catch (error) {
      console.error("Error fetching shipping data:", error);
      toast.error("Error al cargar datos de envío");
    } finally {
      setLoading(false);
    }
  };

  // Zone handlers
  const handleCreateZone = () => {
    setEditingZone(null);
    setZoneForm({
      name: "",
      description: "",
      countries: ["Argentina"],
      states: [],
      cities: [],
      postal_codes: [],
      is_active: true,
      sort_order: 0,
    });
    setShowZoneDialog(true);
  };

  const handleEditZone = (zone: ShippingZone) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      description: zone.description || "",
      countries: zone.countries || ["Argentina"],
      states: zone.states || [],
      cities: zone.cities || [],
      postal_codes: zone.postal_codes || [],
      is_active: zone.is_active,
      sort_order: zone.sort_order || 0,
    });
    setShowZoneDialog(true);
  };

  const handleSaveZone = async () => {
    try {
      if (!zoneForm.name) {
        toast.error("El nombre es requerido");
        return;
      }

      const url = editingZone
        ? `/api/admin/system/shipping/zones/${editingZone.id}`
        : "/api/admin/system/shipping/zones";

      const method = editingZone ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zoneForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar zona");
      }

      toast.success(editingZone ? "Zona actualizada" : "Zona creada");
      setShowZoneDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error saving zone:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al guardar zona",
      );
    }
  };

  const handleDeleteZone = (zone: ShippingZone) => {
    setDeletingItem({ type: "zone", id: zone.id, name: zone.name });
    setShowDeleteDialog(true);
  };

  const handleToggleZoneActive = async (zone: ShippingZone) => {
    try {
      const response = await fetch(
        `/api/admin/system/shipping/zones/${zone.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: !zone.is_active }),
        },
      );

      if (!response.ok) throw new Error("Error al actualizar zona");

      toast.success(`Zona ${!zone.is_active ? "activada" : "desactivada"}`);
      fetchData();
    } catch (error) {
      toast.error("Error al actualizar zona");
    }
  };

  // Rate handlers
  const handleCreateRate = () => {
    setEditingRate(null);
    setRateForm({
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
    setShowRateDialog(true);
  };

  const handleEditRate = (rate: ShippingRate) => {
    setEditingRate(rate);
    setRateForm({
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
    setShowRateDialog(true);
  };

  const handleSaveRate = async () => {
    try {
      if (!rateForm.name || !rateForm.zone_id || !rateForm.rate_type) {
        toast.error("Nombre, zona y tipo de tarifa son requeridos");
        return;
      }

      const url = editingRate
        ? `/api/admin/system/shipping/rates/${editingRate.id}`
        : "/api/admin/system/shipping/rates";

      const method = editingRate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rateForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar tarifa");
      }

      toast.success(editingRate ? "Tarifa actualizada" : "Tarifa creada");
      setShowRateDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error saving rate:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al guardar tarifa",
      );
    }
  };

  const handleDeleteRate = (rate: ShippingRate) => {
    setDeletingItem({ type: "rate", id: rate.id, name: rate.name });
    setShowDeleteDialog(true);
  };

  const handleToggleRateActive = async (rate: ShippingRate) => {
    try {
      const response = await fetch(
        `/api/admin/system/shipping/rates/${rate.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: !rate.is_active }),
        },
      );

      if (!response.ok) throw new Error("Error al actualizar tarifa");

      toast.success(`Tarifa ${!rate.is_active ? "activada" : "desactivada"}`);
      fetchData();
    } catch (error) {
      toast.error("Error al actualizar tarifa");
    }
  };

  // Carrier handlers
  const handleCreateCarrier = () => {
    setEditingCarrier(null);
    setCarrierForm({
      name: "",
      code: "",
      tracking_url_template: "",
      api_key: "",
      is_active: true,
    });
    setShowCarrierDialog(true);
  };

  const handleEditCarrier = (carrier: ShippingCarrier) => {
    setEditingCarrier(carrier);
    setCarrierForm({
      name: carrier.name,
      code: carrier.code,
      tracking_url_template: carrier.tracking_url_template || "",
      api_key: carrier.api_key || "",
      is_active: carrier.is_active,
    });
    setShowCarrierDialog(true);
  };

  const handleSaveCarrier = async () => {
    try {
      if (!carrierForm.name || !carrierForm.code) {
        toast.error("Nombre y código son requeridos");
        return;
      }

      const url = "/api/admin/system/shipping/carriers";
      const method = editingCarrier ? "PUT" : "POST";
      const body = editingCarrier
        ? { id: editingCarrier.id, ...carrierForm }
        : carrierForm;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar transportista");
      }

      toast.success(
        editingCarrier ? "Transportista actualizado" : "Transportista creado",
      );
      setShowCarrierDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error saving carrier:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al guardar transportista",
      );
    }
  };

  const handleDeleteCarrier = (carrier: ShippingCarrier) => {
    setDeletingItem({ type: "carrier", id: carrier.id, name: carrier.name });
    setShowDeleteDialog(true);
  };

  const handleToggleCarrierActive = async (carrier: ShippingCarrier) => {
    try {
      const response = await fetch("/api/admin/system/shipping/carriers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: carrier.id, is_active: !carrier.is_active }),
      });

      if (!response.ok) throw new Error("Error al actualizar transportista");

      toast.success(
        `Transportista ${!carrier.is_active ? "activado" : "desactivado"}`,
      );
      fetchData();
    } catch (error) {
      toast.error("Error al actualizar transportista");
    }
  };

  // Delete handler
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    try {
      let url = "";
      if (deletingItem.type === "zone") {
        url = `/api/admin/system/shipping/zones/${deletingItem.id}`;
      } else if (deletingItem.type === "rate") {
        url = `/api/admin/system/shipping/rates/${deletingItem.id}`;
      } else {
        url = `/api/admin/system/shipping/carriers?id=${deletingItem.id}`;
      }

      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al eliminar");
      }

      toast.success("Eliminado exitosamente");
      setShowDeleteDialog(false);
      setDeletingItem(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-tierra-media">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-azul-profundo">
            Gestión de Envíos
          </h2>
          <p className="text-tierra-media">
            Configura zonas, tarifas y transportistas
          </p>
        </div>
      </div>

      {/* Zones Section */}
      <Card
        className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: "var(--admin-border-primary)" }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Zonas de Envío
              </CardTitle>
              <CardDescription>
                {zones.length} {zones.length === 1 ? "zona" : "zonas"}{" "}
                configuradas
              </CardDescription>
            </div>
            <Button onClick={handleCreateZone} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Zona
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <p className="text-sm text-tierra-media text-center py-4">
              No hay zonas configuradas
            </p>
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
                        <Switch
                          checked={zone.is_active}
                          onCheckedChange={() => handleToggleZoneActive(zone)}
                        />
                        <Badge variant={zone.is_active ? "default" : "outline"}>
                          {zone.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditZone(zone)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteZone(zone)}
                        >
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

      {/* Rates Section */}
      <Card
        className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: "var(--admin-border-primary)" }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Tarifas de Envío
              </CardTitle>
              <CardDescription>
                {rates.length} {rates.length === 1 ? "tarifa" : "tarifas"}{" "}
                configuradas
              </CardDescription>
            </div>
            <Button
              onClick={handleCreateRate}
              size="sm"
              disabled={zones.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tarifa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <p className="text-sm text-tierra-media text-center py-4">
              No hay tarifas configuradas
            </p>
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
                          {rate.rate_type === "flat"
                            ? "Fija"
                            : rate.rate_type === "weight"
                              ? "Por Peso"
                              : rate.rate_type === "price"
                                ? "Por Precio"
                                : "Gratis"}
                        </Badge>
                      </TableCell>
                      <TableCell>{priceDisplay}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rate.is_active}
                            onCheckedChange={() => handleToggleRateActive(rate)}
                          />
                          <Badge
                            variant={rate.is_active ? "default" : "outline"}
                          >
                            {rate.is_active ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRate(rate)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRate(rate)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
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

      {/* Carriers Section */}
      <Card
        className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: "var(--admin-border-primary)" }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Transportistas
              </CardTitle>
              <CardDescription>
                {carriers.length}{" "}
                {carriers.length === 1 ? "transportista" : "transportistas"}{" "}
                configurados
              </CardDescription>
            </div>
            <Button onClick={handleCreateCarrier} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Transportista
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {carriers.length === 0 ? (
            <p className="text-sm text-tierra-media text-center py-4">
              No hay transportistas configurados
            </p>
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
                    <TableCell className="font-medium">
                      {carrier.name}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {carrier.code}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={carrier.is_active}
                          onCheckedChange={() =>
                            handleToggleCarrierActive(carrier)
                          }
                        />
                        <Badge
                          variant={carrier.is_active ? "default" : "outline"}
                        >
                          {carrier.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCarrier(carrier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCarrier(carrier)}
                        >
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
      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingZone ? "Editar Zona de Envío" : "Nueva Zona de Envío"}
            </DialogTitle>
            <DialogDescription>
              Configura una zona geográfica para aplicar tarifas de envío
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={zoneForm.name}
                onChange={(e) =>
                  setZoneForm({ ...zoneForm, name: e.target.value })
                }
                placeholder="Ej: Argentina, CABA, Interior"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={zoneForm.description}
                onChange={(e) =>
                  setZoneForm({ ...zoneForm, description: e.target.value })
                }
                placeholder="Descripción de la zona"
                rows={3}
              />
            </div>
            <div>
              <Label>Países (separados por comas)</Label>
              <Input
                value={zoneForm.countries.join(", ")}
                onChange={(e) =>
                  setZoneForm({
                    ...zoneForm,
                    countries: e.target.value
                      .split(",")
                      .map((c) => c.trim())
                      .filter((c) => c),
                  })
                }
                placeholder="Argentina, Uruguay"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={zoneForm.is_active}
                onCheckedChange={(checked) =>
                  setZoneForm({ ...zoneForm, is_active: checked })
                }
              />
              <Label>Zona activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowZoneDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveZone}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate Dialog */}
      <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRate ? "Editar Tarifa de Envío" : "Nueva Tarifa de Envío"}
            </DialogTitle>
            <DialogDescription>
              Configura una tarifa de envío para una zona específica
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Zona *</Label>
              <Select
                value={rateForm.zone_id}
                onValueChange={(value) =>
                  setRateForm({ ...rateForm, zone_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar zona" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nombre *</Label>
              <Input
                value={rateForm.name}
                onChange={(e) =>
                  setRateForm({ ...rateForm, name: e.target.value })
                }
                placeholder="Ej: Envío Estándar, Envío Express"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={rateForm.description}
                onChange={(e) =>
                  setRateForm({ ...rateForm, description: e.target.value })
                }
                placeholder="Descripción de la tarifa"
                rows={2}
              />
            </div>
            <div>
              <Label>Tipo de Tarifa *</Label>
              <Select
                value={rateForm.rate_type}
                onValueChange={(value: any) =>
                  setRateForm({ ...rateForm, rate_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Fija</SelectItem>
                  <SelectItem value="weight">Por Peso (por kg)</SelectItem>
                  <SelectItem value="price">Por Precio (porcentaje)</SelectItem>
                  <SelectItem value="free">Gratis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rateForm.rate_type === "flat" && (
              <div>
                <Label>Precio Fijo (ARS) *</Label>
                <Input
                  type="number"
                  value={rateForm.flat_rate}
                  onChange={(e) =>
                    setRateForm({
                      ...rateForm,
                      flat_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="5000"
                />
              </div>
            )}
            {rateForm.rate_type === "weight" && (
              <div>
                <Label>Precio por kg (ARS) *</Label>
                <Input
                  type="number"
                  value={rateForm.weight_rate_per_kg}
                  onChange={(e) =>
                    setRateForm({
                      ...rateForm,
                      weight_rate_per_kg: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="1000"
                />
              </div>
            )}
            {rateForm.rate_type === "price" && (
              <div>
                <Label>Porcentaje del precio (%) *</Label>
                <Input
                  type="number"
                  value={rateForm.price_rate_percentage}
                  onChange={(e) =>
                    setRateForm({
                      ...rateForm,
                      price_rate_percentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="5"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Días estimados (mínimo)</Label>
                <Input
                  type="number"
                  value={rateForm.estimated_days_min || ""}
                  onChange={(e) =>
                    setRateForm({
                      ...rateForm,
                      estimated_days_min: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="3"
                />
              </div>
              <div>
                <Label>Días estimados (máximo)</Label>
                <Input
                  type="number"
                  value={rateForm.estimated_days_max || ""}
                  onChange={(e) =>
                    setRateForm({
                      ...rateForm,
                      estimated_days_max: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="7"
                />
              </div>
            </div>
            <div>
              <Label>Umbral de envío gratis (ARS)</Label>
              <Input
                type="number"
                value={rateForm.free_shipping_threshold || ""}
                onChange={(e) =>
                  setRateForm({
                    ...rateForm,
                    free_shipping_threshold: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                placeholder="50000"
              />
              <p className="text-xs text-tierra-media mt-1">
                Si el pedido supera este monto, el envío será gratis
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={rateForm.is_active}
                onCheckedChange={(checked) =>
                  setRateForm({ ...rateForm, is_active: checked })
                }
              />
              <Label>Tarifa activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRate}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carrier Dialog */}
      <Dialog open={showCarrierDialog} onOpenChange={setShowCarrierDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCarrier ? "Editar Transportista" : "Nuevo Transportista"}
            </DialogTitle>
            <DialogDescription>
              Configura un transportista para seguimiento de envíos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={carrierForm.name}
                onChange={(e) =>
                  setCarrierForm({ ...carrierForm, name: e.target.value })
                }
                placeholder="Ej: OCA, Andreani"
              />
            </div>
            <div>
              <Label>Código *</Label>
              <Input
                value={carrierForm.code}
                onChange={(e) =>
                  setCarrierForm({
                    ...carrierForm,
                    code: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                  })
                }
                placeholder="oca, andreani"
                disabled={!!editingCarrier}
              />
              <p className="text-xs text-tierra-media mt-1">
                Código único (solo minúsculas y guiones bajos)
              </p>
            </div>
            <div>
              <Label>URL de Seguimiento</Label>
              <Input
                value={carrierForm.tracking_url_template}
                onChange={(e) =>
                  setCarrierForm({
                    ...carrierForm,
                    tracking_url_template: e.target.value,
                  })
                }
                placeholder="https://example.com/track/{tracking_number}"
              />
              <p className="text-xs text-tierra-media mt-1">
                Usa {"{tracking_number}"} como placeholder para el número de
                seguimiento
              </p>
            </div>
            <div>
              <Label>API Key (opcional)</Label>
              <Input
                type="password"
                value={carrierForm.api_key}
                onChange={(e) =>
                  setCarrierForm({ ...carrierForm, api_key: e.target.value })
                }
                placeholder="API key para integración"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={carrierForm.is_active}
                onCheckedChange={(checked) =>
                  setCarrierForm({ ...carrierForm, is_active: checked })
                }
              />
              <Label>Transportista activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCarrierDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCarrier}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar {deletingItem?.name}? Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

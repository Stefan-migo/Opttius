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
  Package,
  Edit,
  Trash2,
  X,
  Save,
  AlertTriangle,
  Clock,
  User,
  Building,
} from "lucide-react";
import { toast } from "sonner";

// Internal Order Interfaces
interface InternalOrder {
  id: string;
  order_number: string;
  origin_branch_id: string;
  destination_branch_id: string;
  status: "pending" | "confirmed" | "in_transit" | "delivered" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  scheduled_pickup_date?: string;
  actual_pickup_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  notes?: string;
  driver_id?: string;
  vehicle_id?: string;
  tracking_number?: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  is_active: boolean;
}

interface Driver {
  id: string;
  name: string;
  license_number: string;
  phone: string;
  is_active: boolean;
}

interface Vehicle {
  id: string;
  plate_number: string;
  model: string;
  capacity_kg: number;
  is_active: boolean;
}

export default function InternalOrderTrackingManager() {
  const [orders, setOrders] = useState<InternalOrder[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<InternalOrder | null>(null);
  const [deletingItem, setDeletingItem] = useState<{
    type: "order";
    id: string;
    orderNumber: string;
  } | null>(null);

  // Form states
  const [orderForm, setOrderForm] = useState({
    origin_branch_id: "",
    destination_branch_id: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    scheduled_pickup_date: "",
    estimated_delivery_date: "",
    notes: "",
    driver_id: "",
    vehicle_id: "",
  });

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch branches
      const branchesResponse = await fetch("/api/admin/branches");
      if (branchesResponse.ok) {
        const branchesData = await branchesResponse.json();
        setBranches(branchesData.branches || []);
      }

      // Fetch drivers
      const driversResponse = await fetch("/api/admin/drivers");
      if (driversResponse.ok) {
        const driversData = await driversResponse.json();
        setDrivers(driversData.drivers || []);
      }

      // Fetch vehicles
      const vehiclesResponse = await fetch("/api/admin/vehicles");
      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        setVehicles(vehiclesData.vehicles || []);
      }

      // Fetch internal orders
      const ordersResponse = await fetch("/api/admin/internal-orders");
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.orders || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle form operations
  const handleCreateOrder = () => {
    setEditingOrder(null);
    setOrderForm({
      origin_branch_id: "",
      destination_branch_id: "",
      priority: "medium",
      scheduled_pickup_date: "",
      estimated_delivery_date: "",
      notes: "",
      driver_id: "",
      vehicle_id: "",
    });
    setShowOrderDialog(true);
  };

  const handleEditOrder = (order: InternalOrder) => {
    setEditingOrder(order);
    setOrderForm({
      origin_branch_id: order.origin_branch_id,
      destination_branch_id: order.destination_branch_id,
      priority: order.priority,
      scheduled_pickup_date: order.scheduled_pickup_date || "",
      estimated_delivery_date: order.estimated_delivery_date || "",
      notes: order.notes || "",
      driver_id: order.driver_id || "",
      vehicle_id: order.vehicle_id || "",
    });
    setShowOrderDialog(true);
  };

  const handleDeleteOrder = (order: InternalOrder) => {
    setDeletingItem({
      type: "order",
      id: order.id,
      orderNumber: order.order_number,
    });
    setShowDeleteDialog(true);
  };

  const handleSaveOrder = async () => {
    try {
      const url = editingOrder
        ? `/api/admin/internal-orders/${editingOrder.id}`
        : "/api/admin/internal-orders";

      const method = editingOrder ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orderForm,
          status: editingOrder ? editingOrder.status : "pending",
        }),
      });

      if (!response.ok) throw new Error("Error al guardar orden");

      toast.success(editingOrder ? "Orden actualizada" : "Orden creada");
      setShowOrderDialog(false);
      fetchData();
    } catch (error) {
      toast.error("Error al guardar orden");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    try {
      const response = await fetch(
        `/api/admin/internal-orders/${deletingItem.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) throw new Error("Error al eliminar orden");

      toast.success("Orden eliminada");
      setShowDeleteDialog(false);
      setDeletingItem(null);
      fetchData();
    } catch (error) {
      toast.error("Error al eliminar orden");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { variant: any; label: string; icon: React.ReactNode }
    > = {
      pending: {
        variant: "secondary",
        label: "Pendiente",
        icon: <Clock className="h-3 w-3" />,
      },
      confirmed: {
        variant: "default",
        label: "Confirmado",
        icon: <Package className="h-3 w-3" />,
      },
      in_transit: {
        variant: "default",
        label: "En Tránsito",
        icon: <Truck className="h-3 w-3" />,
      },
      delivered: {
        variant: "default",
        label: "Entregado",
        icon: <Package className="h-3 w-3" />,
      },
      cancelled: {
        variant: "destructive",
        label: "Cancelado",
        icon: <X className="h-3 w-3" />,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { variant: any; label: string }> = {
      low: { variant: "secondary", label: "Baja" },
      medium: { variant: "default", label: "Media" },
      high: { variant: "destructive", label: "Alta" },
      urgent: { variant: "destructive", label: "Urgente" },
    };

    const config = priorityConfig[priority] || priorityConfig.medium;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Truck className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4 animate-pulse" />
          <p className="text-admin-text-tertiary">
            Cargando órdenes internas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-epoch-primary">
            Seguimiento de Órdenes Internas
          </h1>
          <p className="text-admin-text-tertiary">
            Gestiona las transferencias entre sucursales y el seguimiento
            logístico
          </p>
        </div>
        <Button onClick={handleCreateOrder}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden Interna
        </Button>
      </div>

      {/* Orders Section */}
      <Card
        className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: "var(--admin-border-primary)" }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Órdenes Internas
              </CardTitle>
              <CardDescription>
                {orders.length} {orders.length === 1 ? "orden" : "órdenes"}{" "}
                registradas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-16 w-16 text-admin-text-tertiary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-epoch-primary mb-2">
                No hay órdenes internas
              </h3>
              <p className="text-admin-text-tertiary mb-6">
                Crea órdenes para gestionar transferencias entre sucursales
              </p>
              <Button onClick={handleCreateOrder}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Orden
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Fecha Programada</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const originBranch = branches.find(
                    (b) => b.id === order.origin_branch_id,
                  );
                  const destinationBranch = branches.find(
                    (b) => b.id === order.destination_branch_id,
                  );

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-admin-text-tertiary" />
                          <span>
                            {originBranch?.name || order.origin_branch_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-admin-text-tertiary" />
                          <span>
                            {destinationBranch?.name ||
                              order.destination_branch_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                      <TableCell>
                        {order.scheduled_pickup_date
                          ? new Date(
                              order.scheduled_pickup_date,
                            ).toLocaleDateString()
                          : "Sin fecha"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditOrder(order)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteOrder(order)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOrder ? "Editar Orden Interna" : "Nueva Orden Interna"}
            </DialogTitle>
            <DialogDescription>
              Configura una orden de transferencia entre sucursales
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sucursal Origen *</Label>
                <Select
                  value={orderForm.origin_branch_id}
                  onValueChange={(value) =>
                    setOrderForm({ ...orderForm, origin_branch_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter((b) => b.is_active)
                      .map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sucursal Destino *</Label>
                <Select
                  value={orderForm.destination_branch_id}
                  onValueChange={(value) =>
                    setOrderForm({ ...orderForm, destination_branch_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter((b) => b.is_active)
                      .map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridad</Label>
                <Select
                  value={orderForm.priority}
                  onValueChange={(value) =>
                    setOrderForm({ ...orderForm, priority: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conductor</Label>
                <Select
                  value={orderForm.driver_id}
                  onValueChange={(value) =>
                    setOrderForm({ ...orderForm, driver_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar conductor" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers
                      .filter((d) => d.is_active)
                      .map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha de Recogida Programada</Label>
                <Input
                  type="datetime-local"
                  value={orderForm.scheduled_pickup_date}
                  onChange={(e) =>
                    setOrderForm({
                      ...orderForm,
                      scheduled_pickup_date: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Fecha Estimada de Entrega</Label>
                <Input
                  type="datetime-local"
                  value={orderForm.estimated_delivery_date}
                  onChange={(e) =>
                    setOrderForm({
                      ...orderForm,
                      estimated_delivery_date: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Vehículo</Label>
              <Select
                value={orderForm.vehicle_id}
                onValueChange={(value) =>
                  setOrderForm({ ...orderForm, vehicle_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vehículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles
                    .filter((v) => v.is_active)
                    .map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate_number} - {vehicle.model}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={orderForm.notes}
                onChange={(e) =>
                  setOrderForm({ ...orderForm, notes: e.target.value })
                }
                placeholder="Instrucciones especiales o notas adicionales"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveOrder}>
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
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Eliminar Orden
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la orden interna{" "}
              <span className="font-bold">"{deletingItem?.orderNumber}"</span>?
              <br />
              <br />
              Esta acción no se puede deshacer.
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

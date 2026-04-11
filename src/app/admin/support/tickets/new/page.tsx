"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Mail,
  MessageSquare,
  Package,
  Phone,
  Plus,
  Search,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { extractDataFromResponse } from "@/lib/api/response-helpers";

interface Customer {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  membership_tier?: string;
  is_member?: boolean;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  color: string;
}

export default function NewTicketPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminUsers, setAdminUsers] = useState<unknown[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [searchingOrders, setSearchingOrders] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    category_id: "",
    customer_email: "",
    customer_name: "",
    order_id: "",
    assigned_to: "unassigned",
  });

  // Search states
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchAdminUsers();
  }, []);

  useEffect(() => {
    if (customerSearch.length >= 3) {
      searchCustomers();
    } else {
      setCustomers([]);
    }
  }, [customerSearch]);

  useEffect(() => {
    if (orderSearch.length >= 3) {
      searchOrders();
    } else {
      setOrders([]);
    }
  }, [orderSearch]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/support/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setAdminUsers(extractDataFromResponse(data));
      }
    } catch (err) {
      console.error("Error fetching admin users:", err);
    }
  };

  const searchCustomers = async () => {
    try {
      setSearchingCustomers(true);
      const response = await fetch(
        `/api/admin/customers?search=${encodeURIComponent(customerSearch)}&limit=10`,
      );
      if (response.ok) {
        const data = await response.json();
        setCustomers(extractDataFromResponse(data));
      }
    } catch (err) {
      console.error("Error searching customers:", err);
    } finally {
      setSearchingCustomers(false);
    }
  };

  const searchOrders = async () => {
    try {
      setSearchingOrders(true);
      const response = await fetch(
        `/api/admin/orders?search=${encodeURIComponent(orderSearch)}&limit=10`,
      );
      if (response.ok) {
        const data = await response.json();
        setOrders(extractDataFromResponse(data));
      }
    } catch (err) {
      console.error("Error searching orders:", err);
    } finally {
      setSearchingOrders(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setForm((prev) => ({
      ...prev,
      customer_email: customer.email,
      customer_name:
        `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
    }));
    setCustomerSearch(
      `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
        customer.email,
    );
    setCustomers([]);
  };

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setForm((prev) => ({
      ...prev,
      order_id: order.id,
    }));
    setOrderSearch(order.order_number);
    setOrders([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.customer_email.trim()
    ) {
      alert("Por favor, completa todos los campos obligatorios.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/admin/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          category_id: form.category_id || null,
          customer_email: form.customer_email.trim(),
          customer_name: form.customer_name.trim() || null,
          order_id: form.order_id || null,
          assigned_to:
            form.assigned_to && form.assigned_to !== "unassigned"
              ? form.assigned_to
              : null,
          created_by_admin: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Server error response:", errorData);
        const errorMessage = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || "Failed to create ticket";
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Show success toast
      toast.success("Ticket creado exitosamente", {
        description: `Número de ticket: ${data.ticket?.ticket_number || "N/A"}`,
      });

      // Redirect to the created ticket
      if (data.ticket?.id) {
        router.push(`/admin/support/tickets/${data.ticket.id}`);
      } else {
        router.push("/admin/support");
      }
    } catch (err) {
      console.error("❌ Error creating ticket:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al crear el ticket. Por favor, inténtalo de nuevo.";
      toast.error("Error al crear el ticket", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/support">
          <Button size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-epoch-primary">
            Crear Nuevo Ticket
          </h1>
          <p className="text-admin-text-tertiary">
            Crea un ticket de soporte en nombre de un cliente
          </p>
        </div>
      </div>

      <form
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        onSubmit={handleSubmit}
      >
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Detalles del Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
                  Título <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Describe brevemente el problema..."
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <Textarea
                  required
                  placeholder="Describe el problema en detalle..."
                  rows={6}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
                    Prioridad
                  </label>
                  <Select
                    value={form.priority}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, priority: value }))
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
                  <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
                    Categoría
                  </label>
                  <Select
                    value={form.category_id}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, category_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
                  Asignar a
                </label>
                <Select
                  value={form.assigned_to}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      assigned_to: value === "unassigned" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                    {adminUsers.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.email ||
                          admin.name ||
                          `Admin ${admin.id.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Selection */}
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
                  Buscar Cliente
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-admin-text-tertiary h-4 w-4" />
                  <Input
                    className="pl-10"
                    placeholder="Buscar por nombre o email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>

                {searchingCustomers && (
                  <p className="text-sm text-admin-text-tertiary mt-2">
                    Buscando clientes...
                  </p>
                )}

                {customers.length > 0 && (
                  <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                    {customers.map((customer) => (
                      <button
                        className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        key={customer.id}
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                      >
                        <div className="font-medium">
                          {customer.first_name && customer.last_name
                            ? `${customer.first_name} ${customer.last_name}`
                            : customer.email}
                        </div>
                        <div className="text-sm text-admin-text-tertiary">
                          {customer.email}
                        </div>
                        {customer.is_member && (
                          <div className="text-xs text-admin-success">
                            Miembro {customer.membership_tier}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
                  Email del Cliente <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="cliente@ejemplo.com"
                  type="email"
                  value={form.customer_email}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customer_email: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
                  Nombre del Cliente
                </label>
                <Input
                  placeholder="Nombre completo"
                  value={form.customer_name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customer_name: e.target.value,
                    }))
                  }
                />
              </div>

              {selectedCustomer && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Cliente Seleccionado:
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {selectedCustomer.email}
                    </div>
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {selectedCustomer.phone}
                      </div>
                    )}
                    {selectedCustomer.is_member && (
                      <div className="text-admin-success font-medium">
                        Miembro {selectedCustomer.membership_tier}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Selection */}
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Pedido Relacionado (Opcional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
                  Buscar Pedido
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-admin-text-tertiary h-4 w-4" />
                  <Input
                    className="pl-10"
                    placeholder="Buscar por número de pedido..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                </div>

                {searchingOrders && (
                  <p className="text-sm text-admin-text-tertiary mt-2">
                    Buscando pedidos...
                  </p>
                )}

                {orders.length > 0 && (
                  <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                    {orders.map((order) => (
                      <button
                        className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        key={order.id}
                        type="button"
                        onClick={() => handleSelectOrder(order)}
                      >
                        <div className="font-medium">#{order.order_number}</div>
                        <div className="text-sm text-admin-text-tertiary">
                          {formatPrice(order.total_amount)} • {order.status}
                        </div>
                        <div className="text-xs text-admin-text-tertiary">
                          {new Date(order.created_at).toLocaleDateString(
                            "es-AR",
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedOrder && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">
                    Pedido Seleccionado:
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>#{selectedOrder.order_number}</strong>
                    </div>
                    <div>Total: {formatPrice(selectedOrder.total_amount)}</div>
                    <div>Estado: {selectedOrder.status}</div>
                    <div>
                      Fecha:{" "}
                      {new Date(selectedOrder.created_at).toLocaleDateString(
                        "es-AR",
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <CardContent className="p-6">
              <div className="space-y-3">
                <Button className="w-full" disabled={loading} type="submit">
                  <Plus className="h-4 w-4 mr-2" />
                  {loading ? "Creando Ticket..." : "Crear Ticket"}
                </Button>

                <Link href="/admin/support">
                  <Button className="w-full" variant="outline">
                    Cancelar
                  </Button>
                </Link>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      Nota Importante
                    </p>
                    <p className="text-xs text-yellow-800 mt-1">
                      Este ticket será creado en nombre del cliente. Se enviará
                      una notificación por email automáticamente.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

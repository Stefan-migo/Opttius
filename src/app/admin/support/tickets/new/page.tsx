"use client";

import { AlertTriangle, ArrowLeft, MessageSquare, Plus } from "lucide-react";
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

import { CustomerSearchCard } from "./_components/CustomerSearchCard";
import { OrderSearchCard } from "./_components/OrderSearchCard";
import type {
  Category,
  Customer,
  NewTicketForm,
  Order,
} from "./_components/types";

export default function NewTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [adminUsers, setAdminUsers] = useState<unknown[]>([]);

  const [form, setForm] = useState<NewTicketForm>({
    title: "",
    description: "",
    priority: "medium",
    category_id: "",
    customer_email: "",
    customer_name: "",
    order_id: "",
    assigned_to: "unassigned",
  });

  useEffect(() => {
    fetchCategories();
    fetchAdminUsers();
  }, []);

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

  const handleSelectCustomer = (customer: Customer) => {
    setForm((prev) => ({
      ...prev,
      customer_email: customer.email,
      customer_name:
        `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
    }));
  };

  const handleSelectOrder = (order: Order) => {
    setForm((prev) => ({ ...prev, order_id: order.id }));
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
        headers: { "Content-Type": "application/json" },
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
        throw new Error(
          errorData.details
            ? `${errorData.error}: ${errorData.details}`
            : errorData.error || "Failed to create ticket",
        );
      }
      const data = await response.json();
      toast.success("Ticket creado exitosamente", {
        description: `Número de ticket: ${data.ticket?.ticket_number || "N/A"}`,
      });
      if (data.ticket?.id) {
        router.push(`/admin/support/tickets/${data.ticket.id}`);
      } else {
        router.push("/admin/support");
      }
    } catch (err) {
      console.error("Error creating ticket:", err);
      toast.error("Error al crear el ticket", {
        description:
          err instanceof Error ? err.message : "Error al crear el ticket.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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
        <div className="lg:col-span-2 space-y-6">
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
                      <SelectItem
                        key={(admin as Record<string, string>).id}
                        value={(admin as Record<string, string>).id}
                      >
                        {(admin as Record<string, string>).email ||
                          (admin as Record<string, string>).name ||
                          `Admin ${String((admin as Record<string, string>).id).slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <CustomerSearchCard
            email={form.customer_email}
            name={form.customer_name}
            onChangeEmail={(email) =>
              setForm((prev) => ({ ...prev, customer_email: email }))
            }
            onChangeName={(name) =>
              setForm((prev) => ({ ...prev, customer_name: name }))
            }
            onSelect={handleSelectCustomer}
          />
          <OrderSearchCard onSelect={handleSelectOrder} />

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

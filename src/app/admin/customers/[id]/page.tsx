"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Package,
  CreditCard,
  TrendingUp,
  Star,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Heart,
  ShoppingBag,
  DollarSign,
  Activity,
  Edit,
  Eye,
  FileText,
  Clock,
  Plus,
  X,
  Crown,
  Calendar as CalendarIcon,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  customerService,
  Customer,
  Prescription,
  Appointment,
  Quote,
  LensPurchase,
} from "@/lib/api/services";
import { PrescriptionFullDisplay } from "@/components/admin/PrescriptionFullDisplay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";

// Lazy load large form components to reduce initial bundle size
const CreatePrescriptionForm = dynamic(
  () => import("@/components/admin/CreatePrescriptionForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-text-primary"></div>
      </div>
    ),
    ssr: false,
  },
);

const CreateAppointmentForm = dynamic(
  () => import("@/components/admin/CreateAppointmentForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-text-primary"></div>
      </div>
    ),
    ssr: false,
  },
);

const CreateQuoteForm = dynamic(
  () => import("@/components/admin/CreateQuoteForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-text-primary"></div>
      </div>
    ),
    ssr: false,
  },
);

// Local Customer interface for the form state - extended with additional fields
interface CustomerFormData extends Partial<Customer> {
  // Extended fields that may not be in the base Customer type
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  date_of_birth?: string;
  gender?: string;
  medical_conditions?: string[];
  allergies?: string[];
  medications?: string[];
  medical_notes?: string;
  last_eye_exam_date?: string;
  next_eye_exam_due?: string;
  preferred_contact_method?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  is_active_customer?: boolean;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [showCreatePrescription, setShowCreatePrescription] = useState(false);
  const [editingPrescription, setEditingPrescription] =
    useState<Prescription | null>(null);
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [showCreateQuote, setShowCreateQuote] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const customerData = await customerService.getCustomer(customerId);
      setCustomer(customerData);
      setError(null);
    } catch (err) {
      console.error("Error fetching customer:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getSegmentBadge = (segment: string) => {
    const variants: Record<
      string,
      { variant: any; label: string; icon: any; color: string }
    > = {
      new: {
        variant: "secondary",
        label: "Nuevo",
        icon: Star,
        color: "text-yellow-600",
      },
      "first-time": {
        variant: "outline",
        label: "Primera Compra",
        icon: Package,
        color: "text-blue-600",
      },
      regular: {
        variant: "default",
        label: "Regular",
        icon: CheckCircle,
        color: "text-green-600",
      },
      vip: {
        variant: "secondary",
        label: "VIP",
        icon: Crown,
        color: "text-purple-600",
      },
      "at-risk": {
        variant: "destructive",
        label: "En Riesgo",
        icon: AlertTriangle,
        color: "text-red-600",
      },
    };

    const config = variants[segment] || variants["new"];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const getOrderStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      pending: { variant: "outline", label: "Pendiente" },
      processing: { variant: "secondary", label: "Procesando" },
      shipped: { variant: "default", label: "Enviado" },
      delivered: { variant: "default", label: "Entregado" },
      cancelled: { variant: "destructive", label: "Cancelado" },
      refunded: { variant: "destructive", label: "Reembolsado" },
    };

    const statusConfig = config[status] || {
      variant: "outline",
      label: status,
    };
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-admin-text-primary">
              Cargando cliente...
            </h1>
            <p className="text-admin-text-tertiary">
              Obteniendo información del cliente
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-admin-text-primary">
              Error
            </h1>
            <p className="text-admin-text-tertiary">
              No se pudo cargar la información del cliente
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-16">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Error al cargar cliente
            </h3>
            <p className="text-admin-text-tertiary mb-4">
              {error || "Cliente no encontrado"}
            </p>
            <Button onClick={fetchCustomer}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerName =
    customer.first_name && customer.last_name
      ? `${customer.first_name} ${customer.last_name}`
      : "Sin nombre";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-admin-text-primary">
              {customerName}
            </h1>
            <p className="text-admin-text-tertiary">
              {customer.email || "Sin email"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {customer.analytics?.segment &&
            getSegmentBadge(customer.analytics.segment)}
          <Link href={`/admin/customers/${customer.id}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-admin-success" />
              <div className="ml-4">
                <p className="text-sm text-admin-text-tertiary">
                  Total Gastado
                </p>
                <p className="text-2xl font-bold text-admin-success">
                  {formatCurrency(customer.analytics?.totalSpent || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <CardContent className="p-6">
            <div className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-admin-text-primary" />
              <div className="ml-4">
                <p className="text-sm text-admin-text-tertiary">
                  Total Pedidos
                </p>
                <p className="text-2xl font-bold text-admin-text-primary">
                  {customer.analytics?.orderCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-admin-accent-primary" />
              <div className="ml-4">
                <p className="text-sm text-admin-text-tertiary">
                  Ticket Promedio
                </p>
                <p className="text-2xl font-bold text-admin-accent-primary">
                  {formatCurrency(customer.analytics?.avgOrderValue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm text-admin-text-tertiary">
                  Cliente Desde
                </p>
                <p className="text-lg font-bold text-red-500">
                  {formatDate(customer.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="prescriptions">Recetas</TabsTrigger>
          <TabsTrigger value="appointments">Citas</TabsTrigger>
          <TabsTrigger value="quotes">Presupuestos</TabsTrigger>
          <TabsTrigger value="purchases">Compras</TabsTrigger>
          <TabsTrigger value="analytics">Analíticas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-admin-text-tertiary">Nombre</p>
                    <p className="font-medium">
                      {customer.first_name || "No especificado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-admin-text-tertiary">Apellido</p>
                    <p className="font-medium">
                      {customer.last_name || "No especificado"}
                    </p>
                  </div>
                </div>

                {customer.rut && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">RUT</p>
                    <p className="font-medium">{customer.rut}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-admin-text-tertiary">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>

                {customer.phone && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">Teléfono</p>
                    <p className="font-medium">{customer.phone}</p>
                  </div>
                )}

                {customer.date_of_birth && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">
                      Fecha de Nacimiento
                    </p>
                    <p className="font-medium">
                      {new Date(customer.date_of_birth).toLocaleDateString(
                        "es-CL",
                      )}
                    </p>
                  </div>
                )}

                {customer.last_eye_exam_date && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">
                      Último Examen de la Vista
                    </p>
                    <p className="font-medium">
                      {formatDate(customer.last_eye_exam_date)}
                    </p>
                  </div>
                )}

                {customer.next_eye_exam_due && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">
                      Próximo Examen Recomendado
                    </p>
                    <p className="font-medium text-admin-text-primary">
                      {formatDate(customer.next_eye_exam_due)}
                    </p>
                  </div>
                )}

                {customer.medical_conditions &&
                  customer.medical_conditions.length > 0 && (
                    <div>
                      <p className="text-sm text-admin-text-tertiary">
                        Condiciones Médicas
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {customer.medical_conditions.map(
                          (condition: string, idx: number) => (
                            <Badge key={idx} variant="outline">
                              {condition}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {customer.allergies && customer.allergies.length > 0 && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">Alergias</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {customer.allergies.map(
                        (allergy: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-red-50 text-red-700"
                          >
                            {allergy}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {customer.emergency_contact_name && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">
                      Contacto de Emergencia
                    </p>
                    <p className="font-medium">
                      {customer.emergency_contact_name}
                    </p>
                    {customer.emergency_contact_phone && (
                      <p className="text-sm text-admin-text-tertiary">
                        {customer.emergency_contact_phone}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-sm text-admin-text-tertiary">Estado</p>
                  <Badge
                    variant={
                      customer.is_active_customer !== false
                        ? "default"
                        : "outline"
                    }
                  >
                    {customer.is_active_customer !== false
                      ? "Cliente Activo"
                      : "Cliente Inactivo"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Dirección
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customer.address_line_1 ? (
                  <>
                    <div>
                      <p className="text-sm text-admin-text-tertiary">
                        Dirección
                      </p>
                      <p className="font-medium">{customer.address_line_1}</p>
                      {customer.address_line_2 && (
                        <p className="font-medium">{customer.address_line_2}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-admin-text-tertiary">
                          Ciudad
                        </p>
                        <p className="font-medium">
                          {customer.city || "No especificado"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-admin-text-tertiary">
                          Provincia
                        </p>
                        <p className="font-medium">
                          {customer.state || "No especificado"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-admin-text-tertiary">
                          Código Postal
                        </p>
                        <p className="font-medium">
                          {customer.postal_code || "No especificado"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-admin-text-tertiary">País</p>
                        <p className="font-medium">
                          {customer.country || "Chile"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-admin-text-tertiary">
                    No hay dirección registrada
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          {customer.orders && customer.orders.length > 0 && (
            <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Pedidos Recientes
                  </div>
                  <Link href={`/admin/customers/${customer.id}?tab=orders`}>
                    <Button variant="outline" size="sm">
                      Ver todos
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customer.orders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">#{order.order_number}</p>
                          <p className="text-sm text-admin-text-tertiary">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(order.total_amount)}
                          </p>
                          {getOrderStatusBadge(order.status)}
                        </div>
                        <Link href={`/admin/orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            Ver
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-6">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Recetas Ópticas ({customer.prescriptions?.length || 0})
            </CardTitle>
            <Button
              onClick={() => {
                setEditingPrescription(null);
                setShowCreatePrescription(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Receta
            </Button>
          </div>

          {customer.prescriptions && customer.prescriptions.length > 0 ? (
            <div className="space-y-4">
              {customer.prescriptions.map((prescription: Prescription) => (
                <Card
                  key={prescription.id}
                  className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          Receta #
                          {prescription.prescription_number ||
                            prescription.id.slice(0, 8)}
                        </CardTitle>
                        <p className="text-sm text-admin-text-tertiary mt-1">
                          Fecha:{" "}
                          {new Date(
                            prescription.prescription_date,
                          ).toLocaleDateString("es-CL")}
                          {prescription.expiration_date && (
                            <>
                              {" "}
                              • Vence:{" "}
                              {new Date(
                                prescription.expiration_date,
                              ).toLocaleDateString("es-CL")}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {prescription.is_current && (
                          <Badge variant="default">Actual</Badge>
                        )}
                        {prescription.is_active ? (
                          <Badge variant="default">Activa</Badge>
                        ) : (
                          <Badge variant="outline">Inactiva</Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPrescription(prescription);
                            setShowCreatePrescription(true);
                          }}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PrescriptionFullDisplay
                      prescription={prescription}
                      showCard={false}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <CardContent className="text-center py-12">
                <Eye className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-admin-text-primary mb-2">
                  Sin recetas
                </h3>
                <p className="text-admin-text-tertiary mb-4">
                  Este cliente aún no tiene recetas registradas.
                </p>
                <Button
                  onClick={() => {
                    setEditingPrescription(null);
                    setShowCreatePrescription(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Primera Receta
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Citas y Agendas ({customer.appointments?.length || 0})
            </CardTitle>
            <Button
              onClick={() => {
                setEditingAppointment(null);
                setShowCreateAppointment(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cita
            </Button>
          </div>

          {customer.appointments && customer.appointments.length > 0 ? (
            <div className="space-y-4">
              {customer.appointments.map((appointment: Appointment) => {
                const appointmentDate = new Date(
                  `${appointment.appointment_date}T${appointment.appointment_time}`,
                );
                const isPast = appointmentDate < new Date();
                const statusColors: Record<string, string> = {
                  scheduled: "bg-blue-100 text-blue-800",
                  confirmed: "bg-green-100 text-green-800",
                  completed: "bg-gray-100 text-gray-800",
                  cancelled: "bg-red-100 text-red-800",
                  no_show: "bg-orange-100 text-orange-800",
                };

                return (
                  <Card
                    key={appointment.id}
                    className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {appointment.appointment_type === "eye_exam" &&
                              "Examen de la Vista"}
                            {appointment.appointment_type === "consultation" &&
                              "Consulta"}
                            {appointment.appointment_type === "fitting" &&
                              "Ajuste de Lentes"}
                            {appointment.appointment_type === "delivery" &&
                              "Entrega de Lentes"}
                            {appointment.appointment_type === "repair" &&
                              "Reparación"}
                            {appointment.appointment_type === "follow_up" &&
                              "Seguimiento"}
                            {appointment.appointment_type === "emergency" &&
                              "Emergencia"}
                            {![
                              "eye_exam",
                              "consultation",
                              "fitting",
                              "delivery",
                              "repair",
                              "follow_up",
                              "emergency",
                            ].includes(appointment.appointment_type) && "Cita"}
                          </CardTitle>
                          <div className="flex items-center gap-4 mt-2 text-sm text-admin-text-tertiary">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {appointmentDate.toLocaleDateString("es-CL", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {appointmentDate.toLocaleTimeString("es-CL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <div>
                              Duración: {appointment.duration_minutes} min
                            </div>
                          </div>
                        </div>
                        <Badge
                          className={
                            statusColors[appointment.status] ||
                            "bg-gray-100 text-gray-800"
                          }
                        >
                          {appointment.status === "scheduled" && "Programada"}
                          {appointment.status === "confirmed" && "Confirmada"}
                          {appointment.status === "completed" && "Completada"}
                          {appointment.status === "cancelled" && "Cancelada"}
                          {appointment.status === "no_show" && "No asistió"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {appointment.reason && (
                        <div className="mb-3">
                          <p className="text-sm text-admin-text-tertiary">
                            Motivo:
                          </p>
                          <p className="font-medium">{appointment.reason}</p>
                        </div>
                      )}
                      {appointment.notes && (
                        <div className="mb-3">
                          <p className="text-sm text-admin-text-tertiary">
                            Notas:
                          </p>
                          <p>{appointment.notes}</p>
                        </div>
                      )}
                      {appointment.outcome && (
                        <div className="mb-3">
                          <p className="text-sm text-admin-text-tertiary">
                            Resultado:
                          </p>
                          <p>{appointment.outcome}</p>
                        </div>
                      )}
                      {appointment.follow_up_required &&
                        appointment.follow_up_date && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-admin-text-tertiary">
                              Seguimiento requerido:
                            </p>
                            <p className="font-medium text-admin-text-primary">
                              {new Date(
                                appointment.follow_up_date,
                              ).toLocaleDateString("es-CL")}
                            </p>
                          </div>
                        )}
                      <div className="mt-4 pt-4 border-t flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingAppointment(appointment);
                            setShowCreateAppointment(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar Cita
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <CardContent className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-admin-text-primary mb-2">
                  Sin citas
                </h3>
                <p className="text-admin-text-tertiary mb-4">
                  Este cliente aún no tiene citas programadas.
                </p>
                <Button
                  onClick={() => {
                    setEditingAppointment(null);
                    setShowCreateAppointment(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agendar Primera Cita
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="quotes" className="space-y-6">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Presupuestos ({customer.quotes?.length || 0})
            </CardTitle>
            <Button onClick={() => setShowCreateQuote(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Presupuesto
            </Button>
          </div>

          {customer.quotes && customer.quotes.length > 0 ? (
            <div className="space-y-4">
              {customer.quotes.map((quote: Quote) => {
                const getStatusBadge = (status: string) => {
                  const config: Record<
                    string,
                    { variant: any; label: string }
                  > = {
                    draft: { variant: "outline", label: "Borrador" },
                    sent: { variant: "default", label: "Enviado" },
                    accepted: { variant: "default", label: "Aceptado" },
                    rejected: { variant: "destructive", label: "Rechazado" },
                    expired: { variant: "outline", label: "Expirado" },
                    converted_to_work: {
                      variant: "secondary",
                      label: "Convertido",
                    },
                  };
                  const statusConfig = config[status] || {
                    variant: "outline",
                    label: status,
                  };
                  return (
                    <Badge variant={statusConfig.variant}>
                      {statusConfig.label}
                    </Badge>
                  );
                };

                return (
                  <Card
                    key={quote.id}
                    className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            Presupuesto {quote.quote_number}
                          </CardTitle>
                          <p className="text-sm text-admin-text-tertiary mt-1">
                            Fecha:{" "}
                            {new Date(quote.quote_date).toLocaleDateString(
                              "es-CL",
                            )}
                            {quote.expiration_date && (
                              <>
                                {" "}
                                • Vence:{" "}
                                {new Date(
                                  quote.expiration_date,
                                ).toLocaleDateString("es-CL")}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2 items-center">
                          {getStatusBadge(quote.status)}
                          {quote.converted_to_work_order_id && (
                            <Link
                              href={`/admin/work-orders/${quote.converted_to_work_order_id}`}
                            >
                              <Button variant="outline" size="sm">
                                Ver Trabajo
                              </Button>
                            </Link>
                          )}
                          <Link href={`/admin/quotes/${quote.id}`}>
                            <Button variant="outline" size="sm">
                              Ver Detalle
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-admin-text-tertiary mb-2">
                            Detalles del Presupuesto
                          </p>
                          <div className="space-y-1 text-sm">
                            {quote.frame_name && (
                              <p>
                                <span className="text-admin-text-tertiary">
                                  Marco:
                                </span>{" "}
                                <span className="font-medium">
                                  {quote.frame_name}
                                </span>
                              </p>
                            )}
                            {quote.lens_type && (
                              <p>
                                <span className="text-admin-text-tertiary">
                                  Tipo de lente:
                                </span>{" "}
                                <span className="font-medium">
                                  {quote.lens_type}
                                </span>
                              </p>
                            )}
                            {quote.lens_material && (
                              <p>
                                <span className="text-admin-text-tertiary">
                                  Material:
                                </span>{" "}
                                <span className="font-medium">
                                  {quote.lens_material}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-admin-text-tertiary mb-2">
                            Información de Precio
                          </p>
                          <div className="space-y-1 text-sm">
                            {quote.frame_price && quote.frame_price > 0 && (
                              <p>
                                <span className="text-admin-text-tertiary">
                                  Marco:
                                </span>{" "}
                                <span className="font-medium">
                                  {formatCurrency(quote.frame_price)}
                                </span>
                              </p>
                            )}
                            {quote.lens_cost && quote.lens_cost > 0 && (
                              <p>
                                <span className="text-admin-text-tertiary">
                                  Lente:
                                </span>{" "}
                                <span className="font-medium">
                                  {formatCurrency(quote.lens_cost)}
                                </span>
                              </p>
                            )}
                            {quote.treatments_cost &&
                              quote.treatments_cost > 0 && (
                                <p>
                                  <span className="text-admin-text-tertiary">
                                    Tratamientos:
                                  </span>{" "}
                                  <span className="font-medium">
                                    {formatCurrency(quote.treatments_cost)}
                                  </span>
                                </p>
                              )}
                            {quote.labor_cost && quote.labor_cost > 0 && (
                              <p>
                                <span className="text-admin-text-tertiary">
                                  Mano de obra:
                                </span>{" "}
                                <span className="font-medium">
                                  {formatCurrency(quote.labor_cost)}
                                </span>
                              </p>
                            )}
                            {quote.total_amount && (
                              <p className="pt-2 border-t">
                                <span className="text-admin-text-tertiary">
                                  Total:
                                </span>{" "}
                                <span className="font-medium text-admin-success text-base">
                                  {formatCurrency(quote.total_amount)}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-admin-text-primary mb-2">
                  Sin presupuestos
                </h3>
                <p className="text-admin-text-tertiary mb-4">
                  Este cliente aún no tiene presupuestos registrados.
                </p>
                <Button onClick={() => setShowCreateQuote(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Presupuesto
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="space-y-6">
          {/* Lens Purchases Section */}
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingBag className="h-5 w-5 mr-2" />
                Lentes y Armazones ({customer.lensPurchases?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.lensPurchases && customer.lensPurchases.length > 0 ? (
                <div className="space-y-4">
                  {customer.lensPurchases.map((purchase: LensPurchase) => {
                    const statusColors: Record<string, string> = {
                      ordered: "bg-blue-100 text-blue-800",
                      in_progress: "bg-yellow-100 text-yellow-800",
                      ready: "bg-green-100 text-green-800",
                      delivered: "bg-gray-100 text-gray-800",
                      cancelled: "bg-red-100 text-red-800",
                    };

                    return (
                      <Card key={purchase.id} className="bg-white shadow-sm">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">
                                {purchase.product_name}
                              </CardTitle>
                              <p className="text-sm text-admin-text-tertiary mt-1">
                                Fecha de compra:{" "}
                                {new Date(
                                  purchase.purchase_date,
                                ).toLocaleDateString("es-CL")}
                                {purchase.delivery_date && (
                                  <>
                                    {" "}
                                    • Entregado:{" "}
                                    {new Date(
                                      purchase.delivery_date,
                                    ).toLocaleDateString("es-CL")}
                                  </>
                                )}
                              </p>
                            </div>
                            <Badge
                              className={
                                statusColors[purchase.status] ||
                                "bg-gray-100 text-gray-800"
                              }
                            >
                              {purchase.status === "ordered" && "Ordenado"}
                              {purchase.status === "in_progress" &&
                                "En Proceso"}
                              {purchase.status === "ready" && "Listo"}
                              {purchase.status === "delivered" && "Entregado"}
                              {purchase.status === "cancelled" && "Cancelado"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-sm text-admin-text-tertiary mb-2">
                                Detalles del Producto
                              </p>
                              <div className="space-y-1 text-sm">
                                <p>
                                  <span className="text-admin-text-tertiary">
                                    Tipo:
                                  </span>{" "}
                                  <span className="font-medium">
                                    {purchase.product_type}
                                  </span>
                                </p>
                                <p>
                                  <span className="text-admin-text-tertiary">
                                    Cantidad:
                                  </span>{" "}
                                  <span className="font-medium">
                                    {purchase.quantity}
                                  </span>
                                </p>
                                {purchase.lens_type && (
                                  <p>
                                    <span className="text-admin-text-tertiary">
                                      Tipo de lente:
                                    </span>{" "}
                                    <span className="font-medium">
                                      {purchase.lens_type}
                                    </span>
                                  </p>
                                )}
                                {purchase.frame_brand && (
                                  <p>
                                    <span className="text-admin-text-tertiary">
                                      Marca:
                                    </span>{" "}
                                    <span className="font-medium">
                                      {purchase.frame_brand}
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-admin-text-tertiary mb-2">
                                Información de Compra
                              </p>
                              <div className="space-y-1 text-sm">
                                <p>
                                  <span className="text-admin-text-tertiary">
                                    Precio unitario:
                                  </span>{" "}
                                  <span className="font-medium">
                                    {formatCurrency(purchase.unit_price)}
                                  </span>
                                </p>
                                <p>
                                  <span className="text-admin-text-tertiary">
                                    Total:
                                  </span>{" "}
                                  <span className="font-medium text-admin-success">
                                    {formatCurrency(purchase.total_price)}
                                  </span>
                                </p>
                                {purchase.prescription_id && (
                                  <p className="text-xs text-admin-text-tertiary">
                                    Con receta asociada
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="h-10 w-10 text-admin-text-tertiary mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-admin-text-tertiary">
                    Sin compras de lentes o armazones
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orders Section */}
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Pedidos ({customer.orders?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.orders && customer.orders.length > 0 ? (
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Pago</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.orders.map((order: any) => (
                        <>
                          <TableRow
                            key={order.id}
                            className="hover:bg-[#AE000010]"
                          >
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleOrderExpansion(order.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  {expandedOrders.has(order.id) ? "−" : "+"}
                                </Button>
                                <div>
                                  <p className="font-medium">
                                    #{order.order_number}
                                  </p>
                                  <p className="text-sm text-admin-text-tertiary">
                                    {order.order_items?.length || 0} productos
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              {new Date(order.created_at).toLocaleDateString(
                                "es-CL",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </TableCell>

                            <TableCell>
                              {getOrderStatusBadge(order.status)}
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant={
                                  order.payment_status === "paid"
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {order.payment_status === "paid"
                                  ? "Pagado"
                                  : order.payment_status === "pending"
                                    ? "Pendiente"
                                    : order.payment_status === "failed"
                                      ? "Fallido"
                                      : order.payment_status}
                              </Badge>
                            </TableCell>

                            <TableCell className="font-medium text-admin-success">
                              {formatCurrency(order.total_amount)}
                            </TableCell>

                            <TableCell>
                              <Link href={`/admin/orders/${order.id}`}>
                                <Button variant="outline" size="sm">
                                  Ver Detalle
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Order Items */}
                          {expandedOrders.has(order.id) &&
                            order.order_items &&
                            order.order_items.length > 0 && (
                              <TableRow key={`${order.id}-items`}>
                                <TableCell
                                  colSpan={6}
                                  className="bg-gray-50 p-4"
                                >
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium text-admin-text-primary mb-3">
                                      Productos del Pedido:
                                    </p>
                                    {order.order_items.map(
                                      (item: any, idx: number) => {
                                        const product =
                                          item.products || item.product;
                                        return (
                                          <div
                                            key={idx}
                                            className="flex items-center justify-between p-2 bg-white rounded border"
                                          >
                                            <div className="flex items-center space-x-3">
                                              {product?.featured_image ? (
                                                <img
                                                  src={product.featured_image}
                                                  alt={
                                                    product.name ||
                                                    item.product_name
                                                  }
                                                  className="w-10 h-10 object-cover rounded"
                                                />
                                              ) : (
                                                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                  <Package className="h-5 w-5 text-gray-400" />
                                                </div>
                                              )}
                                              <div>
                                                <p className="text-sm font-medium">
                                                  {product?.name ||
                                                    item.product_name ||
                                                    "Producto"}
                                                </p>
                                                <p className="text-xs text-admin-text-tertiary">
                                                  Cantidad: {item.quantity} ×{" "}
                                                  {formatCurrency(
                                                    item.unit_price,
                                                  )}
                                                </p>
                                              </div>
                                            </div>
                                            <p className="text-sm font-medium text-admin-success">
                                              {formatCurrency(item.total_price)}
                                            </p>
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-10 w-10 text-admin-text-tertiary mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-admin-text-tertiary">
                    Sin pedidos registrados
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Empty State for No Orders */}
          {customer.analytics?.orderCount === 0 && (
            <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <CardContent className="text-center py-16">
                <TrendingUp className="h-16 w-16 text-admin-text-tertiary mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-admin-text-primary mb-2">
                  Sin Datos de Analíticas
                </h3>
                <p className="text-admin-text-tertiary mb-6 max-w-md mx-auto">
                  Este cliente aún no ha realizado ningún pedido. Las analíticas
                  estarán disponibles una vez que realice su primera compra a
                  través del POS.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Customer Analytics Content */}
          {(customer.analytics?.orderCount ?? 0) > 0 && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Favorite Products */}
                {customer.analytics?.favoriteProducts &&
                  customer.analytics.favoriteProducts.length > 0 && (
                    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Heart className="h-5 w-5 mr-2" />
                          Productos Favoritos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {customer.analytics.favoriteProducts
                            .slice(0, 5)
                            .map((item: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-[#AE000010] transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  {item.product?.featured_image ? (
                                    <img
                                      src={item.product.featured_image}
                                      alt={item.product.name || "Product"}
                                      className="w-12 h-12 object-cover rounded border border-gray-200"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                      <Package className="h-6 w-6 text-gray-400" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium">
                                      {item.product?.name || "Producto"}
                                    </p>
                                    <p className="text-sm text-admin-text-tertiary">
                                      {item.quantity}{" "}
                                      {item.quantity === 1
                                        ? "unidad"
                                        : "unidades"}{" "}
                                      compradas
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-admin-success">
                                    {formatCurrency(item.totalSpent)}
                                  </p>
                                  <p className="text-xs text-admin-text-tertiary">
                                    {formatCurrency(
                                      item.totalSpent / item.quantity,
                                    )}{" "}
                                    por unidad
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Order Status Distribution */}
                {customer.analytics?.orderStatusCounts && (
                  <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Activity className="h-5 w-5 mr-2" />
                        Distribución de Estados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(
                          customer.analytics.orderStatusCounts,
                        ).map(([status, count]) => (
                          <div
                            key={status}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2">
                              {getOrderStatusBadge(status)}
                            </div>
                            <span className="font-medium">{count} pedidos</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Monthly Spending Chart */}
              {customer.analytics?.monthlySpending &&
                customer.analytics.monthlySpending.length > 0 && (
                  <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <TrendingUp className="h-5 w-5 mr-2" />
                          Tendencia de Gastos (Últimos 12 meses)
                        </div>
                        <div className="text-sm font-normal text-admin-text-tertiary">
                          Total: {formatCurrency(customer.analytics.totalSpent)}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {customer.analytics.monthlySpending.map(
                          (month: any, index: number) => (
                            <div
                              key={index}
                              className={`text-center p-3 border rounded-lg transition-all hover:shadow-md ${
                                month.amount > 0
                                  ? "bg-admin-success/10 border-admin-success/30"
                                  : "bg-gray-50"
                              }`}
                            >
                              <p className="text-xs font-medium text-admin-text-tertiary mb-1">
                                {month.month}
                              </p>
                              <p className="font-bold text-sm text-admin-text-primary">
                                {formatCurrency(month.amount)}
                              </p>
                              <p className="text-xs text-admin-text-tertiary mt-1">
                                {month.orders}{" "}
                                {month.orders === 1 ? "pedido" : "pedidos"}
                              </p>
                            </div>
                          ),
                        )}
                      </div>

                      {/* Summary Stats */}
                      <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-admin-text-tertiary">
                            Promedio Mensual
                          </p>
                          <p className="font-bold text-lg text-admin-text-primary">
                            {formatCurrency(customer.analytics.totalSpent / 12)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-tertiary">
                            Mejor Mes
                          </p>
                          <p className="font-bold text-lg text-admin-success">
                            {formatCurrency(
                              Math.max(
                                ...customer.analytics.monthlySpending.map(
                                  (m: any) => m.amount,
                                ),
                              ),
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-tertiary">
                            Meses Activos
                          </p>
                          <p className="font-bold text-lg text-admin-accent-primary">
                            {
                              customer.analytics.monthlySpending.filter(
                                (m: any) => m.amount > 0,
                              ).length
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Prescription Dialog */}
      <Dialog
        open={showCreatePrescription}
        onOpenChange={setShowCreatePrescription}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-7xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle>
              {editingPrescription ? "Editar Receta" : "Nueva Receta"}
            </DialogTitle>
            <DialogDescription>
              {editingPrescription
                ? "Modifica los datos de la receta oftalmológica"
                : "Crea una nueva receta oftalmológica para este cliente"}
            </DialogDescription>
          </DialogHeader>
          <CreatePrescriptionForm
            customerId={customerId}
            initialData={editingPrescription || undefined}
            onSuccess={() => {
              setShowCreatePrescription(false);
              setEditingPrescription(null);
              fetchCustomer();
            }}
            onCancel={() => {
              setShowCreatePrescription(false);
              setEditingPrescription(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Create/Edit Appointment Dialog */}
      <Dialog
        open={showCreateAppointment}
        onOpenChange={setShowCreateAppointment}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? "Editar Cita" : "Nueva Cita"}
            </DialogTitle>
            <DialogDescription>
              {editingAppointment
                ? "Modifica los detalles de la cita"
                : "Crea una nueva cita para este cliente"}
            </DialogDescription>
          </DialogHeader>
          <CreateAppointmentForm
            initialData={editingAppointment || undefined}
            initialCustomerId={customerId}
            onSuccess={() => {
              setShowCreateAppointment(false);
              setEditingAppointment(null);
              fetchCustomer();
            }}
            onCancel={() => {
              setShowCreateAppointment(false);
              setEditingAppointment(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Create Quote Dialog */}
      <Dialog open={showCreateQuote} onOpenChange={setShowCreateQuote}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Presupuesto</DialogTitle>
            <DialogDescription>
              Crea un presupuesto para este cliente
            </DialogDescription>
          </DialogHeader>
          <CreateQuoteForm
            onSuccess={() => {
              setShowCreateQuote(false);
              fetchCustomer();
            }}
            onCancel={() => setShowCreateQuote(false)}
            initialCustomerId={customerId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

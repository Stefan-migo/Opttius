"use client";

import {
  Calendar,
  Calendar as CalendarIcon,
  Clock,
  Edit,
  Eye,
  FileText,
  Plus,
} from "lucide-react";
import Link from "next/link";

import { PrescriptionFullDisplay } from "@/components/admin/PrescriptionFullDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  Appointment,
  Customer,
  Prescription,
  Quote,
} from "@/lib/api/services";
import { formatCurrency } from "@/lib/utils";

interface PrescriptionManagementCardProps {
  customer: Customer;
  section: "prescriptions" | "appointments" | "quotes";
  onNew?: () => void;
  onEdit?: (item: unknown) => void;
}

export function PrescriptionManagementCard({
  customer,
  section,
  onNew,
  onEdit,
}: PrescriptionManagementCardProps) {
  switch (section) {
    case "prescriptions":
      return (
        <PrescriptionsSection
          customer={customer}
          onNew={onNew}
          onEdit={onEdit}
        />
      );
    case "appointments":
      return (
        <AppointmentsSection
          customer={customer}
          onNew={onNew}
          onEdit={onEdit}
        />
      );
    case "quotes":
      return <QuotesSection customer={customer} onNew={onNew} />;
    default:
      return null;
  }
}

function PrescriptionsSection({
  customer,
  onNew,
  onEdit,
}: {
  customer: Customer;
  onNew?: () => void;
  onEdit?: (item: unknown) => void;
}) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <CardTitle className="flex items-center text-admin-text-primary">
          <Eye className="h-5 w-5 mr-2" />
          Recetas Ópticas ({customer.prescriptions?.length || 0})
        </CardTitle>
        <Button className="min-h-[44px] w-full sm:w-auto" onClick={onNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Receta
        </Button>
      </div>

      {customer.prescriptions && customer.prescriptions.length > 0 ? (
        <div className="space-y-4">
          {customer.prescriptions.map((prescription: Prescription) => (
            <Card
              className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
              key={prescription.id}
            >
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div>
                    <CardTitle className="text-base sm:text-lg text-admin-text-primary">
                      Receta #
                      {prescription.prescription_number ||
                        prescription.id.slice(0, 8)}
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-admin-text-tertiary mt-1">
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
                  <div className="flex flex-wrap gap-2">
                    {prescription.is_current && (
                      <Badge variant="default">Actual</Badge>
                    )}
                    {prescription.is_active ? (
                      <Badge variant="default">Activa</Badge>
                    ) : (
                      <Badge variant="outline">Inactiva</Badge>
                    )}
                    <Button
                      className="min-h-[44px] w-full sm:w-auto"
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit?.(prescription)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
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
            <Button onClick={onNew}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primera Receta
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function AppointmentsSection({
  customer,
  onNew,
  onEdit,
}: {
  customer: Customer;
  onNew?: () => void;
  onEdit?: (item: unknown) => void;
}) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <CardTitle className="flex items-center text-admin-text-primary">
          <CalendarIcon className="h-5 w-5 mr-2" />
          Citas y Agendas ({customer.appointments?.length || 0})
        </CardTitle>
        <Button className="min-h-[44px] w-full sm:w-auto" onClick={onNew}>
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
            const statusColors: Record<string, string> = {
              scheduled: "bg-blue-100 text-blue-800",
              confirmed: "bg-green-100 text-green-800",
              completed: "bg-gray-100 text-gray-800",
              cancelled: "bg-red-100 text-red-800",
              no_show: "bg-orange-100 text-orange-800",
            };

            return (
              <Card
                className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                key={appointment.id}
              >
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg text-admin-text-primary">
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
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-admin-text-tertiary">
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
                        <div>Duración: {appointment.duration_minutes} min</div>
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
                <CardContent className="p-4 sm:p-6 pt-0">
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
                      <p className="text-sm text-admin-text-tertiary">Notas:</p>
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
                      className="min-h-[44px] w-full sm:w-auto"
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit?.(appointment)}
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
            <Button onClick={onNew}>
              <Plus className="h-4 w-4 mr-2" />
              Agendar Primera Cita
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function QuotesSection({
  customer,
  onNew,
}: {
  customer: Customer;
  onNew?: () => void;
}) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <CardTitle className="flex items-center text-admin-text-primary">
          <FileText className="h-5 w-5 mr-2" />
          Presupuestos ({customer.quotes?.length || 0})
        </CardTitle>
        <Button className="min-h-[44px] w-full sm:w-auto" onClick={onNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Presupuesto
        </Button>
      </div>

      {customer.quotes && customer.quotes.length > 0 ? (
        <div className="space-y-4">
          {customer.quotes.map((quote: Quote) => {
            const getStatusBadge = (status: string) => {
              type BadgeVariant =
                | "default"
                | "secondary"
                | "outline"
                | "destructive"
                | "healty"
                | null
                | undefined;
              const config: Record<
                string,
                { variant: BadgeVariant; label: string }
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
                className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                key={quote.id}
              >
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg text-admin-text-primary">
                        Presupuesto {quote.quote_number}
                      </CardTitle>
                      <p className="text-sm text-admin-text-tertiary mt-1">
                        Fecha:{" "}
                        {new Date(quote.quote_date).toLocaleDateString("es-CL")}
                        {quote.expiration_date && (
                          <>
                            {" "}
                            • Vence:{" "}
                            {new Date(quote.expiration_date).toLocaleDateString(
                              "es-CL",
                            )}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {getStatusBadge(quote.status)}
                      {quote.converted_to_work_order_id && (
                        <Link
                          href={`/admin/work-orders/${quote.converted_to_work_order_id}`}
                        >
                          <Button size="sm" variant="outline">
                            Ver Trabajo
                          </Button>
                        </Link>
                      )}
                      <Link href={`/admin/quotes/${quote.id}`}>
                        <Button size="sm" variant="outline">
                          Ver Detalle
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                        {quote.treatments_cost && quote.treatments_cost > 0 && (
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
            <Button onClick={onNew}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Presupuesto
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

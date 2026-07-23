"use client";

import { Calendar, Edit, Eye, FileText, Plus } from "lucide-react";
import Link from "next/link";

import { PrescriptionFullDisplay } from "@/components/admin/PrescriptionFullDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Appointment, Customer, Prescription, Quote } from "@/lib/api/services";
import { formatCurrency } from "@/lib/utils";

export function PrescriptionsSection({ customer, onNew, onEdit }: { customer: Customer; onNew?: () => void; onEdit?: (item: unknown) => void }) {
  return (<><div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"><CardTitle className="flex items-center text-admin-text-primary"><Eye className="h-5 w-5 mr-2" />Recetas Ópticas ({customer.prescriptions?.length || 0})</CardTitle><Button className="min-h-[44px] w-full sm:w-auto" onClick={onNew}><Plus className="h-4 w-4 mr-2" />Nueva Receta</Button></div>
    {customer.prescriptions && customer.prescriptions.length > 0 ? (
      <div className="space-y-4">{customer.prescriptions.map((p: Prescription) => (
        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]" key={p.id}>
          <CardHeader className="p-4 sm:p-6"><div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4"><div><CardTitle className="text-base sm:text-lg text-admin-text-primary">Receta #{p.prescription_number || p.id.slice(0, 8)}</CardTitle><p className="text-xs sm:text-sm text-admin-text-tertiary mt-1">Fecha: {new Date(p.prescription_date).toLocaleDateString("es-CL")}{p.expiration_date && <> • Vence: {new Date(p.expiration_date).toLocaleDateString("es-CL")}</>}</p></div><div className="flex flex-wrap gap-2">{p.is_current && <Badge variant="default">Actual</Badge>}{p.is_active ? <Badge variant="default">Activa</Badge> : <Badge variant="outline">Inactiva</Badge>}<Button className="min-h-[44px] w-full sm:w-auto" size="sm" variant="outline" onClick={() => onEdit?.(p)}><Edit className="h-3 w-3 mr-1" />Editar</Button></div></div></CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0"><PrescriptionFullDisplay prescription={p} showCard={false} /></CardContent>
        </Card>
      ))}</div>
    ) : (
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"><CardContent className="text-center py-12"><Eye className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" /><h3 className="text-lg font-semibold text-admin-text-primary mb-2">Sin recetas</h3><p className="text-admin-text-tertiary mb-4">Este cliente aún no tiene recetas registradas.</p><Button onClick={onNew}><Plus className="h-4 w-4 mr-2" />Agregar Primera Receta</Button></CardContent></Card>
    )}</>);
}

export function AppointmentsSection({ customer, onNew, onEdit }: { customer: Customer; onNew?: () => void; onEdit?: (item: unknown) => void }) {
  const statusColors: Record<string, string> = { scheduled: "bg-blue-100 text-blue-800", confirmed: "bg-green-100 text-green-800", completed: "bg-gray-100 text-gray-800", cancelled: "bg-red-100 text-red-800", no_show: "bg-orange-100 text-orange-800" };
  const typeLabels: Record<string, string> = { eye_exam: "Examen de la Vista", consultation: "Consulta", fitting: "Ajuste de Lentes", delivery: "Entrega de Lentes", repair: "Reparación", follow_up: "Seguimiento", emergency: "Emergencia" };
  const statusLabels: Record<string, string> = { scheduled: "Programada", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada", no_show: "No asistió" };

  return (<><div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"><CardTitle className="flex items-center text-admin-text-primary"><Calendar className="h-5 w-5 mr-2" />Citas y Agendas ({customer.appointments?.length || 0})</CardTitle><Button className="min-h-[44px] w-full sm:w-auto" onClick={onNew}><Plus className="h-4 w-4 mr-2" />Nueva Cita</Button></div>
    {customer.appointments && customer.appointments.length > 0 ? (
      <div className="space-y-4">{customer.appointments.map((a: Appointment) => {
        const d = new Date(`${a.appointment_date}T${a.appointment_time}`);
        return (<Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]" key={a.id}>
          <CardHeader className="p-4 sm:p-6"><div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4"><div className="min-w-0"><CardTitle className="text-base sm:text-lg text-admin-text-primary">{typeLabels[a.appointment_type] || "Cita"}</CardTitle><div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-admin-text-tertiary"><span>{d.toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span><span>{d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span><span>Duración: {a.duration_minutes} min</span></div></div><Badge className={statusColors[a.status] || "bg-gray-100 text-gray-800"}>{statusLabels[a.status] || a.status}</Badge></div></CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">{a.reason && <div className="mb-3"><p className="text-sm text-admin-text-tertiary">Motivo:</p><p className="font-medium">{a.reason}</p></div>}{a.notes && <div className="mb-3"><p className="text-sm text-admin-text-tertiary">Notas:</p><p>{a.notes}</p></div>}{a.outcome && <div className="mb-3"><p className="text-sm text-admin-text-tertiary">Resultado:</p><p>{a.outcome}</p></div>}{a.follow_up_required && a.follow_up_date && <div className="mt-3 pt-3 border-t"><p className="text-sm text-admin-text-tertiary">Seguimiento requerido:</p><p className="font-medium text-admin-text-primary">{new Date(a.follow_up_date).toLocaleDateString("es-CL")}</p></div>}<div className="mt-4 pt-4 border-t flex justify-end"><Button className="min-h-[44px] w-full sm:w-auto" size="sm" variant="outline" onClick={() => onEdit?.(a)}><Edit className="h-4 w-4 mr-2" />Editar Cita</Button></div></CardContent>
        </Card>);
      })}</div>
    ) : (
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"><CardContent className="text-center py-12"><Calendar className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" /><h3 className="text-lg font-semibold text-admin-text-primary mb-2">Sin citas</h3><p className="text-admin-text-tertiary mb-4">Este cliente aún no tiene citas programadas.</p><Button onClick={onNew}><Plus className="h-4 w-4 mr-2" />Agendar Primera Cita</Button></CardContent></Card>
    )}</>);
}

export function QuotesSection({ customer, onNew }: { customer: Customer; onNew?: () => void }) {
  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = { draft: { variant: "outline", label: "Borrador" }, sent: { variant: "default", label: "Enviado" }, accepted: { variant: "default", label: "Aceptado" }, rejected: { variant: "destructive", label: "Rechazado" }, expired: { variant: "outline", label: "Expirado" }, converted_to_work: { variant: "secondary", label: "Convertido" } };
    const c = config[status] || { variant: "outline", label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (<><div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"><CardTitle className="flex items-center text-admin-text-primary"><FileText className="h-5 w-5 mr-2" />Presupuestos ({customer.quotes?.length || 0})</CardTitle><Button className="min-h-[44px] w-full sm:w-auto" onClick={onNew}><Plus className="h-4 w-4 mr-2" />Nuevo Presupuesto</Button></div>
    {customer.quotes && customer.quotes.length > 0 ? (
      <div className="space-y-4">{customer.quotes.map((q: Quote) => (
        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]" key={q.id}>
          <CardHeader className="p-4 sm:p-6"><div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4"><div className="min-w-0"><CardTitle className="text-base sm:text-lg text-admin-text-primary">Presupuesto {q.quote_number}</CardTitle><p className="text-sm text-admin-text-tertiary mt-1">Fecha: {new Date(q.quote_date).toLocaleDateString("es-CL")}{q.expiration_date && <> • Vence: {new Date(q.expiration_date).toLocaleDateString("es-CL")}</>}</p></div><div className="flex flex-wrap gap-2 items-center">{getStatusBadge(q.status)}{q.converted_to_work_order_id && <Link href={`/admin/work-orders/${q.converted_to_work_order_id}`}><Button size="sm" variant="outline">Ver Trabajo</Button></Link>}<Link href={`/admin/quotes/${q.id}`}><Button size="sm" variant="outline">Ver Detalle</Button></Link></div></div></CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"><div><p className="text-sm text-admin-text-tertiary mb-2">Detalles del Presupuesto</p><div className="space-y-1 text-sm">{q.frame_name && <p><span className="text-admin-text-tertiary">Marco:</span> <span className="font-medium">{q.frame_name}</span></p>}{q.lens_type && <p><span className="text-admin-text-tertiary">Tipo de lente:</span> <span className="font-medium">{q.lens_type}</span></p>}{q.lens_material && <p><span className="text-admin-text-tertiary">Material:</span> <span className="font-medium">{q.lens_material}</span></p>}</div></div><div><p className="text-sm text-admin-text-tertiary mb-2">Información de Precio</p><div className="space-y-1 text-sm">{q.frame_price && q.frame_price > 0 && <p><span className="text-admin-text-tertiary">Marco:</span> <span className="font-medium">{formatCurrency(q.frame_price)}</span></p>}{q.lens_cost && q.lens_cost > 0 && <p><span className="text-admin-text-tertiary">Lente:</span> <span className="font-medium">{formatCurrency(q.lens_cost)}</span></p>}{q.treatments_cost && q.treatments_cost > 0 && <p><span className="text-admin-text-tertiary">Tratamientos:</span> <span className="font-medium">{formatCurrency(q.treatments_cost)}</span></p>}{q.labor_cost && q.labor_cost > 0 && <p><span className="text-admin-text-tertiary">Mano de obra:</span> <span className="font-medium">{formatCurrency(q.labor_cost)}</span></p>}{q.total_amount && <p className="pt-2 border-t"><span className="text-admin-text-tertiary">Total:</span> <span className="font-medium text-admin-success text-base">{formatCurrency(q.total_amount)}</span></p>}</div></div></div></CardContent>
        </Card>
      ))}</div>
    ) : (
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"><CardContent className="text-center py-12"><FileText className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" /><h3 className="text-lg font-semibold text-admin-text-primary mb-2">Sin presupuestos</h3><p className="text-admin-text-tertiary mb-4">Este cliente aún no tiene presupuestos registrados.</p><Button onClick={onNew}><Plus className="h-4 w-4 mr-2" />Crear Primer Presupuesto</Button></CardContent></Card>
    )}</>);
}

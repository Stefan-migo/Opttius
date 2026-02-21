"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Info } from "lucide-react";

const AUTOMATIC_EMAILS = [
  {
    name: "Confirmación de pedido",
    trigger: "Cuando se crea una orden o se reenvía manualmente",
    template: "order_confirmation",
    routes: "orders/route, orders/[id]/notify",
  },
  {
    name: "Presupuesto enviado",
    trigger: "Cuando se envía un presupuesto al cliente",
    template: "quote_sent",
    routes: "quotes/route, quotes/[id]/route",
  },
  {
    name: "Confirmación de cita",
    trigger: "Cuando se crea una nueva cita",
    template: "appointment_confirmation",
    routes: "appointments/route",
  },
  {
    name: "Trabajo listo para retiro",
    trigger: "Cuando el trabajo cambia a estado 'Listo para retiro'",
    template: "work_order_ready",
    routes: "work-orders/[id]/status",
  },
  {
    name: "Envío de pedido",
    trigger: "Cuando el estado del pedido cambia a 'Enviado'",
    template: "shipping_notification",
    routes: "orders/[id]/route",
  },
  {
    name: "Confirmación de entrega",
    trigger: "Cuando el estado del pedido cambia a 'Entregado'",
    template: "delivery_confirmation",
    routes: "orders/[id]/route",
  },
];

const AVAILABLE_NOT_INTEGRATED = [
  {
    name: "Recordatorio de cita",
    template: "appointment_reminder",
    note: "Requiere cron/scheduled job",
  },
  {
    name: "Presupuesto por expirar",
    template: "quote_expiring",
    note: "Requiere cron/scheduled job",
  },
  {
    name: "Bienvenida de cuenta",
    template: "account_welcome",
    note: "Disponible para integración en registro de clientes",
  },
];

export default function AutomaticEmailsInfo() {
  return (
    <Card className="border-admin-border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-admin-text-primary">
          <Mail className="h-5 w-5 text-admin-accent-primary" />
          Emails automáticos a clientes
        </CardTitle>
        <CardDescription>
          Lista de correos que se envían automáticamente a los clientes según
          eventos del sistema. Las plantillas se gestionan más abajo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-admin-text-secondary mb-3">
            Emails enviados automáticamente
          </h4>
          <div className="space-y-2">
            {AUTOMATIC_EMAILS.map((email, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-admin-bg-tertiary/50 border border-admin-border-primary/30"
              >
                <div>
                  <p className="font-medium text-admin-text-primary">
                    {email.name}
                  </p>
                  <p className="text-xs text-admin-text-tertiary mt-0.5">
                    {email.trigger}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-admin-text-tertiary bg-admin-bg-secondary px-2 py-1 rounded">
                    {email.template}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-admin-border-primary/30">
          <h4 className="text-sm font-semibold text-admin-text-secondary mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-admin-info" />
            Plantillas disponibles (no integradas en flujos automáticos)
          </h4>
          <p className="text-xs text-admin-text-tertiary mb-3">
            Estas plantillas existen pero requieren un cron o integración manual
            para enviarse.
          </p>
          <div className="space-y-2">
            {AVAILABLE_NOT_INTEGRATED.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded bg-admin-bg-tertiary/30 text-admin-text-tertiary"
              >
                <span className="text-sm">{item.name}</span>
                <span className="text-[10px] font-mono">{item.template}</span>
                <span className="text-[10px] italic">{item.note}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

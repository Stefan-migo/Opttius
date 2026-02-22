"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Info, AlertCircle } from "lucide-react";

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
    name: "Lentes listo para retiro",
    trigger: "Cuando el trabajo cambia a estado 'Listo para retiro'",
    template: "work_order_ready",
    routes: "work-orders/[id]/status",
  },
  {
    name: "Recordatorio de cita",
    trigger: "Cron diario: 24h antes de la cita",
    template: "appointment_reminder",
    routes: "cron/appointment-reminders",
    note: "Pendiente de cron",
  },
  {
    name: "Presupuesto por expirar",
    trigger: "Cron diario: presupuestos que expiran en 24-48h",
    template: "quote_expiring",
    routes: "cron/quote-expiring",
    note: "Pendiente de cron",
  },
  {
    name: "Bienvenida de cuenta",
    trigger: "Cuando se crea un nuevo cliente con email",
    template: "account_welcome",
    routes: "customers/route",
    note: "Pendiente de integración",
  },
];

const BLOCKED_EMAILS = [
  {
    name: "Envío de pedido",
    template: "order_shipped",
    reason: "Bloqueado - funcionalidad de envío no implementada",
  },
  {
    name: "Confirmación de entrega",
    template: "order_delivered",
    reason: "Bloqueado - funcionalidad de envío no implementada",
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
          eventos del sistema. Las plantillas se gestionan arriba.
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
                  {email.note && (
                    <p className="text-xs text-amber-600 mt-1 italic">
                      {email.note}
                    </p>
                  )}
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
            <AlertCircle className="h-4 w-4 text-amber-600" />
            Emails bloqueados temporalmente
          </h4>
          <p className="text-xs text-admin-text-tertiary mb-3">
            Estas plantillas están deshabilitadas hasta que se implemente el
            flujo de envío de pedidos.
          </p>
          <div className="space-y-2">
            {BLOCKED_EMAILS.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 text-admin-text-tertiary"
              >
                <span className="text-sm">{item.name}</span>
                <span className="text-[10px] font-mono">{item.template}</span>
                <span className="text-[10px] italic text-amber-700 dark:text-amber-400">
                  {item.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

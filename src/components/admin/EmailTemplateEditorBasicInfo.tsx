"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  mode: "organization" | "saas";
  formData: { name: string; type: string };
  isSystem: boolean;
  onChange: (field: string, value: unknown) => void;
}

export function EmailTemplateEditorBasicInfo({
  mode,
  formData,
  isSystem,
  onChange,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la Plantilla *</Label>
        <Input
          required
          id="name"
          placeholder="Ej: Confirmación de Pedido"
          value={formData.name}
          onChange={(e) => onChange("name", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo *</Label>
        <p className="text-xs text-muted-foreground">
          Los tipos con trigger automático se envían cuando ocurre el evento
          correspondiente. &quot;Personalizado&quot; y &quot;Marketing&quot;
          requieren envío manual.
        </p>
        <Select
          disabled={isSystem}
          value={formData.type}
          onValueChange={(value) => onChange("type", value)}
        >
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mode === "saas" ? (
              <>
                <SelectItem value="saas_welcome">Bienvenida SaaS</SelectItem>
                <SelectItem value="saas_trial_ending">Fin de Prueba</SelectItem>
                <SelectItem value="saas_subscription_success">Suscripción Exitosa</SelectItem>
                <SelectItem value="saas_payment_failed">Pago Fallido SaaS</SelectItem>
                <SelectItem value="saas_payment_reminder">Recordatorio Pago</SelectItem>
                <SelectItem value="saas_security_alert">Alerta de Seguridad</SelectItem>
                <SelectItem value="saas_onboarding">Onboarding</SelectItem>
                <SelectItem value="saas_maintenance">Mantenimiento Programado</SelectItem>
                <SelectItem value="saas_support_ticket_created">Ticket Creado</SelectItem>
                <SelectItem value="saas_support_new_response">Nueva Respuesta</SelectItem>
                <SelectItem value="saas_support_ticket_assigned">Ticket Asignado</SelectItem>
                <SelectItem value="saas_support_ticket_resolved">Ticket Resuelto</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="order_confirmation">Confirmación de Pedido</SelectItem>
                <SelectItem value="order_shipped">Pedido Enviado</SelectItem>
                <SelectItem value="order_delivered">Pedido Entregado</SelectItem>
                <SelectItem value="password_reset">Restablecer Contraseña</SelectItem>
                <SelectItem value="account_welcome">Bienvenida</SelectItem>
                <SelectItem value="appointment_confirmation">Confirmación de Cita</SelectItem>
                <SelectItem value="appointment_reminder">Recordatorio de Cita (24h)</SelectItem>
                <SelectItem value="appointment_reminder_2h">Recordatorio de Cita (2h)</SelectItem>
                <SelectItem value="appointment_cancelation">Cancelación de Cita</SelectItem>
                <SelectItem value="appointment_rescheduled">Cita Reprogramada</SelectItem>
                <SelectItem value="appointment_follow_up_reminder">Recordatorio de Control</SelectItem>
                <SelectItem value="prescription_expiring">Receta por Vencer</SelectItem>
                <SelectItem value="quote_sent">Presupuesto Enviado</SelectItem>
                <SelectItem value="quote_expiring">Presupuesto Por Expirar</SelectItem>
                <SelectItem value="work_order_ready">Lentes Listo para Retiro</SelectItem>
                <SelectItem value="work_order_delivered">Entrega Completada + Encuesta</SelectItem>
                <SelectItem value="payment_success">Pago Exitoso</SelectItem>
                <SelectItem value="payment_failed">Pago Fallido</SelectItem>
                <SelectItem value="low_stock_alert">Alerta de Stock Bajo</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

"use client";

import { CreditCard, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface PaymentMethodToggleProps {
  loading: boolean;
  getConfigValue: (key: string) => unknown;
  handleUpdate: (key: string, value: unknown) => Promise<void>;
}

export default function PaymentMethodToggle({
  loading,
  getConfigValue,
  handleUpdate,
}: PaymentMethodToggleProps) {
  return (
    <>
      {/* Payment Methods */}
      <Card
        className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: "var(--admin-border-primary)" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Métodos de Pago
          </CardTitle>
          <CardDescription>
            Selecciona los métodos de pago que estarán disponibles para tus clientes.
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Nota: &quot;Dinero en cuenta de Mercado Pago&quot; siempre está disponible y no puede deshabilitarse según las políticas de MercadoPago.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-dashed">
            <div className="flex items-center gap-2">
              <Label className="font-semibold" htmlFor="method_account_money">
                Dinero en cuenta de Mercado Pago
              </Label>
              <Badge className="text-xs" variant="default">Siempre disponible</Badge>
            </div>
            <Switch checked={true} className="opacity-50" disabled={true} id="method_account_money" />
          </div>

          {["credit_card", "debit_card", "cash", "bank_transfer"].map((method) => {
            const methodNames: Record<string, string> = {
              credit_card: "Tarjeta de Crédito",
              debit_card: "Tarjeta de Débito",
              cash: "Efectivo",
              bank_transfer: "Transferencia Bancaria",
            };

            const currentMethods = getConfigValue("payment_methods") || [];
            const isEnabled = Array.isArray(currentMethods) && currentMethods.includes(method);

            return (
              <div className="flex items-center justify-between" key={method}>
                <Label htmlFor={`method_${method}`}>{methodNames[method]}</Label>
                <Switch
                  checked={isEnabled}
                  disabled={loading}
                  id={`method_${method}`}
                  onCheckedChange={(checked) => {
                    const current = getConfigValue("payment_methods") || [];
                    const updated = checked
                      ? [...(Array.isArray(current) ? current : []), method]
                      : Array.isArray(current)
                        ? current.filter((m: string) => m !== method)
                        : [];
                    handleUpdate("payment_methods", updated);
                  }}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Checkout Settings */}
      <Card
        className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: "var(--admin-border-primary)" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Checkout
          </CardTitle>
          <CardDescription>
            Personaliza el comportamiento del proceso de pago
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="max_installments">Máximo de Cuotas</Label>
            <Select
              disabled={loading}
              value={String(getConfigValue("max_installments") || 12)}
              onValueChange={(value) => handleUpdate("max_installments", parseInt(value))}
            >
              <SelectTrigger id="max_installments">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 3, 6, 9, 12].map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num} {num === 1 ? "cuota" : "cuotas"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Número máximo de cuotas permitidas para pagos con tarjeta</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto_return">Retorno Automático</Label>
              <p className="text-xs text-muted-foreground">Redirige automáticamente al usuario después del pago</p>
            </div>
            <Switch
              checked={(getConfigValue("auto_return") as boolean) ?? true}
              disabled={loading}
              id="auto_return"
              onCheckedChange={(checked) => handleUpdate("auto_return", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="binary_mode">Modo Binario</Label>
              <p className="text-xs text-muted-foreground">Los pagos solo pueden estar aprobados o rechazados (sin estados intermedios)</p>
            </div>
            <Switch
              checked={(getConfigValue("binary_mode") as boolean) || false}
              disabled={loading}
              id="binary_mode"
              onCheckedChange={(checked) => handleUpdate("binary_mode", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}

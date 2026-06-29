"use client";

import { AlertTriangle, CheckCircle, Eye, EyeOff, Shield, TestTube } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PaymentGatewayConfigProps {
  configs: unknown[];
  loading: boolean;
  testing: boolean;
  showTokens: Record<string, boolean>;
  credentialValues: Record<string, string>;
  connectionStatus: { status: string; message?: string };
  getConfigValue: (key: string) => unknown;
  handleUpdate: (key: string, value: unknown) => Promise<void>;
  handleToggleVisibility: (key: string) => void;
  handleCredentialChange: (key: string, value: string) => void;
  handleCredentialBlur: (key: string) => void;
  handleTestConnection: () => void;
}

function maskValue(value: string | undefined): string {
  if (!value || value.length < 8) return "••••••••";
  return value.substring(0, 4) + "••••••••" + value.substring(value.length - 4);
}

export default function PaymentGatewayConfig(props: PaymentGatewayConfigProps) {
  const {
    configs,
    loading,
    testing,
    showTokens,
    credentialValues,
    connectionStatus,
    getConfigValue,
    handleUpdate,
    handleToggleVisibility,
    handleCredentialChange,
    handleCredentialBlur,
    handleTestConnection,
  } = props;

  const renderInput = (
    id: string,
    label: string,
    placeholder: string,
    description: string,
  ) => {
    const configVal = getConfigValue(id) as string | undefined;
    const showVal = showTokens[id];
    const displayValue = showVal
      ? (credentialValues[id] ?? configVal ?? "")
      : credentialValues[id]
        ? maskValue(credentialValues[id])
        : maskValue(configVal);

    return (
      <div className="space-y-2" key={id}>
        <Label htmlFor={id}>{label}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              className="pr-10"
              disabled={loading}
              id={id}
              placeholder={placeholder}
              type={showVal ? "text" : "password"}
              value={displayValue}
              onBlur={() => handleCredentialBlur(id)}
              onChange={(e) => handleCredentialChange(id, e.target.value)}
            />
            <Button
              className="absolute right-0 top-0 h-full px-3"
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => handleToggleVisibility(id)}
            >
              {showVal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    );
  };

  const prodFields = [
    { key: "access_token", label: "Access Token (Producción)", placeholder: "PROD_ACCESS_TOKEN_HERE", desc: "Token de acceso de producción de MercadoPago" },
    { key: "public_key", label: "Public Key (Producción)", placeholder: "PUBLIC_KEY_HERE", desc: "Clave pública de producción de MercadoPago (usada en el frontend)" },
    { key: "webhook_secret", label: "Webhook Secret (Producción)", placeholder: "WEBHOOK_SECRET_HERE", desc: "Secreto para verificar la autenticidad de los webhooks de producción" },
  ];

  const testFields = [
    { key: "test_access_token", label: "Access Token (Prueba)", placeholder: "TEST_ACCESS_TOKEN_HERE", desc: "Token de acceso de prueba (sandbox) de MercadoPago" },
    { key: "test_public_key", label: "Public Key (Prueba)", placeholder: "TEST_PUBLIC_KEY_HERE", desc: "Clave pública de prueba (sandbox) de MercadoPago" },
    { key: "test_webhook_secret", label: "Webhook Secret (Prueba)", placeholder: "TEST_WEBHOOK_SECRET_HERE", desc: "Secreto para verificar la autenticidad de los webhooks de prueba" },
  ];

  return (
    <Card
      className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
      style={{ backgroundColor: "var(--admin-border-primary)" }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Credenciales de MercadoPago
        </CardTitle>
        <CardDescription>
          Configura las credenciales de acceso a MercadoPago. Estas son sensibles y se almacenan de forma segura.
          <br />
          <span className="text-xs text-muted-foreground mt-2 block">
            <strong>Nota:</strong> Las credenciales de producción se usan cuando &quot;Modo de Prueba&quot; está desactivado. Las credenciales de prueba se usan cuando &quot;Modo de Prueba&quot; está activado. Puedes configurar ambas por separado.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Badge className="font-semibold" variant="default">Producción</Badge>
            <p className="text-xs text-muted-foreground">Usadas cuando &quot;Modo de Prueba&quot; está desactivado</p>
          </div>
          {prodFields.map((f) => renderInput(f.key, f.label, f.placeholder, f.desc))}
        </div>

        <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-dashed">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Badge className="font-semibold" variant="default">Prueba (Sandbox)</Badge>
            <p className="text-xs text-muted-foreground">Usadas cuando &quot;Modo de Prueba&quot; está activado</p>
          </div>
          {testFields.map((f) => renderInput(f.key, f.label, f.placeholder, f.desc))}
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="test_mode">Modo de Prueba (Sandbox)</Label>
            <p className="text-xs text-muted-foreground">
              <strong>¿Cómo funciona?</strong> Cuando está activado, el sistema automáticamente usará las credenciales de prueba configuradas arriba. Cuando está desactivado, usará las credenciales de producción.
              <br />
              <span className="text-amber-600 font-semibold mt-1 block">
                Estado actual: {getConfigValue("test_mode")
                  ? "Sandbox (Pruebas) - Usando credenciales de prueba"
                  : "Producción - Usando credenciales de producción"}
              </span>
            </p>
          </div>
          <Switch
            checked={(getConfigValue("test_mode") as boolean) || false}
            disabled={loading}
            id="test_mode"
            onCheckedChange={(checked) => handleUpdate("test_mode", checked)}
          />
        </div>

        <div className="flex items-center gap-4 pt-4 border-t">
          <Button disabled={testing || loading} variant="outline" onClick={handleTestConnection}>
            <TestTube className={`h-4 w-4 mr-2 ${testing ? "animate-spin" : ""}`} />
            {testing ? "Probando..." : "Probar Conexión"}
          </Button>
          {connectionStatus.status === "success" && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{connectionStatus.message}</span>
            </div>
          )}
          {connectionStatus.status === "error" && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{connectionStatus.message}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

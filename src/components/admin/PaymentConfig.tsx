"use client";

import {
  AlertTriangle,
  CheckCircle,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  Settings,
  Shield,
  TestTube,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface PaymentConfig {
  mercadopago_access_token?: string;
  mercadopago_public_key?: string;
  mercadopago_webhook_secret?: string;
  mercadopago_test_mode?: boolean;
  mercadopago_payment_methods?: string[];
  mercadopago_max_installments?: number;
  mercadopago_auto_return?: boolean;
  mercadopago_binary_mode?: boolean;
}

interface PaymentConfigProps {
  configs: unknown[];
  onUpdate: (configKey: string, value: unknown) => Promise<void>;
}

export default function PaymentConfig({
  configs,
  onUpdate,
}: PaymentConfigProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [webhookUrl, setWebhookUrl] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<{
    status: "idle" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  // Local state for credential inputs (to avoid updating on every keystroke)
  const [credentialValues, setCredentialValues] = useState<
    Record<string, string>
  >({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Build config map from props
  const configMap: PaymentConfig = {};
  configs.forEach((config) => {
    const key = config.config_key.replace("mercadopago_", "");
    configMap[key as keyof PaymentConfig] = config.config_value;
  });

  useEffect(() => {
    // Set webhook URL based on environment
    // Priority: 1. NEXT_PUBLIC_SITE_URL, 2. NEXT_PUBLIC_APP_URL, 3. Current origin, 4. Fallback
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "") ||
      "https://opttius.com";
    setWebhookUrl(`${baseUrl}/api/webhooks/mercadopago`);
  }, []);

  // Initialize credential values from configs when they change
  useEffect(() => {
    const initialValues: Record<string, string> = {};
    // Production credentials
    ["access_token", "public_key", "webhook_secret"].forEach((key) => {
      const config = configs.find((c) => c.config_key === `mercadopago_${key}`);
      const value = config?.config_value;
      if (value) {
        initialValues[key] = value;
      }
    });
    // Test credentials
    ["test_access_token", "test_public_key", "test_webhook_secret"].forEach(
      (key) => {
        const config = configs.find(
          (c) => c.config_key === `mercadopago_${key}`,
        );
        const value = config?.config_value;
        if (value) {
          initialValues[key] = value;
        }
      },
    );
    setCredentialValues((prev) => ({ ...prev, ...initialValues }));
  }, [configs]);

  const handleToggleVisibility = (key: string) => {
    setShowTokens((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL del webhook copiada al portapapeles");
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setConnectionStatus({ status: "idle" });

      const response = await fetch("/api/admin/system/payments/test", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus({
          status: "success",
          message: data.message || "Conexión exitosa",
        });
        toast.success("Conexión con MercadoPago exitosa");
      } else {
        setConnectionStatus({
          status: "error",
          message: data.message || data.error || "Error al conectar",
        });
        toast.error(
          data.message || data.error || "Error al conectar con MercadoPago",
        );
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionStatus({
        status: "error",
        message: "Error al probar la conexión",
      });
      toast.error("Error al probar la conexión");
    } finally {
      setTesting(false);
    }
  };

  const maskValue = (value: string | undefined): string => {
    if (!value || value.length < 8) return "••••••••";
    return (
      value.substring(0, 4) + "••••••••" + value.substring(value.length - 4)
    );
  };

  const getConfigValue = (key: string): unknown => {
    const config = configs.find((c) => c.config_key === `mercadopago_${key}`);
    return config?.config_value;
  };

  const handleUpdate = async (key: string, value: unknown) => {
    try {
      setLoading(true);
      await onUpdate(`mercadopago_${key}`, value);
    } catch (error) {
      console.error("Error updating config:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced update for credential inputs
  const handleCredentialChange = (key: string, value: string) => {
    // Update local state immediately for responsive UI
    setCredentialValues((prev) => ({ ...prev, [key]: value }));

    // Clear existing timer for this key
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    // Set new timer to update after user stops typing (800ms)
    debounceTimers.current[key] = setTimeout(() => {
      handleUpdate(key, value);
      delete debounceTimers.current[key];
    }, 800);
  };

  // Handle blur event to ensure value is saved when user leaves the field
  const handleCredentialBlur = (key: string) => {
    // Clear any pending debounce timer
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
      delete debounceTimers.current[key];
    }

    // Immediately save the current value
    const currentValue = credentialValues[key];
    if (currentValue !== undefined) {
      handleUpdate(key, currentValue);
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-azul-profundo">
          Configuración de Pagos
        </h2>
        <p className="text-tierra-media">
          Gestiona la configuración de pagos con MercadoPago
        </p>
      </div>
      {/* Credentials Section */}
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
            Configura las credenciales de acceso a MercadoPago. Estas son
            sensibles y se almacenan de forma segura.
            <br />
            <span className="text-xs text-muted-foreground mt-2 block">
              <strong>Nota:</strong> Las credenciales de producción se usan
              cuando &quot;Modo de Prueba&quot; está desactivado. Las
              credenciales de prueba se usan cuando &quot;Modo de Prueba&quot;
              está activado. Puedes configurar ambas por separado.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Production Credentials Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Badge className="font-semibold" variant="default">
                Producción
              </Badge>
              <p className="text-xs text-muted-foreground">
                Usadas cuando &quot;Modo de Prueba&quot; está desactivado
              </p>
            </div>

            {/* Access Token */}
            <div className="space-y-2">
              <Label htmlFor="access_token">Access Token (Producción)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    className="pr-10"
                    disabled={loading}
                    id="access_token"
                    placeholder="PROD_ACCESS_TOKEN_HERE"
                    type={showTokens.access_token ? "text" : "password"}
                    value={
                      showTokens.access_token
                        ? (credentialValues.access_token ??
                          getConfigValue("access_token") ??
                          "")
                        : credentialValues.access_token
                          ? maskValue(credentialValues.access_token)
                          : maskValue(getConfigValue("access_token"))
                    }
                    onBlur={() => handleCredentialBlur("access_token")}
                    onChange={(e) =>
                      handleCredentialChange("access_token", e.target.value)
                    }
                  />
                  <Button
                    className="absolute right-0 top-0 h-full px-3"
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() => handleToggleVisibility("access_token")}
                  >
                    {showTokens.access_token ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Token de acceso de producción de MercadoPago
              </p>
            </div>

            {/* Public Key */}
            <div className="space-y-2">
              <Label htmlFor="public_key">Public Key (Producción)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    className="pr-10"
                    disabled={loading}
                    id="public_key"
                    placeholder="PUBLIC_KEY_HERE"
                    type={showTokens.public_key ? "text" : "password"}
                    value={
                      showTokens.public_key
                        ? (credentialValues.public_key ??
                          getConfigValue("public_key") ??
                          "")
                        : credentialValues.public_key
                          ? maskValue(credentialValues.public_key)
                          : maskValue(getConfigValue("public_key"))
                    }
                    onBlur={() => handleCredentialBlur("public_key")}
                    onChange={(e) =>
                      handleCredentialChange("public_key", e.target.value)
                    }
                  />
                  <Button
                    className="absolute right-0 top-0 h-full px-3"
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() => handleToggleVisibility("public_key")}
                  >
                    {showTokens.public_key ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Clave pública de producción de MercadoPago (usada en el
                frontend)
              </p>
            </div>

            {/* Webhook Secret */}
            <div className="space-y-2">
              <Label htmlFor="webhook_secret">
                Webhook Secret (Producción)
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    className="pr-10"
                    disabled={loading}
                    id="webhook_secret"
                    placeholder="WEBHOOK_SECRET_HERE"
                    type={showTokens.webhook_secret ? "text" : "password"}
                    value={
                      showTokens.webhook_secret
                        ? (credentialValues.webhook_secret ??
                          getConfigValue("webhook_secret") ??
                          "")
                        : credentialValues.webhook_secret
                          ? maskValue(credentialValues.webhook_secret)
                          : maskValue(getConfigValue("webhook_secret"))
                    }
                    onBlur={() => handleCredentialBlur("webhook_secret")}
                    onChange={(e) =>
                      handleCredentialChange("webhook_secret", e.target.value)
                    }
                  />
                  <Button
                    className="absolute right-0 top-0 h-full px-3"
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() => handleToggleVisibility("webhook_secret")}
                  >
                    {showTokens.webhook_secret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Secreto para verificar la autenticidad de los webhooks de
                producción
              </p>
            </div>
          </div>

          {/* Test Credentials Section */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-dashed">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Badge className="font-semibold" variant="default">
                Prueba (Sandbox)
              </Badge>
              <p className="text-xs text-muted-foreground">
                Usadas cuando &quot;Modo de Prueba&quot; está activado
              </p>
            </div>

            {/* Test Access Token */}
            <div className="space-y-2">
              <Label htmlFor="test_access_token">Access Token (Prueba)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    className="pr-10"
                    disabled={loading}
                    id="test_access_token"
                    placeholder="TEST_ACCESS_TOKEN_HERE"
                    type={showTokens.test_access_token ? "text" : "password"}
                    value={
                      showTokens.test_access_token
                        ? (credentialValues.test_access_token ??
                          getConfigValue("test_access_token") ??
                          "")
                        : credentialValues.test_access_token
                          ? maskValue(credentialValues.test_access_token)
                          : maskValue(getConfigValue("test_access_token"))
                    }
                    onBlur={() => handleCredentialBlur("test_access_token")}
                    onChange={(e) =>
                      handleCredentialChange(
                        "test_access_token",
                        e.target.value,
                      )
                    }
                  />
                  <Button
                    className="absolute right-0 top-0 h-full px-3"
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() => handleToggleVisibility("test_access_token")}
                  >
                    {showTokens.test_access_token ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Token de acceso de prueba (sandbox) de MercadoPago
              </p>
            </div>

            {/* Test Public Key */}
            <div className="space-y-2">
              <Label htmlFor="test_public_key">Public Key (Prueba)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    className="pr-10"
                    disabled={loading}
                    id="test_public_key"
                    placeholder="TEST_PUBLIC_KEY_HERE"
                    type={showTokens.test_public_key ? "text" : "password"}
                    value={
                      showTokens.test_public_key
                        ? (credentialValues.test_public_key ??
                          getConfigValue("test_public_key") ??
                          "")
                        : credentialValues.test_public_key
                          ? maskValue(credentialValues.test_public_key)
                          : maskValue(getConfigValue("test_public_key"))
                    }
                    onBlur={() => handleCredentialBlur("test_public_key")}
                    onChange={(e) =>
                      handleCredentialChange("test_public_key", e.target.value)
                    }
                  />
                  <Button
                    className="absolute right-0 top-0 h-full px-3"
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() => handleToggleVisibility("test_public_key")}
                  >
                    {showTokens.test_public_key ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Clave pública de prueba (sandbox) de MercadoPago
              </p>
            </div>

            {/* Test Webhook Secret */}
            <div className="space-y-2">
              <Label htmlFor="test_webhook_secret">
                Webhook Secret (Prueba)
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    className="pr-10"
                    disabled={loading}
                    id="test_webhook_secret"
                    placeholder="TEST_WEBHOOK_SECRET_HERE"
                    type={showTokens.test_webhook_secret ? "text" : "password"}
                    value={
                      showTokens.test_webhook_secret
                        ? (credentialValues.test_webhook_secret ??
                          getConfigValue("test_webhook_secret") ??
                          "")
                        : credentialValues.test_webhook_secret
                          ? maskValue(credentialValues.test_webhook_secret)
                          : maskValue(getConfigValue("test_webhook_secret"))
                    }
                    onBlur={() => handleCredentialBlur("test_webhook_secret")}
                    onChange={(e) =>
                      handleCredentialChange(
                        "test_webhook_secret",
                        e.target.value,
                      )
                    }
                  />
                  <Button
                    className="absolute right-0 top-0 h-full px-3"
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      handleToggleVisibility("test_webhook_secret")
                    }
                  >
                    {showTokens.test_webhook_secret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Secreto para verificar la autenticidad de los webhooks de prueba
              </p>
            </div>
          </div>

          {/* Test Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="test_mode">Modo de Prueba (Sandbox)</Label>
              <p className="text-xs text-muted-foreground">
                <strong>¿Cómo funciona?</strong> Cuando está activado, el
                sistema automáticamente usará las credenciales de prueba
                configuradas arriba. Cuando está desactivado, usará las
                credenciales de producción. Esto permite cambiar entre entornos
                sin modificar las credenciales manualmente.
                <br />
                <span className="text-amber-600 font-semibold mt-1 block">
                  Estado actual:{" "}
                  {getConfigValue("test_mode")
                    ? "Sandbox (Pruebas) - Usando credenciales de prueba"
                    : "Producción - Usando credenciales de producción"}
                </span>
              </p>
            </div>
            <Switch
              checked={getConfigValue("test_mode") || false}
              disabled={loading}
              id="test_mode"
              onCheckedChange={(checked) => handleUpdate("test_mode", checked)}
            />
          </div>

          {/* Test Connection Button */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              disabled={testing || loading}
              variant="outline"
              onClick={handleTestConnection}
            >
              <TestTube
                className={`h-4 w-4 mr-2 ${testing ? "animate-spin" : ""}`}
              />
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

      {/* Payment Methods Section */}
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
            Selecciona los métodos de pago que estarán disponibles para tus
            clientes.
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Nota: &quot;Dinero en cuenta de Mercado Pago&quot; siempre está
              disponible y no puede deshabilitarse según las políticas de
              MercadoPago.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Account Money - Always Available (cannot be disabled by MercadoPago API) */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-dashed">
            <div className="flex items-center gap-2">
              <Label className="font-semibold" htmlFor="method_account_money">
                Dinero en cuenta de Mercado Pago
              </Label>
              <Badge className="text-xs" variant="default">
                Siempre disponible
              </Badge>
            </div>
            <Switch
              checked={true}
              className="opacity-50"
              disabled={true}
              id="method_account_money"
            />
          </div>

          {/* Other Payment Methods */}
          {["credit_card", "debit_card", "cash", "bank_transfer"].map(
            (method) => {
              const methodNames: Record<string, string> = {
                credit_card: "Tarjeta de Crédito",
                debit_card: "Tarjeta de Débito",
                cash: "Efectivo",
                bank_transfer: "Transferencia Bancaria",
              };

              const currentMethods = getConfigValue("payment_methods") || [];
              const isEnabled =
                Array.isArray(currentMethods) &&
                currentMethods.includes(method);

              return (
                <div className="flex items-center justify-between" key={method}>
                  <Label htmlFor={`method_${method}`}>
                    {methodNames[method]}
                  </Label>
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
            },
          )}
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
          {/* Max Installments */}
          <div className="space-y-2">
            <Label htmlFor="max_installments">Máximo de Cuotas</Label>
            <Select
              disabled={loading}
              value={String(getConfigValue("max_installments") || 12)}
              onValueChange={(value) =>
                handleUpdate("max_installments", parseInt(value))
              }
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
            <p className="text-xs text-muted-foreground">
              Número máximo de cuotas permitidas para pagos con tarjeta
            </p>
          </div>

          {/* Auto Return */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto_return">Retorno Automático</Label>
              <p className="text-xs text-muted-foreground">
                Redirige automáticamente al usuario después del pago
              </p>
            </div>
            <Switch
              checked={getConfigValue("auto_return") ?? true}
              disabled={loading}
              id="auto_return"
              onCheckedChange={(checked) =>
                handleUpdate("auto_return", checked)
              }
            />
          </div>

          {/* Binary Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="binary_mode">Modo Binario</Label>
              <p className="text-xs text-muted-foreground">
                Los pagos solo pueden estar aprobados o rechazados (sin estados
                intermedios)
              </p>
            </div>
            <Switch
              checked={getConfigValue("binary_mode") || false}
              disabled={loading}
              id="binary_mode"
              onCheckedChange={(checked) =>
                handleUpdate("binary_mode", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card
        className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: "var(--admin-border-primary)" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configuración de Webhook
          </CardTitle>
          <CardDescription>
            URL del webhook que debes configurar en el dashboard de MercadoPago
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL del Webhook</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                className="font-mono text-sm"
                value={webhookUrl}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyWebhookUrl}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copia esta URL y configúrala en tu dashboard de MercadoPago en la
              sección de Webhooks.
              <br />
              <strong>Nota:</strong> Esta URL se actualiza automáticamente según
              el dominio de tu aplicación. Si cambias de dominio, simplemente
              copia la nueva URL y actualízala en MercadoPago.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

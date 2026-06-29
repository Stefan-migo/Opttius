"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import PaymentGatewayConfig from "./_components/PaymentGatewayConfig";
import PaymentMethodToggle from "./_components/PaymentMethodToggle";
import PaymentTestSection from "./_components/PaymentTestSection";

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

export default function PaymentConfig({ configs, onUpdate }: PaymentConfigProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [webhookUrl, setWebhookUrl] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<{
    status: "idle" | "success" | "error";
    message?: string;
  }>({ status: "idle" });
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Build config map from props
  const configMap: PaymentConfig = {};
  configs.forEach((config) => {
    const configRecord = config as Record<string, unknown>;
    const key = (configRecord.config_key as string).replace("mercadopago_", "");
    (configMap as Record<string, unknown>)[key] = configRecord.config_value;
  });

  useEffect(() => {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "") ||
      "https://opttius.com";
    setWebhookUrl(`${baseUrl}/api/webhooks/mercadopago`);
  }, []);

  // Initialize credential values from configs
  useEffect(() => {
    const initialValues: Record<string, string> = {};
    ["access_token", "public_key", "webhook_secret"].forEach((key) => {
      const config = configs.find(
        (c) => (c as Record<string, unknown>).config_key === `mercadopago_${key}`,
      );
      const value = (config as Record<string, unknown> | undefined)?.config_value as string | undefined;
      if (value) initialValues[key] = value;
    });
    ["test_access_token", "test_public_key", "test_webhook_secret"].forEach((key) => {
      const config = configs.find(
        (c) => (c as Record<string, unknown>).config_key === `mercadopago_${key}`,
      );
      const value = (config as Record<string, unknown> | undefined)?.config_value as string | undefined;
      if (value) initialValues[key] = value;
    });
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
        toast.error(data.message || data.error || "Error al conectar con MercadoPago");
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionStatus({ status: "error", message: "Error al probar la conexión" });
      toast.error("Error al probar la conexión");
    } finally {
      setTesting(false);
    }
  };

  const getConfigValue = (key: string): unknown => {
    const config = configs.find(
      (c) => (c as Record<string, unknown>).config_key === `mercadopago_${key}`,
    );
    return (config as Record<string, unknown> | undefined)?.config_value;
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

  const handleCredentialChange = (key: string, value: string) => {
    setCredentialValues((prev) => ({ ...prev, [key]: value }));

    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    debounceTimers.current[key] = setTimeout(() => {
      handleUpdate(key, value);
      delete debounceTimers.current[key];
    }, 800);
  };

  const handleCredentialBlur = (key: string) => {
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
      delete debounceTimers.current[key];
    }
    const currentValue = credentialValues[key];
    if (currentValue !== undefined) {
      handleUpdate(key, currentValue);
    }
  };

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-azul-profundo">Configuración de Pagos</h2>
        <p className="text-tierra-media">Gestiona la configuración de pagos con MercadoPago</p>
      </div>

      <PaymentGatewayConfig
        configs={configs}
        loading={loading}
        testing={testing}
        showTokens={showTokens}
        credentialValues={credentialValues}
        connectionStatus={connectionStatus}
        getConfigValue={getConfigValue}
        handleUpdate={handleUpdate}
        handleToggleVisibility={handleToggleVisibility}
        handleCredentialChange={handleCredentialChange}
        handleCredentialBlur={handleCredentialBlur}
        handleTestConnection={handleTestConnection}
      />

      <PaymentMethodToggle
        loading={loading}
        getConfigValue={getConfigValue}
        handleUpdate={handleUpdate}
      />

      <PaymentTestSection
        webhookUrl={webhookUrl}
        handleCopyWebhookUrl={handleCopyWebhookUrl}
      />
    </div>
  );
}

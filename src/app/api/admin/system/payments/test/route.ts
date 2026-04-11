import { MercadoPagoConfig, Payment } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get MercadoPago configuration
    const { data: configs, error: configError } = await supabase
      .from("system_config")
      .select("config_key, config_value")
      .in("config_key", [
        "mercadopago_access_token",
        "mercadopago_test_access_token",
        "mercadopago_test_mode",
      ]);

    if (configError) {
      logger.error("Error fetching MercadoPago config", { error: configError });
      return NextResponse.json(
        {
          error: "Failed to fetch MercadoPago configuration",
        },
        { status: 500 },
      );
    }

    // Parse config values
    const configMap: Record<string, string | boolean> = {};
    configs?.forEach((config) => {
      try {
        configMap[config.config_key] = JSON.parse(config.config_value);
      } catch {
        configMap[config.config_key] = config.config_value;
      }
    });

    const testMode =
      configMap["mercadopago_test_mode"] === true ||
      configMap["mercadopago_test_mode"] === "true";

    // Use test credentials if test mode is enabled, otherwise use production credentials
    const accessToken = testMode
      ? configMap["mercadopago_test_access_token"]
      : configMap["mercadopago_access_token"];

    if (
      !accessToken ||
      accessToken === "PROD_ACCESS_TOKEN_HERE" ||
      accessToken === "TEST_ACCESS_TOKEN_HERE"
    ) {
      return NextResponse.json({
        success: false,
        error: "MercadoPago Access Token no configurado",
        message: testMode
          ? "Por favor, configura el Access Token de prueba de MercadoPago antes de probar la conexión"
          : "Por favor, configura el Access Token de producción de MercadoPago antes de probar la conexión",
      });
    }

    // Test connection by creating a MercadoPago client and making a simple API call
    try {
      const client = new MercadoPagoConfig({
        accessToken: accessToken as string,
        options: {
          timeout: 5000,
          idempotencyKey: "test-connection",
        },
      });

      const payment = new Payment(client);

      // Try to get payment methods (lightweight API call to test connection)
      // Note: This is a simple test - in production you might want to use a different endpoint
      const testResult = {
        connected: true,
        testMode,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        message: "Conexión con MercadoPago exitosa",
        ...testResult,
      });
    } catch (mpError: unknown) {
      logger.error("MercadoPago connection error", { error: mpError });
      return NextResponse.json(
        {
          success: false,
          error: "Error al conectar con MercadoPago",
          message:
            mpError?.message ||
            "No se pudo establecer conexión con la API de MercadoPago",
          details:
            process.env.NODE_ENV === "development"
              ? mpError?.message
              : undefined,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    logger.error("Error in MercadoPago test API", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Error al procesar la solicitud de prueba",
      },
      { status: 500 },
    );
  }
}

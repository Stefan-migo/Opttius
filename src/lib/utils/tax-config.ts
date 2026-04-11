/**
 * Tax configuration utilities
 * Handles fetching and managing tax percentage from system configuration
 */

/**
 * Get tax percentage from system config
 * This function can be used both on server and client side
 * @param fallback - Fallback value if tax_percentage is not found (default: 19.0 for Chile)
 * @returns Tax percentage as a number
 */
export async function getTaxPercentage(
  fallback: number = 19.0,
): Promise<number> {
  try {
    // Try to fetch from system_config API
    const response = await fetch("/api/admin/system/config?category=ecommerce");

    if (!response.ok) {
      console.warn(
        "Failed to fetch tax percentage from system_config, using fallback:",
        fallback,
      );
      return fallback;
    }

    const data = await response.json();
    const configs = data.configs || [];

    // Look for tax_percentage first, then tax_rate as fallback
    const taxConfig =
      configs.find((c: unknown) => c.config_key === "tax_percentage") ||
      configs.find((c: unknown) => c.config_key === "tax_rate");

    if (taxConfig) {
      const taxValue =
        typeof taxConfig.config_value === "string"
          ? parseFloat(taxConfig.config_value)
          : taxConfig.config_value;

      if (!isNaN(taxValue) && taxValue > 0) {
        return taxValue;
      }
    }

    // If not found or invalid, use fallback
    return fallback;
  } catch (error) {
    console.error("Error fetching tax percentage:", error);
    return fallback;
  }
}

/**
 * Get tax percentage from system config (server-side)
 * @param supabase - Supabase client instance
 * @param fallback - Fallback value if tax_percentage is not found (default: 19.0)
 * @returns Tax percentage as a number
 */
export async function getTaxPercentageServer(
  supabase: unknown,
  fallback: number = 19.0,
): Promise<number> {
  try {
    const { data: taxConfig, error } = await supabase
      .from("system_config")
      .select("config_value, value_type")
      .or("config_key.eq.tax_percentage,config_key.eq.tax_rate")
      .maybeSingle();

    if (error || !taxConfig) {
      console.warn(
        "Tax percentage not found in system_config, using fallback:",
        fallback,
      );
      return fallback;
    }

    let taxValue: number;
    if (typeof taxConfig.config_value === "string") {
      try {
        taxValue = parseFloat(JSON.parse(taxConfig.config_value));
      } catch {
        taxValue = parseFloat(taxConfig.config_value);
      }
    } else {
      taxValue =
        typeof taxConfig.config_value === "number"
          ? taxConfig.config_value
          : parseFloat(String(taxConfig.config_value));
    }

    if (!isNaN(taxValue) && taxValue > 0) {
      return taxValue;
    }

    return fallback;
  } catch (error) {
    console.error("Error fetching tax percentage from server:", error);
    return fallback;
  }
}

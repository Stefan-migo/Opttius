import { useCallback, useState } from "react";

interface CalculateLensPriceParams {
  lens_family_id: string;
  sphere: number;
  cylinder?: number;
  addition?: number;
  sourcing_type?: "stock" | "surfaced";
}

interface LensPriceCalculation {
  price: number;
  sourcing_type: string;
  cost: number;
}

export function useLensPriceCalculation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateLensPrice = useCallback(
    async (
      params: CalculateLensPriceParams,
    ): Promise<LensPriceCalculation | null> => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          lens_family_id: params.lens_family_id,
          sphere: params.sphere.toString(),
          cylinder: (params.cylinder ?? 0).toString(), // Always send cylinder, default to 0
        });
        if (params.addition !== undefined) {
          queryParams.append("addition", params.addition.toString());
        }
        if (params.sourcing_type) {
          queryParams.append("sourcing_type", params.sourcing_type);
        }

        const response = await fetch(
          `/api/admin/lens-matrices/calculate?${queryParams.toString()}`,
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al calcular precio");
        }

        const data = await response.json();
        return data.data?.calculation || data.calculation;
      } catch (err: unknown) {
        const errorMessage =
          err.message || "Error al calcular el precio del lente";
        setError(errorMessage);
        // Don't show toast for missing matrices (user can manually enter price)
        if (!err.message?.includes("No se encontró")) {
          console.warn("Lens price calculation error:", errorMessage);
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    calculateLensPrice,
    loading,
    error,
  };
}

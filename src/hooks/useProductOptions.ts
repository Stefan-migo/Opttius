import { useEffect, useState } from "react";

interface OptionValue {
  id: string;
  value: string;
  label: string;
  display_order: number;
  is_active: boolean;
  is_default: boolean;
}

interface OptionField {
  id: string;
  field_key: string;
  field_label: string;
  field_category: string;
  is_array: boolean;
  is_active: boolean;
  display_order: number;
  values?: OptionValue[];
}

interface UseProductOptionsReturn {
  options: Record<string, OptionValue[]>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useProductOptions(): UseProductOptionsReturn {
  const [options, setOptions] = useState<Record<string, OptionValue[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        "/api/admin/product-options?form_type=product",
      );
      const data = await response.json();

      if (response.ok) {
        const optionsMap: Record<string, OptionValue[]> = {};
        (data.fields || []).forEach((field: OptionField) => {
          if (field.values && field.values.length > 0) {
            optionsMap[field.field_key] = field.values;
          }
        });
        setOptions(optionsMap);
      } else {
        setError(data.error || "Error al cargar opciones");
      }
    } catch (err) {
      console.error("Error fetching product options:", err);
      setError("Error al cargar opciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  return {
    options,
    loading,
    error,
    refresh: fetchOptions,
  };
}

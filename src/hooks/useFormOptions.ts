import { useCallback, useEffect, useState } from "react";

export interface FormOptionValue {
  id: string;
  value: string;
  label: string;
  display_order: number;
  is_active: boolean;
  is_default: boolean;
}

export interface FormOptionField {
  id: string;
  field_key: string;
  field_label: string;
  field_category: string;
  form_type?: string;
  is_array: boolean;
  is_active: boolean;
  display_order: number;
  values?: FormOptionValue[];
}

export type FormType =
  | "product"
  | "customer"
  | "prescription"
  | "quote"
  | "appointment"
  | "pos"
  | "global";

export interface UseFormOptionsReturn {
  fields: FormOptionField[];
  options: Record<string, FormOptionValue[]>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook to fetch form option fields and values by form type.
 * Use for customer forms (gender, preferred_contact_method), appointments (appointment_type),
 * quotes/POS (lens_type, lens_material - use 'product' for shared optical options), etc.
 */
export function useFormOptions(formType: FormType): UseFormOptionsReturn {
  const [fields, setFields] = useState<FormOptionField[]>([]);
  const [options, setOptions] = useState<Record<string, FormOptionValue[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ form_type: formType });
      const response = await fetch(
        `/api/admin/product-options?${params.toString()}`,
      );
      const data = await response.json();

      if (response.ok) {
        const fieldsList = data.fields || [];
        setFields(fieldsList);

        const optionsMap: Record<string, FormOptionValue[]> = {};
        fieldsList.forEach((field: FormOptionField) => {
          if (field.values && field.values.length > 0) {
            optionsMap[field.field_key] = field.values;
          }
        });
        setOptions(optionsMap);
      } else {
        setError(data.error || "Error al cargar opciones");
      }
    } catch (err) {
      console.error("Error fetching form options:", err);
      setError("Error al cargar opciones");
    } finally {
      setLoading(false);
    }
  }, [formType]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return {
    fields,
    options,
    loading,
    error,
    refresh: fetchOptions,
  };
}

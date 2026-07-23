"use client";

import FormField from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";

interface Props {
  values: {
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  errors: Record<string, { message?: string }>;
  onValueChange: (field: string, value: string) => void;
  size?: "normal" | "large";
}

export function CustomerAddressFields({
  values,
  errors,
  onValueChange,
  size = "normal",
}: Props) {
  const inputClass = size === "large" ? "h-12 sm:h-14" : "";
  return (
    <div className="space-y-4">
      <FormField error={errors.address_line_1?.message} label="Dirección">
        <Input
          aria-invalid={!!errors.address_line_1}
          className={inputClass}
          id="address_line_1"
          placeholder="Calle y número"
          value={values.address_line_1}
          onChange={(e) => onValueChange("address_line_1", e.target.value)}
        />
      </FormField>
      <FormField
        description="Opcional - Departamento, piso, etc."
        error={errors.address_line_2?.message}
        label="Dirección 2"
      >
        <Input
          aria-invalid={!!errors.address_line_2}
          className={inputClass}
          id="address_line_2"
          placeholder="Departamento, piso, etc."
          value={values.address_line_2}
          onChange={(e) => onValueChange("address_line_2", e.target.value)}
        />
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField error={errors.city?.message} label="Ciudad">
          <Input
            aria-invalid={!!errors.city}
            className={inputClass}
            id="city"
            placeholder="Ciudad"
            value={values.city}
            onChange={(e) => onValueChange("city", e.target.value)}
          />
        </FormField>
        <FormField error={errors.state?.message} label="Provincia">
          <Input
            aria-invalid={!!errors.state}
            className={inputClass}
            id="state"
            placeholder="Provincia"
            value={values.state}
            onChange={(e) => onValueChange("state", e.target.value)}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField error={errors.postal_code?.message} label="Código Postal">
          <Input
            aria-invalid={!!errors.postal_code}
            className={inputClass}
            id="postal_code"
            placeholder="1234"
            value={values.postal_code}
            onChange={(e) => onValueChange("postal_code", e.target.value)}
          />
        </FormField>
        <FormField error={errors.country?.message} label="País">
          <Input
            aria-invalid={!!errors.country}
            className={inputClass}
            id="country"
            placeholder="País"
            value={values.country}
            onChange={(e) => onValueChange("country", e.target.value)}
          />
        </FormField>
      </div>
    </div>
  );
}

"use client";

import FormField from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";

interface Props {
  values: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    rut: string;
  };
  errors: Record<string, { message?: string }>;
  onValueChange: (field: string, value: string) => void;
  onRUTChange?: (value: string) => void;
  onRUTBlur?: (value: string) => void;
  size?: "normal" | "large";
}

export function CustomerPersonalInfoFields({
  values,
  errors,
  onValueChange,
  onRUTChange,
  onRUTBlur,
  size = "normal",
}: Props) {
  const inputClass = size === "large" ? "h-12 sm:h-14" : "";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField required error={errors.first_name?.message} label="Nombre">
          <Input
            aria-invalid={!!errors.first_name}
            className={inputClass}
            id="first_name"
            placeholder="Nombre"
            value={values.first_name}
            onChange={(e) => onValueChange("first_name", e.target.value)}
          />
        </FormField>
        <FormField required error={errors.last_name?.message} label="Apellido">
          <Input
            aria-invalid={!!errors.last_name}
            className={inputClass}
            id="last_name"
            placeholder="Apellido"
            value={values.last_name}
            onChange={(e) => onValueChange("last_name", e.target.value)}
          />
        </FormField>
      </div>
      <FormField
        description="Opcional"
        error={errors.email?.message}
        label="Email"
      >
        <Input
          aria-invalid={!!errors.email}
          className={inputClass}
          id="email"
          placeholder="email@ejemplo.com"
          type="email"
          value={values.email}
          onChange={(e) => onValueChange("email", e.target.value)}
        />
      </FormField>
      <FormField
        description="Opcional"
        error={errors.phone?.message}
        label="Teléfono"
      >
        <Input
          aria-invalid={!!errors.phone}
          className={inputClass}
          id="phone"
          placeholder="+54 9 11 1234-5678"
          value={values.phone}
          onChange={(e) => onValueChange("phone", e.target.value)}
        />
      </FormField>
      <FormField
        description="Rol Único Tributario (opcional)"
        error={errors.rut?.message}
        label="RUT"
      >
        <Input
          aria-invalid={!!errors.rut}
          className={inputClass}
          id="rut"
          placeholder="12.345.678-9 o 123456789"
          value={values.rut}
          onBlur={(e) => onRUTBlur?.(e.target.value)}
          onChange={(e) => onRUTChange?.(e.target.value)}
        />
      </FormField>
    </div>
  );
}

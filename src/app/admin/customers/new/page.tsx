"use client";

import { ArrowLeft, MapPin, Save, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FormField, { FormFieldActionsExtended } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBranch } from "@/hooks/useBranch";
import { useForm } from "@/hooks/useForm";
import { customerService } from "@/lib/api/services/customerService";
import { handleApiError } from "@/lib/services/errorService";
import {
  error as notifyError,
  success,
} from "@/lib/services/notificationService";
import { formatRUT } from "@/lib/utils/rut";
import { customerSchema } from "@/lib/validation/formValidation";

export default function NewCustomerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fieldOperationIdFromUrl = searchParams.get("field_operation_id");
  const { currentBranchId, isSuperAdmin } = useBranch();
  const [operativoBranchId, setOperativoBranchId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!fieldOperationIdFromUrl) {
      setOperativoBranchId(null);
      return;
    }
    fetch(`/api/admin/field-operations/${fieldOperationIdFromUrl}`)
      .then((r) => r.json())
      .then((j) => {
        const fo = j?.data?.fieldOperation;
        setOperativoBranchId(fo?.branch_id ?? null);
      })
      .catch(() => setOperativoBranchId(null));
  }, [fieldOperationIdFromUrl]);

  const form = useForm({
    validationSchema: customerSchema,
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      rut: "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "Chile",
      notes: "",
    },
    onSubmit: async (data) => {
      // API expects first_name, last_name, address_line_* (CreateCustomerData)
      const requestBody = {
        first_name: data.first_name?.trim() || null,
        last_name: data.last_name?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        rut: data.rut?.trim() || null,
        address_line_1: data.address_line_1?.trim() || null,
        address_line_2: data.address_line_2?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        postal_code: data.postal_code?.trim() || null,
        country: data.country?.trim() || "Chile",
        notes: data.notes?.trim() || null,
        branch_id: operativoBranchId || currentBranchId || undefined,
        field_operation_id: fieldOperationIdFromUrl || undefined,
      };

      const customer = await customerService.createCustomer(requestBody);

      if (!customer || !customer.id) {
        throw new Error(
          "La respuesta del servidor no contiene información del cliente creado",
        );
      }

      return { customer };
    },
    onSuccess: () => {
      success("Cliente creado exitosamente");
      router.push(
        fieldOperationIdFromUrl
          ? `/admin/customers?field_operation_id=${fieldOperationIdFromUrl}`
          : "/admin/customers",
      );
    },
    onError: (err) => {
      const standardError = handleApiError(err, "NewCustomerPage");
      notifyError(standardError.userMessage);
    },
  });

  const handleRUTChange = (value: string) => {
    const formatted = formatRUT(value);
    form.setValue("rut", formatted);
  };

  const handleRUTBlur = (value: string) => {
    const formatted = formatRUT(value);
    if (formatted !== value) {
      form.setValue("rut", formatted);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            className="min-h-[44px] shrink-0"
            size="sm"
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
            Nuevo Cliente
          </h1>
        </div>
        <p className="text-[9px] sm:text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-[0.3em]">
          Registro de Archivo en la Base de Datos
        </p>
        <FormFieldActionsExtended
          isSubmitting={form.isSubmitting}
          submitIcon={<Save className="h-4 w-4 mr-2" />}
          submitLabel="Crear Cliente"
          submittingLabel="Creando..."
          onCancel={() => router.back()}
          onSubmit={form.handleSubmit}
        />
      </div>

      {/* Form Error */}
      {form.formError && (
        <Card className="border border-red-300 bg-admin-bg-tertiary">
          <CardContent className="p-4">
            <p className="text-red-700">{form.formError}</p>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form className="space-y-6" onSubmit={form.handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Personal Information */}
          <Card className="border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-premium-sm rounded-xl overflow-hidden">
            <CardHeader className="border-b border-admin-border-primary/10">
              <CardTitle className="flex items-center text-admin-text-primary">
                <User className="h-5 w-5 mr-2" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  required
                  error={form.errors.first_name?.message}
                  label="Nombre"
                  labelClassName="text-xs sm:text-sm"
                >
                  <Input
                    aria-invalid={!!form.errors.first_name}
                    className="h-12 sm:h-14"
                    id="first_name"
                    placeholder="Nombre"
                    value={form.values.first_name}
                    onChange={(e) =>
                      form.setValue("first_name", e.target.value)
                    }
                  />
                </FormField>

                <FormField
                  required
                  error={form.errors.last_name?.message}
                  label="Apellido"
                  labelClassName="text-xs sm:text-sm"
                >
                  <Input
                    aria-invalid={!!form.errors.last_name}
                    className="h-12 sm:h-14"
                    id="last_name"
                    placeholder="Apellido"
                    value={form.values.last_name}
                    onChange={(e) => form.setValue("last_name", e.target.value)}
                  />
                </FormField>
              </div>

              <FormField
                description="Opcional"
                error={form.errors.email?.message}
                label="Email"
                labelClassName="text-xs sm:text-sm"
              >
                <Input
                  aria-invalid={!!form.errors.email}
                  className="h-12 sm:h-14"
                  id="email"
                  placeholder="email@ejemplo.com"
                  type="email"
                  value={form.values.email}
                  onChange={(e) => form.setValue("email", e.target.value)}
                />
              </FormField>

              <FormField
                description="Opcional"
                error={form.errors.phone?.message}
                label="Teléfono"
                labelClassName="text-xs sm:text-sm"
              >
                <Input
                  aria-invalid={!!form.errors.phone}
                  className="h-12 sm:h-14"
                  id="phone"
                  placeholder="+54 9 11 1234-5678"
                  value={form.values.phone}
                  onChange={(e) => form.setValue("phone", e.target.value)}
                />
              </FormField>

              <FormField
                description="Rol Único Tributario (opcional)"
                error={form.errors.rut?.message}
                label="RUT"
                labelClassName="text-xs sm:text-sm"
              >
                <Input
                  aria-invalid={!!form.errors.rut}
                  className="h-12 sm:h-14"
                  id="rut"
                  placeholder="12.345.678-9 o 123456789"
                  value={form.values.rut}
                  onBlur={(e) => handleRUTBlur(e.target.value)}
                  onChange={(e) => handleRUTChange(e.target.value)}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-premium-sm rounded-xl overflow-hidden">
            <CardHeader className="border-b border-admin-border-primary/10">
              <CardTitle className="flex items-center text-admin-text-primary">
                <MapPin className="h-5 w-5 mr-2" />
                Dirección
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                error={form.errors.address_line_1?.message}
                label="Dirección"
                labelClassName="text-xs sm:text-sm"
              >
                <Input
                  aria-invalid={!!form.errors.address_line_1}
                  className="h-12 sm:h-14"
                  id="address_line_1"
                  placeholder="Calle y número"
                  value={form.values.address_line_1}
                  onChange={(e) =>
                    form.setValue("address_line_1", e.target.value)
                  }
                />
              </FormField>

              <FormField
                description="Opcional - Departamento, piso, etc."
                error={form.errors.address_line_2?.message}
                label="Dirección 2"
                labelClassName="text-xs sm:text-sm"
              >
                <Input
                  aria-invalid={!!form.errors.address_line_2}
                  className="h-12 sm:h-14"
                  id="address_line_2"
                  placeholder="Departamento, piso, etc."
                  value={form.values.address_line_2}
                  onChange={(e) =>
                    form.setValue("address_line_2", e.target.value)
                  }
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  error={form.errors.city?.message}
                  label="Ciudad"
                  labelClassName="text-xs sm:text-sm"
                >
                  <Input
                    aria-invalid={!!form.errors.city}
                    className="h-12 sm:h-14"
                    id="city"
                    placeholder="Ciudad"
                    value={form.values.city}
                    onChange={(e) => form.setValue("city", e.target.value)}
                  />
                </FormField>

                <FormField
                  error={form.errors.state?.message}
                  label="Provincia"
                  labelClassName="text-xs sm:text-sm"
                >
                  <Input
                    aria-invalid={!!form.errors.state}
                    className="h-12 sm:h-14"
                    id="state"
                    placeholder="Provincia"
                    value={form.values.state}
                    onChange={(e) => form.setValue("state", e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  error={form.errors.postal_code?.message}
                  label="Código Postal"
                  labelClassName="text-xs sm:text-sm"
                >
                  <Input
                    aria-invalid={!!form.errors.postal_code}
                    className="h-12 sm:h-14"
                    id="postal_code"
                    placeholder="1234"
                    value={form.values.postal_code}
                    onChange={(e) =>
                      form.setValue("postal_code", e.target.value)
                    }
                  />
                </FormField>

                <FormField
                  error={form.errors.country?.message}
                  label="País"
                  labelClassName="text-xs sm:text-sm"
                >
                  <Input
                    aria-invalid={!!form.errors.country}
                    className="h-12 sm:h-14"
                    id="country"
                    placeholder="País"
                    value={form.values.country}
                    onChange={(e) => form.setValue("country", e.target.value)}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card className="border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-premium-sm rounded-xl overflow-hidden lg:col-span-2">
            <CardHeader className="border-b border-admin-border-primary/10">
              <CardTitle className="text-admin-text-primary">
                Notas Adicionales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                description="Notas sobre el cliente"
                error={form.errors.notes?.message}
                label="Notas"
                labelClassName="text-xs sm:text-sm"
              >
                <Textarea
                  aria-invalid={!!form.errors.notes}
                  className="min-h-[100px]"
                  id="notes"
                  placeholder="Notas sobre el cliente..."
                  value={form.values.notes}
                  onChange={(e) => form.setValue("notes", e.target.value)}
                />
              </FormField>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

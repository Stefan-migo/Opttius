"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, User, MapPin } from "lucide-react";
import { useForm } from "@/hooks/useForm";
import FormField, { FormFieldActionsExtended } from "@/components/ui/FormField";
import { customerSchema } from "@/lib/validation/formValidation";
import {
  success,
  error as notifyError,
} from "@/lib/services/notificationService";
import { handleApiError } from "@/lib/services/errorService";
import { useBranch } from "@/hooks/useBranch";
import { customerService } from "@/lib/api/services/customerService";
import { formatRUT } from "@/lib/utils/rut";

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
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="min-h-[44px] shrink-0"
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
          onCancel={() => router.back()}
          onSubmit={form.handleSubmit}
          isSubmitting={form.isSubmitting}
          submitLabel="Crear Cliente"
          submittingLabel="Creando..."
          submitIcon={<Save className="h-4 w-4 mr-2" />}
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
      <form onSubmit={form.handleSubmit} className="space-y-6">
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
                  label="Nombre"
                  required
                  error={form.errors.first_name?.message}
                  labelClassName="text-xs sm:text-sm"
                >
                  <Input
                    id="first_name"
                    value={form.values.first_name}
                    onChange={(e) =>
                      form.setValue("first_name", e.target.value)
                    }
                    placeholder="Nombre"
                    aria-invalid={!!form.errors.first_name}
                    className="h-12 sm:h-14"
                  />
                </FormField>

                <FormField
                  label="Apellido"
                  required
                  error={form.errors.last_name?.message}
                  labelClassName="text-xs sm:text-sm"
                >
                  <Input
                    id="last_name"
                    value={form.values.last_name}
                    onChange={(e) => form.setValue("last_name", e.target.value)}
                    placeholder="Apellido"
                    aria-invalid={!!form.errors.last_name}
                    className="h-12 sm:h-14"
                  />
                </FormField>
              </div>

              <FormField
                label="Email"
                error={form.errors.email?.message}
                description="Opcional"
                labelClassName="text-xs sm:text-sm"
              >
                <Input
                  id="email"
                  type="email"
                  value={form.values.email}
                  onChange={(e) => form.setValue("email", e.target.value)}
                  placeholder="email@ejemplo.com"
                  aria-invalid={!!form.errors.email}
                  className="h-12 sm:h-14"
                />
              </FormField>

              <FormField
                label="Teléfono"
                error={form.errors.phone?.message}
                description="Opcional"
                labelClassName="text-xs sm:text-sm"
              >
                <Input
                  id="phone"
                  value={form.values.phone}
                  onChange={(e) => form.setValue("phone", e.target.value)}
                  placeholder="+54 9 11 1234-5678"
                  aria-invalid={!!form.errors.phone}
                  className="h-12 sm:h-14"
                />
              </FormField>

              <FormField
                label="RUT"
                error={form.errors.rut?.message}
                description="Rol Único Tributario (opcional)"
                labelClassName="text-xs sm:text-sm"
              >
                <Input
                  id="rut"
                  value={form.values.rut}
                  onChange={(e) => handleRUTChange(e.target.value)}
                  onBlur={(e) => handleRUTBlur(e.target.value)}
                  placeholder="12.345.678-9 o 123456789"
                  aria-invalid={!!form.errors.rut}
                  className="h-12 sm:h-14"
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
                label="Dirección"
                error={form.errors.address_line_1?.message}
                labelClassName="text-xs sm:text-sm"
              >
                <Input
                  id="address_line_1"
                  value={form.values.address_line_1}
                  onChange={(e) =>
                    form.setValue("address_line_1", e.target.value)
                  }
                  placeholder="Calle y número"
                  aria-invalid={!!form.errors.address_line_1}
                  className="h-12 sm:h-14"
                />
              </FormField>

              <FormField
                label="Dirección 2"
                error={form.errors.address_line_2?.message}
                description="Opcional - Departamento, piso, etc."
                labelClassName="text-xs sm:text-sm"
              >
                <Input
                  id="address_line_2"
                  value={form.values.address_line_2}
                  onChange={(e) =>
                    form.setValue("address_line_2", e.target.value)
                  }
                  placeholder="Departamento, piso, etc."
                  aria-invalid={!!form.errors.address_line_2}
                  className="h-12 sm:h-14"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Ciudad"
                  error={form.errors.city?.message}
                  labelClassName="text-xs sm:text-sm"
                >
                  <Input
                    id="city"
                    value={form.values.city}
                    onChange={(e) => form.setValue("city", e.target.value)}
                    placeholder="Ciudad"
                    aria-invalid={!!form.errors.city}
                    className="h-12 sm:h-14"
                  />
                </FormField>

                <FormField
                  label="Provincia"
                  error={form.errors.state?.message}
                  labelClassName="text-xs sm:text-sm"
                >
                  <Input
                    id="state"
                    value={form.values.state}
                    onChange={(e) => form.setValue("state", e.target.value)}
                    placeholder="Provincia"
                    aria-invalid={!!form.errors.state}
                    className="h-12 sm:h-14"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Código Postal"
                  error={form.errors.postal_code?.message}
                  labelClassName="text-xs sm:text-sm"
                >
                  <Input
                    id="postal_code"
                    value={form.values.postal_code}
                    onChange={(e) =>
                      form.setValue("postal_code", e.target.value)
                    }
                    placeholder="1234"
                    aria-invalid={!!form.errors.postal_code}
                    className="h-12 sm:h-14"
                  />
                </FormField>

                <FormField
                  label="País"
                  error={form.errors.country?.message}
                  labelClassName="text-xs sm:text-sm"
                >
                  <Input
                    id="country"
                    value={form.values.country}
                    onChange={(e) => form.setValue("country", e.target.value)}
                    placeholder="País"
                    aria-invalid={!!form.errors.country}
                    className="h-12 sm:h-14"
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
                label="Notas"
                error={form.errors.notes?.message}
                description="Notas sobre el cliente"
                labelClassName="text-xs sm:text-sm"
              >
                <Textarea
                  id="notes"
                  value={form.values.notes}
                  onChange={(e) => form.setValue("notes", e.target.value)}
                  placeholder="Notas sobre el cliente..."
                  className="min-h-[100px]"
                  aria-invalid={!!form.errors.notes}
                />
              </FormField>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

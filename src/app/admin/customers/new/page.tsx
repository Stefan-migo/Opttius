"use client";

import { useRouter } from "next/navigation";
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
  const { currentBranchId, isSuperAdmin } = useBranch();

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
      // Create the request body with name field
      const requestBody = {
        name: `${data.first_name} ${data.last_name}`.trim(),
        email: data.email,
        phone: data.phone || undefined,
        rut: data.rut || undefined,
        shipping_info: {
          address_1: data.address_line_1 || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          postal_code: data.postal_code || undefined,
          phone: data.phone || undefined,
        },
        branch_id: currentBranchId || undefined,
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
      router.push("/admin/customers");
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
              Nuevo Cliente
            </h1>
            <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-[0.3em]">
              Registro de Archivo en la Base de Datos
            </p>
          </div>
        </div>

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
        <Card className="border-red-200 bg-admin-bg-tertiary">
          <CardContent className="p-4">
            <p className="text-red-700">{form.formError}</p>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={form.handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card className="border-none bg-admin-bg-secondary shadow-premium-sm rounded-xl overflow-hidden border border-admin-border-primary/30">
            <CardHeader className="border-b border-admin-border-primary/10">
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Nombre"
                  required
                  error={form.errors.first_name?.message}
                >
                  <Input
                    id="first_name"
                    value={form.values.first_name}
                    onChange={(e) =>
                      form.setValue("first_name", e.target.value)
                    }
                    placeholder="Nombre"
                    aria-invalid={!!form.errors.first_name}
                  />
                </FormField>

                <FormField
                  label="Apellido"
                  required
                  error={form.errors.last_name?.message}
                >
                  <Input
                    id="last_name"
                    value={form.values.last_name}
                    onChange={(e) => form.setValue("last_name", e.target.value)}
                    placeholder="Apellido"
                    aria-invalid={!!form.errors.last_name}
                  />
                </FormField>
              </div>

              <FormField
                label="Email"
                error={form.errors.email?.message}
                description="Opcional"
              >
                <Input
                  id="email"
                  type="email"
                  value={form.values.email}
                  onChange={(e) => form.setValue("email", e.target.value)}
                  placeholder="email@ejemplo.com"
                  aria-invalid={!!form.errors.email}
                />
              </FormField>

              <FormField
                label="Teléfono"
                error={form.errors.phone?.message}
                description="Opcional"
              >
                <Input
                  id="phone"
                  value={form.values.phone}
                  onChange={(e) => form.setValue("phone", e.target.value)}
                  placeholder="+54 9 11 1234-5678"
                  aria-invalid={!!form.errors.phone}
                />
              </FormField>

              <FormField
                label="RUT"
                error={form.errors.rut?.message}
                description="Rol Único Tributario (opcional)"
              >
                <Input
                  id="rut"
                  value={form.values.rut}
                  onChange={(e) => handleRUTChange(e.target.value)}
                  onBlur={(e) => handleRUTBlur(e.target.value)}
                  placeholder="12.345.678-9 o 123456789"
                  aria-invalid={!!form.errors.rut}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="border-none bg-admin-bg-secondary shadow-premium-sm rounded-xl overflow-hidden border border-admin-border-primary/30">
            <CardHeader className="border-b border-admin-border-primary/10">
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Dirección
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                label="Dirección"
                error={form.errors.address_line_1?.message}
              >
                <Input
                  id="address_line_1"
                  value={form.values.address_line_1}
                  onChange={(e) =>
                    form.setValue("address_line_1", e.target.value)
                  }
                  placeholder="Calle y número"
                  aria-invalid={!!form.errors.address_line_1}
                />
              </FormField>

              <FormField
                label="Dirección 2"
                error={form.errors.address_line_2?.message}
                description="Opcional - Departamento, piso, etc."
              >
                <Input
                  id="address_line_2"
                  value={form.values.address_line_2}
                  onChange={(e) =>
                    form.setValue("address_line_2", e.target.value)
                  }
                  placeholder="Departamento, piso, etc."
                  aria-invalid={!!form.errors.address_line_2}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Ciudad" error={form.errors.city?.message}>
                  <Input
                    id="city"
                    value={form.values.city}
                    onChange={(e) => form.setValue("city", e.target.value)}
                    placeholder="Ciudad"
                    aria-invalid={!!form.errors.city}
                  />
                </FormField>

                <FormField label="Provincia" error={form.errors.state?.message}>
                  <Input
                    id="state"
                    value={form.values.state}
                    onChange={(e) => form.setValue("state", e.target.value)}
                    placeholder="Provincia"
                    aria-invalid={!!form.errors.state}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Código Postal"
                  error={form.errors.postal_code?.message}
                >
                  <Input
                    id="postal_code"
                    value={form.values.postal_code}
                    onChange={(e) =>
                      form.setValue("postal_code", e.target.value)
                    }
                    placeholder="1234"
                    aria-invalid={!!form.errors.postal_code}
                  />
                </FormField>

                <FormField label="País" error={form.errors.country?.message}>
                  <Input
                    id="country"
                    value={form.values.country}
                    onChange={(e) => form.setValue("country", e.target.value)}
                    placeholder="País"
                    aria-invalid={!!form.errors.country}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card className="border-none bg-admin-bg-secondary shadow-premium-sm rounded-xl overflow-hidden border border-admin-border-primary/30 lg:col-span-2">
            <CardHeader className="border-b border-admin-border-primary/10">
              <CardTitle>Notas Adicionales</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                label="Notas"
                error={form.errors.notes?.message}
                description="Notas sobre el cliente"
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

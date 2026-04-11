"use client";

import { AlertTriangle, ArrowLeft, MapPin, Save, User } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FormField, { FormFieldActionsExtended } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "@/hooks/useForm";
import { customerService } from "@/lib/api/services";
import { handleApiError } from "@/lib/services/errorService";
import {
  error as notifyError,
  success,
} from "@/lib/services/notificationService";
import { completeRUTIfNeeded, formatRUT } from "@/lib/utils/rut";
import { customerEditSchema } from "@/lib/validation/formValidation";

// Extended Customer interface with all form fields
interface FormCustomerData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  rut: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  notes: string;
}

export default function CustomerEditPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const customerId = params.id as string;
  const returnTo = searchParams.get("return_to");

  const [customer, setCustomer] = useState<FormCustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const form = useForm({
    validationSchema: customerEditSchema,
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
      const result = await customerService.updateCustomer(customerId, data);
      return result;
    },
    onSuccess: () => {
      success("Cliente actualizado exitosamente");
      router.push(returnTo || "/admin/customers");
    },
    onError: (err) => {
      const standardError = handleApiError(err, "CustomerEditPage");
      notifyError(standardError.userMessage);
    },
  });

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const customerData = await customerService.getCustomer(customerId);

      // Map customer data to form data
      // Normalizar RUT: completar DV si falta y formatear para consistencia
      const rawRut = (customerData.rut || "").trim();
      const normalizedRut = rawRut
        ? formatRUT(completeRUTIfNeeded(rawRut) || rawRut)
        : "";

      const formData: FormCustomerData = {
        first_name: customerData.first_name || "",
        last_name: customerData.last_name || "",
        email: customerData.email || "",
        phone: customerData.phone || "",
        rut: normalizedRut,
        address_line_1: (customerData as unknown).address_line_1 || "",
        address_line_2: (customerData as unknown).address_line_2 || "",
        city: (customerData as unknown).city || "",
        state: (customerData as unknown).state || "",
        postal_code: (customerData as unknown).postal_code || "",
        country: (customerData as unknown).country || "Chile",
        notes: (customerData as unknown).notes || "",
      };

      setCustomer(formData);
      form.setFieldValues(formData);
      setFetchError(null);
    } catch (err) {
      console.error("Error fetching customer:", err);
      setFetchError(
        err instanceof Error ? err.message : "Unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-admin-text-primary">
              Cargando cliente...
            </h1>
            <p className="text-admin-text-tertiary">
              Obteniendo información del cliente
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card className="animate-pulse" key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (fetchError || !customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button size="sm" variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-admin-text-primary">
              Error
            </h1>
            <p className="text-admin-text-tertiary">
              No se pudo cargar la información del cliente
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-16">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Error al cargar cliente
            </h3>
            <p className="text-admin-text-tertiary mb-4">
              {fetchError || "Cliente no encontrado"}
            </p>
            <Button onClick={fetchCustomer}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerName =
    customer.first_name && customer.last_name
      ? `${customer.first_name} ${customer.last_name}`
      : customer.first_name || customer.last_name || "Sin nombre";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button size="sm" variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-admin-text-primary">
              Editar Cliente
            </h1>
            <p className="text-admin-text-tertiary">{customerName}</p>
          </div>
        </div>

        <FormFieldActionsExtended
          isSubmitting={form.isSubmitting}
          submitIcon={<Save className="h-4 w-4 mr-2" />}
          submitLabel="Guardar Cambios"
          submittingLabel="Guardando..."
          onCancel={() => router.back()}
          onSubmit={form.handleSubmit}
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
      <form className="space-y-6" onSubmit={form.handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  required
                  error={form.errors.first_name?.message}
                  label="Nombre"
                >
                  <Input
                    aria-invalid={!!form.errors.first_name}
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
                >
                  <Input
                    aria-invalid={!!form.errors.last_name}
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
              >
                <Input
                  aria-invalid={!!form.errors.email}
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
              >
                <Input
                  aria-invalid={!!form.errors.phone}
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
              >
                <Input
                  aria-invalid={!!form.errors.rut}
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
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Dirección
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                error={form.errors.address_line_1?.message}
                label="Dirección"
              >
                <Input
                  aria-invalid={!!form.errors.address_line_1}
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
              >
                <Input
                  aria-invalid={!!form.errors.address_line_2}
                  id="address_line_2"
                  placeholder="Departamento, piso, etc."
                  value={form.values.address_line_2}
                  onChange={(e) =>
                    form.setValue("address_line_2", e.target.value)
                  }
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField error={form.errors.city?.message} label="Ciudad">
                  <Input
                    aria-invalid={!!form.errors.city}
                    id="city"
                    placeholder="Ciudad"
                    value={form.values.city}
                    onChange={(e) => form.setValue("city", e.target.value)}
                  />
                </FormField>

                <FormField error={form.errors.state?.message} label="Provincia">
                  <Input
                    aria-invalid={!!form.errors.state}
                    id="state"
                    placeholder="Provincia"
                    value={form.values.state}
                    onChange={(e) => form.setValue("state", e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  error={form.errors.postal_code?.message}
                  label="Código Postal"
                >
                  <Input
                    aria-invalid={!!form.errors.postal_code}
                    id="postal_code"
                    placeholder="1234"
                    value={form.values.postal_code}
                    onChange={(e) =>
                      form.setValue("postal_code", e.target.value)
                    }
                  />
                </FormField>

                <FormField error={form.errors.country?.message} label="País">
                  <Input
                    aria-invalid={!!form.errors.country}
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
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <CardHeader>
              <CardTitle>Notas Adicionales</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                description="Notas sobre el cliente"
                error={form.errors.notes?.message}
                label="Notas"
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

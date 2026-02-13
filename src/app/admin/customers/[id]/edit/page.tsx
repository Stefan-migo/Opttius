"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Save,
  User,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { useForm } from "@/hooks/useForm";
import FormField, { FormFieldActionsExtended } from "@/components/ui/FormField";
import { customerSchema } from "@/lib/validation/formValidation";
import { success, error as notifyError } from "@/lib/services/notificationService";
import { handleApiError } from "@/lib/services/errorService";
import { formatRUT } from "@/lib/utils/rut";
import { customerService } from "@/lib/api/services";

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
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<FormCustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
      const result = await customerService.updateCustomer(customerId, data);
      return result;
    },
    onSuccess: () => {
      success("Cliente actualizado exitosamente");
      router.push("/admin/customers");
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
      const formData: FormCustomerData = {
        first_name: customerData.first_name || "",
        last_name: customerData.last_name || "",
        email: customerData.email || "",
        phone: customerData.phone || "",
        rut: customerData.rut || "",
        address_line_1: (customerData as any).address_line_1 || "",
        address_line_2: (customerData as any).address_line_2 || "",
        city: (customerData as any).city || "",
        state: (customerData as any).state || "",
        postal_code: (customerData as any).postal_code || "",
        country: (customerData as any).country || "Chile",
        notes: (customerData as any).notes || "",
      };
      
      setCustomer(formData);
      form.setFieldValues(formData);
      setFetchError(null);
    } catch (err) {
      console.error("Error fetching customer:", err);
      setFetchError(err instanceof Error ? err.message : "Unknown error occurred");
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
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-azul-profundo">
              Cargando cliente...
            </h1>
            <p className="text-tierra-media">
              Obteniendo información del cliente
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
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
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-azul-profundo">Error</h1>
            <p className="text-tierra-media">
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
            <p className="text-tierra-media mb-4">
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
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-azul-profundo">
              Editar Cliente
            </h1>
            <p className="text-tierra-media">{customerName}</p>
          </div>
        </div>

        <FormFieldActionsExtended
          onCancel={() => router.back()}
          onSubmit={form.handleSubmit}
          isSubmitting={form.isSubmitting}
          submitLabel="Guardar Cambios"
          submittingLabel="Guardando..."
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
                  label="Nombre"
                  required
                  error={form.errors.first_name?.message}
                >
                  <Input
                    id="first_name"
                    value={form.values.first_name}
                    onChange={(e) => form.setValue("first_name", e.target.value)}
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
                required
                error={form.errors.rut?.message}
                description="Rol Único Tributario (requerido)"
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
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <CardHeader>
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
                  onChange={(e) => form.setValue("address_line_1", e.target.value)}
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
                  onChange={(e) => form.setValue("address_line_2", e.target.value)}
                  placeholder="Departamento, piso, etc."
                  aria-invalid={!!form.errors.address_line_2}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Ciudad"
                  error={form.errors.city?.message}
                >
                  <Input
                    id="city"
                    value={form.values.city}
                    onChange={(e) => form.setValue("city", e.target.value)}
                    placeholder="Ciudad"
                    aria-invalid={!!form.errors.city}
                  />
                </FormField>

                <FormField
                  label="Provincia"
                  error={form.errors.state?.message}
                >
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
                    onChange={(e) => form.setValue("postal_code", e.target.value)}
                    placeholder="1234"
                    aria-invalid={!!form.errors.postal_code}
                  />
                </FormField>

                <FormField
                  label="País"
                  error={form.errors.country?.message}
                >
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
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <CardHeader>
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

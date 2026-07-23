"use client";

import { AlertTriangle, ArrowLeft, Save } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormFieldActionsExtended } from "@/components/ui/FormField";
import { useForm } from "@/hooks/useForm";
import { customerService } from "@/lib/api/services";
import { handleApiError } from "@/lib/api/services/errorService";
import {
  error as notifyError,
  success,
} from "@/lib/api/services/notificationService";
import { completeRUTIfNeeded, formatRUT } from "@/lib/utils/rut";
import { customerEditSchema } from "@/lib/validation/formValidation";

import { CustomerEditForm } from "./_components/CustomerEditForm";

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

      {form.formError && (
        <Card className="border-red-200 bg-admin-bg-tertiary">
          <CardContent className="p-4">
            <p className="text-red-700">{form.formError}</p>
          </CardContent>
        </Card>
      )}

      <CustomerEditForm
        values={form.values}
        errors={form.errors}
        setValue={form.setValue}
        handleSubmit={form.handleSubmit}
        handleRUTChange={handleRUTChange}
        handleRUTBlur={handleRUTBlur}
      />
    </div>
  );
}

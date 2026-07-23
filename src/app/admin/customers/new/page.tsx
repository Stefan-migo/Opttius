"use client";

import { ArrowLeft, Save } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormFieldActionsExtended } from "@/components/ui/FormField";
import { useBranch } from "@/hooks/useBranch";
import { useForm } from "@/hooks/useForm";
import { customerService } from "@/lib/api/services/customerService";
import { handleApiError } from "@/lib/api/services/errorService";
import {
  error as notifyError,
  success,
} from "@/lib/api/services/notificationService";
import { formatRUT } from "@/lib/utils/rut";
import { customerSchema } from "@/lib/validation/formValidation";

import { NewCustomerForm } from "./_components/NewCustomerForm";

export default function NewCustomerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fieldOperationIdFromUrl = searchParams.get("field_operation_id");
  const { currentBranchId } = useBranch();
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

      {form.formError && (
        <Card className="border border-red-300 bg-admin-bg-tertiary">
          <CardContent className="p-4">
            <p className="text-red-700">{form.formError}</p>
          </CardContent>
        </Card>
      )}

      <NewCustomerForm
        errors={form.errors}
        handleRUTBlur={handleRUTBlur}
        handleRUTChange={handleRUTChange}
        handleSubmit={form.handleSubmit}
        setValue={form.setValue}
        values={form.values}
      />
    </div>
  );
}

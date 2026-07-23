"use client";

import { MapPin, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FormField from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/textarea";

import { CustomerAddressFields } from "../../../_components/CustomerAddressFields";
import { CustomerPersonalInfoFields } from "../../../_components/CustomerPersonalInfoFields";

interface CustomerEditFormProps {
  values: Record<string, string>;
  errors: Record<string, { message?: string }>;
  setValue: (field: string, value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleRUTChange: (value: string) => void;
  handleRUTBlur: (value: string) => void;
}

export function CustomerEditForm({
  values,
  errors,
  setValue,
  handleSubmit,
  handleRUTChange,
  handleRUTBlur,
}: CustomerEditFormProps) {
  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerPersonalInfoFields
              errors={errors}
              values={values as unknown}
              onRUTBlur={handleRUTBlur}
              onRUTChange={handleRUTChange}
              onValueChange={setValue}
            />
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
          <CardContent>
            <CustomerAddressFields
              errors={errors}
              values={values as unknown}
              onValueChange={setValue}
            />
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
              error={errors.notes?.message}
              label="Notas"
            >
              <Textarea
                aria-invalid={!!errors.notes}
                className="min-h-[100px]"
                id="notes"
                placeholder="Notas sobre el cliente..."
                value={values.notes}
                onChange={(e) => setValue("notes", e.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

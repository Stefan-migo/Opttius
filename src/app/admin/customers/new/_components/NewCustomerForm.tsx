"use client";

import { MapPin, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FormField from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomerAddressFields } from "../../_components/CustomerAddressFields";
import { CustomerPersonalInfoFields } from "../../_components/CustomerPersonalInfoFields";

interface NewCustomerFormProps {
  values: Record<string, string>;
  errors: Record<string, { message?: string }>;
  setValue: (field: string, value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleRUTChange: (value: string) => void;
  handleRUTBlur: (value: string) => void;
}

export function NewCustomerForm({
  values,
  errors,
  setValue,
  handleSubmit,
  handleRUTChange,
  handleRUTBlur,
}: NewCustomerFormProps) {
  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
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
            <CustomerPersonalInfoFields
              errors={errors}
              onRUTBlur={handleRUTBlur}
              onRUTChange={handleRUTChange}
              onValueChange={setValue}
              size="large"
              values={values as any}
            />
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
            <CustomerAddressFields
              errors={errors}
              onValueChange={setValue}
              size="large"
              values={values as any}
            />
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
              error={errors.notes?.message}
              label="Notas"
              labelClassName="text-xs sm:text-sm"
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

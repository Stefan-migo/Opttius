"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, Loader2, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  type AddressForm,
  addressSchema,
} from "@/lib/api/validation/profile-schemas";

interface AddressTabProps {
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
}

export function AddressTab({ isEditing, onEditingChange }: AddressTabProps) {
  const { profile, updateProfile, refetchProfile } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AddressForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zod default() makes input country optional, output required
    resolver: zodResolver(addressSchema) as any,
    defaultValues: {
      addressLine1: profile?.address_line_1 || "",
      addressLine2: profile?.address_line_2 || "",
      city: profile?.city || "",
      state: profile?.state || "",
      postalCode: profile?.postal_code || "",
      country: profile?.country || "Chile",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        addressLine1: profile.address_line_1 || "",
        addressLine2: profile.address_line_2 || "",
        city: profile.city || "",
        state: profile.state || "",
        postalCode: profile.postal_code || "",
        country: profile.country || "Chile",
      });
    }
  }, [profile, form]);

  const handleSubmit = async (data: AddressForm) => {
    try {
      setIsLoading(true);
      await updateProfile({
        address_line_1: data.addressLine1 || null,
        address_line_2: data.addressLine2 || null,
        city: data.city || null,
        state: data.state || null,
        postal_code: data.postalCode || null,
        country: data.country || null,
      });
      await refetchProfile();
      onEditingChange(false);
      toast.success("Dirección actualizada exitosamente");
    } catch (error) {
      console.error("Error updating address:", error);
      toast.error("Error al actualizar la dirección");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onEditingChange(false);
    form.reset({
      addressLine1: profile?.address_line_1 || "",
      addressLine2: profile?.address_line_2 || "",
      city: profile?.city || "",
      state: profile?.state || "",
      postalCode: profile?.postal_code || "",
      country: profile?.country || "Chile",
    });
  };

  return (
    <Card className="border-0 shadow-2xl" variant="elevated">
      <CardHeader
        className="border-b border-slate-100 dark:border-slate-800 p-4 sm:p-6"
        padding="lg"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle
            className="font-cormorant text-lg sm:text-xl"
            size="lg"
            theme="modern"
          >
            Dirección de Envío / Oficina
          </CardTitle>
          {!isEditing && (
            <Button
              className="border-2 font-bold px-4 sm:px-6 min-h-[44px] w-full sm:w-auto"
              variant="outline"
              onClick={() => onEditingChange(true)}
            >
              <Edit3 className="h-4 w-4 mr-2 shrink-0" />
              Editar Dirección
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6" padding="lg">
        <form
          className="space-y-6 sm:space-y-8"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <div className="grid gap-6 sm:gap-8">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
              <div className="space-y-3">
                <Label
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                  htmlFor="addressLine1"
                >
                  Dirección Línea 1
                </Label>
                <Input
                  id="addressLine1"
                  {...form.register("addressLine1")}
                  className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                  disabled={!isEditing || isLoading}
                />
              </div>
              <div className="space-y-3">
                <Label
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                  htmlFor="addressLine2"
                >
                  Dirección Línea 2
                </Label>
                <Input
                  id="addressLine2"
                  {...form.register("addressLine2")}
                  className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                  disabled={!isEditing || isLoading}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
              <div className="space-y-3">
                <Label
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                  htmlFor="city"
                >
                  Ciudad
                </Label>
                <Input
                  id="city"
                  {...form.register("city")}
                  className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                  disabled={!isEditing || isLoading}
                />
              </div>
              <div className="space-y-3">
                <Label
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                  htmlFor="state"
                >
                  Región / Provincia
                </Label>
                <Input
                  id="state"
                  {...form.register("state")}
                  className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                  disabled={!isEditing || isLoading}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
              <div className="space-y-3">
                <Label
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                  htmlFor="postalCode"
                >
                  Código Postal
                </Label>
                <Input
                  id="postalCode"
                  {...form.register("postalCode")}
                  className="h-12 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                  disabled={!isEditing || isLoading}
                />
              </div>
              <div className="space-y-3">
                <Label
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                  htmlFor="country"
                >
                  País
                </Label>
                <Input
                  id="country"
                  {...form.register("country")}
                  className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                  disabled={!isEditing || isLoading}
                />
              </div>
            </div>
          </div>
          {isEditing && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <Button
                shimmer
                className="flex-1 h-12 min-h-[44px] shadow-xl shadow-primary/20"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin shrink-0" />
                ) : (
                  <Save className="h-5 w-5 mr-2 shrink-0" />
                )}
                Guardar Dirección
              </Button>
              <Button
                className="flex-1 h-12 min-h-[44px] border-2"
                disabled={isLoading}
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                <X className="h-5 w-5 mr-2" />
                Cancelar
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

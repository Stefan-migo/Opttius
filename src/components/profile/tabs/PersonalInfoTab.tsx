"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, Loader2, Save, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  type PersonalInfoForm,
  personalInfoSchema,
} from "@/lib/api/validation/profile-schemas";

interface PersonalInfoTabProps {
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
}

export function PersonalInfoTab({
  isEditing,
  onEditingChange,
}: PersonalInfoTabProps) {
  const { profile, updateProfile, refetchProfile } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PersonalInfoForm>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: profile?.first_name || "",
      lastName: profile?.last_name || "",
      phone: profile?.phone || "",
      dateOfBirth: profile?.date_of_birth || "",
      bio: profile?.bio || "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        phone: profile.phone || "",
        dateOfBirth: profile.date_of_birth || "",
        bio: profile.bio || "",
      });
    }
  }, [profile, form]);

  const handleSubmit = async (data: PersonalInfoForm) => {
    try {
      setIsLoading(true);
      await updateProfile({
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone || null,
        date_of_birth: data.dateOfBirth || null,
        bio: data.bio || null,
      });
      await refetchProfile();
      onEditingChange(false);
      toast.success("Información personal actualizada exitosamente");
    } catch (error) {
      console.error("Error updating personal info:", error);
      toast.error("Error al actualizar la información personal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onEditingChange(false);
    form.reset({
      firstName: profile?.first_name || "",
      lastName: profile?.last_name || "",
      phone: profile?.phone || "",
      dateOfBirth: profile?.date_of_birth || "",
      bio: profile?.bio || "",
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
            Datos Personales
          </CardTitle>
          {!isEditing && (
            <Button
              className="border-2 font-bold px-4 sm:px-6 text-[var(--accent-foreground)] bg-[var(--admin-border-primary)] border-[var(--admin-border-secondary)] min-h-[44px] w-full sm:w-auto"
              variant="outline"
              onClick={() => onEditingChange(true)}
            >
              <Edit3 className="h-4 w-4 mr-2 shrink-0" />
              Editar Información
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6" padding="lg">
        <form
          className="space-y-6 sm:space-y-8"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
            <div className="space-y-3">
              <Label
                className="text-sm font-bold text-slate-700 dark:text-slate-300"
                htmlFor="firstName"
              >
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                {...form.register("firstName")}
                className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                disabled={!isEditing || isLoading}
              />
              {form.formState.errors.firstName && (
                <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />{" "}
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-3">
              <Label
                className="text-sm font-bold text-slate-700 dark:text-slate-300"
                htmlFor="lastName"
              >
                Apellido <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                {...form.register("lastName")}
                className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                disabled={!isEditing || isLoading}
              />
              {form.formState.errors.lastName && (
                <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />{" "}
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
            <div className="space-y-3">
              <Label
                className="text-sm font-bold text-slate-700 dark:text-slate-300"
                htmlFor="phone"
              >
                Teléfono
              </Label>
              <Input
                id="phone"
                type="tel"
                {...form.register("phone")}
                className="h-12 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                disabled={!isEditing || isLoading}
              />
            </div>
            <div className="space-y-3">
              <Label
                className="text-sm font-bold text-slate-700 dark:text-slate-300"
                htmlFor="dateOfBirth"
              >
                Fecha de Nacimiento
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...form.register("dateOfBirth")}
                className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                disabled={!isEditing || isLoading}
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label
              className="text-sm font-bold text-slate-700 dark:text-slate-300"
              htmlFor="bio"
            >
              Biografía
            </Label>
            <Textarea
              id="bio"
              {...form.register("bio")}
              className="bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10 rounded-2xl p-4 disabled:opacity-100"
              disabled={!isEditing || isLoading}
              placeholder="Cuéntanos un poco sobre ti, tu rol en la óptica, etc."
              rows={5}
            />
            {form.formState.errors.bio && (
              <p className="text-xs font-medium text-red-500">
                {form.formState.errors.bio.message}
              </p>
            )}
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
                Guardar Cambios
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

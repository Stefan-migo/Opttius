"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ProfilePasswordSection } from "@/components/profile/_components/ProfilePasswordSection";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  type PasswordChangeForm,
  passwordChangeSchema,
} from "@/lib/api/validation/profile-schemas";
import { createClient } from "@/utils/supabase/client";

export function PasswordTab() {
  const { user } = useAuthContext();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
  });

  const handleSubmit = async (data: PasswordChangeForm) => {
    if (!user?.email) return;

    try {
      setIsLoading(true);
      const supabase = createClient();

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword,
      });

      if (reauthError) {
        toast.error(
          "Contraseña actual incorrecta. Verifica e intenta de nuevo.",
        );
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;

      form.reset();
      setIsChangingPassword(false);
      toast.success("Contraseña cambiada exitosamente");
    } catch (error: unknown) {
      console.error("Error changing password:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al cambiar la contraseña",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsChangingPassword(false);
    form.reset({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  return (
    <ProfilePasswordSection
      isChangingPassword={isChangingPassword}
      isLoading={isLoading}
      passwordForm={form}
      onCancel={handleCancel}
      onSubmit={form.handleSubmit(handleSubmit)}
      onToggleChange={() => setIsChangingPassword(true)}
    />
  );
}

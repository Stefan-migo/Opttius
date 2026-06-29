"use client";

import { Eye, EyeOff, Loader2, Lock, Save, X } from "lucide-react";
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfilePasswordSectionProps {
  isChangingPassword: boolean;
  isLoading: boolean;
  passwordForm: UseFormReturn<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>;
  onToggleChange: () => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ProfilePasswordSection({
  isChangingPassword,
  isLoading,
  passwordForm,
  onToggleChange,
  onCancel,
  onSubmit,
}: ProfilePasswordSectionProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <Card
      className="border-0 shadow-2xl overflow-hidden"
      variant="elevated"
    >
      <CardHeader
        className="bg-[var(--admin-bg-tertiary)] p-4 sm:p-6"
        padding="lg"
      >
        <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-bold font-cormorant tracking-tight">
          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg sm:rounded-xl">
            <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          Seguridad de la Cuenta
        </CardTitle>
        <CardDescription className="text-[var(--accent-foreground)] text-sm">
          Administra tu contraseña y métodos de acceso. Se requiere tu
          contraseña actual para realizar el cambio.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6" padding="lg">
        {!isChangingPassword ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 bg-[var(--admin-bg-primary)] rounded-xl sm:rounded-2xl border border-dashed border-[var(--admin-border-secondary)]">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">
                Contraseña
              </h4>
              <p className="text-sm text-slate-500 tracking-widest mt-1">
                ••••••••••••••••
              </p>
            </div>
            <Button
              className="border-2 font-bold min-h-[44px] w-full sm:w-auto"
              variant="outline"
              onClick={onToggleChange}
            >
              Cambiar Contraseña
            </Button>
          </div>
        ) : (
          <form className="space-y-6 max-w-xl" onSubmit={onSubmit}>
            <div className="space-y-3">
              <Label className="text-sm font-bold" htmlFor="currentPassword">
                Contraseña Actual
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  {...passwordForm.register("currentPassword")}
                  className="h-12 pr-12 rounded-2xl border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                  disabled={isLoading}
                />
                <Button
                  className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
              <div className="space-y-3">
                <Label className="text-sm font-bold" htmlFor="newPassword">
                  Nueva Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    {...passwordForm.register("newPassword")}
                    className="h-12 pr-12 rounded-2xl border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                    disabled={isLoading}
                  />
                  <Button
                    className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs font-medium text-red-500">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-bold" htmlFor="confirmPassword">
                  Confirmar Nueva
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    {...passwordForm.register("confirmPassword")}
                    className="h-12 pr-12 rounded-2xl border-slate-200 dark:border-slate-800 transition-all focus:ring-4 focus:ring-primary/10"
                    disabled={isLoading}
                  />
                  <Button
                    className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs font-medium text-red-500">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
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
                Actualizar Contraseña
              </Button>
              <Button
                className="flex-1 h-12 min-h-[44px] border-2"
                disabled={isLoading}
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                <X className="h-5 w-5 mr-2" />
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

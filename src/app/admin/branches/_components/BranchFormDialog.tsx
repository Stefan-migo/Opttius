"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BranchFormData {
  name: string;
  code: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  is_active: boolean;
}

interface BranchFormDialogProps {
  isEditing: boolean;
  formData: BranchFormData;
  isSubmitting: boolean;
  onFormDataChange: (data: BranchFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function BranchFormDialog({
  isEditing,
  formData,
  isSubmitting,
  onFormDataChange,
  onSubmit,
  onCancel,
}: BranchFormDialogProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEditing ? "Editar Sucursal" : "Nueva Sucursal"}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Modifica la información de la sucursal"
            : "Completa los datos para crear una nueva sucursal"}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                className="text-xs sm:text-sm text-epoch-primary/80"
                htmlFor="name"
              >
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                id="name"
                placeholder="Ej: Sucursal Centro"
                value={formData.name}
                onChange={(e) =>
                  onFormDataChange({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                className="text-xs sm:text-sm text-epoch-primary/80"
                htmlFor="code"
              >
                Código <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                disabled={isEditing}
                id="code"
                placeholder="Ej: SUC-001"
                value={formData.code}
                onChange={(e) =>
                  onFormDataChange({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
              />
              {isEditing && (
                <p className="text-xs text-epoch-primary/70">
                  El código no se puede modificar
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label
              className="text-xs sm:text-sm text-epoch-primary/80"
              htmlFor="address_line_1"
            >
              Dirección Línea 1
            </Label>
            <Input
              className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
              id="address_line_1"
              placeholder="Calle y número"
              value={formData.address_line_1}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  address_line_1: e.target.value,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label
              className="text-xs sm:text-sm text-epoch-primary/80"
              htmlFor="address_line_2"
            >
              Dirección Línea 2
            </Label>
            <Input
              className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
              id="address_line_2"
              placeholder="Depto, oficina, etc."
              value={formData.address_line_2}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  address_line_2: e.target.value,
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label
                className="text-xs sm:text-sm text-epoch-primary/80"
                htmlFor="city"
              >
                Ciudad
              </Label>
              <Input
                className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                id="city"
                placeholder="Ciudad"
                value={formData.city}
                onChange={(e) =>
                  onFormDataChange({ ...formData, city: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                className="text-xs sm:text-sm text-epoch-primary/80"
                htmlFor="state"
              >
                Región/Estado
              </Label>
              <Input
                className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                id="state"
                placeholder="Región"
                value={formData.state}
                onChange={(e) =>
                  onFormDataChange({ ...formData, state: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                className="text-xs sm:text-sm text-epoch-primary/80"
                htmlFor="postal_code"
              >
                Código Postal
              </Label>
              <Input
                className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                id="postal_code"
                placeholder="Código postal"
                value={formData.postal_code}
                onChange={(e) =>
                  onFormDataChange({
                    ...formData,
                    postal_code: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              className="text-xs sm:text-sm text-epoch-primary/80"
              htmlFor="country"
            >
              País
            </Label>
            <Input
              className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
              id="country"
              placeholder="País"
              value={formData.country}
              onChange={(e) =>
                onFormDataChange({ ...formData, country: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                className="text-xs sm:text-sm text-epoch-primary/80"
                htmlFor="phone"
              >
                Teléfono
              </Label>
              <Input
                className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                id="phone"
                placeholder="+56 9 1234 5678"
                value={formData.phone}
                onChange={(e) =>
                  onFormDataChange({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                className="text-xs sm:text-sm text-epoch-primary/80"
                htmlFor="email"
              >
                Email
              </Label>
              <Input
                className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                id="email"
                placeholder="sucursal@ejemplo.com"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  onFormDataChange({ ...formData, email: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              className="text-xs sm:text-sm text-epoch-primary/80"
              htmlFor="is_active"
            >
              Estado
            </Label>
            <Select
              value={formData.is_active ? "active" : "inactive"}
              onValueChange={(value) =>
                onFormDataChange({
                  ...formData,
                  is_active: value === "active",
                })
              }
            >
              <SelectTrigger className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="inactive">Inactiva</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            className="rounded-xl border-epoch-primary/20 w-full sm:w-auto min-h-[44px]"
            disabled={isSubmitting}
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white w-full sm:w-auto min-h-[44px]"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

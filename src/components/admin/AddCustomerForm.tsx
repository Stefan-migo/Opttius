"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";
import { customerService } from "@/lib/api/services/customerService";
import { formatRUT, formatRUTAsYouType } from "@/lib/utils/rut";
import { toast } from "sonner";

interface AddCustomerFormProps {
  fieldOperationId: string;
  branchId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddCustomerForm({
  fieldOperationId,
  branchId,
  onSuccess,
  onCancel,
}: AddCustomerFormProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    rut: "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const err: Record<string, string> = {};
    if (!formData.first_name?.trim()) err.first_name = "Nombre requerido";
    if (!formData.last_name?.trim()) err.last_name = "Apellido requerido";
    if (!formData.phone?.trim()) err.phone = "Teléfono requerido";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleRUTChange = (value: string) => {
    setFormData((prev) => ({ ...prev, rut: formatRUTAsYouType(value) }));
  };

  const handleRUTBlur = (value: string) => {
    if (value.trim()) {
      const formatted = formatRUT(value);
      if (formatted) {
        setFormData((prev) => ({ ...prev, rut: formatted }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await customerService.createCustomer({
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        rut: formData.rut.trim() || null,
        branch_id: branchId,
        field_operation_id: fieldOperationId,
      });
      toast.success("Cliente creado");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Error al crear cliente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 text-admin-text-primary font-semibold mb-4">
        <User className="h-5 w-5" />
        Nuevo cliente del operativo
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-admin-text-primary text-sm">Nombre *</Label>
          <Input
            value={formData.first_name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, first_name: e.target.value }))
            }
            placeholder="Nombre"
            className="mt-1 h-11 border-admin-border-primary/30"
          />
          {errors.first_name && (
            <p className="text-sm text-red-500 mt-1">{errors.first_name}</p>
          )}
        </div>
        <div>
          <Label className="text-admin-text-primary text-sm">Apellido *</Label>
          <Input
            value={formData.last_name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, last_name: e.target.value }))
            }
            placeholder="Apellido"
            className="mt-1 h-11 border-admin-border-primary/30"
          />
          {errors.last_name && (
            <p className="text-sm text-red-500 mt-1">{errors.last_name}</p>
          )}
        </div>
      </div>
      <div>
        <Label className="text-admin-text-primary text-sm">Teléfono *</Label>
        <Input
          value={formData.phone}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, phone: e.target.value }))
          }
          placeholder="+56 9 1234 5678"
          className="mt-1 h-11 border-admin-border-primary/30"
        />
        {errors.phone && (
          <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
        )}
      </div>
      <div>
        <Label className="text-admin-text-primary text-sm">Email</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
          placeholder="email@ejemplo.com"
          className="mt-1 h-11 border-admin-border-primary/30"
        />
      </div>
      <div>
        <Label className="text-admin-text-primary text-sm">RUT</Label>
        <Input
          value={formData.rut}
          onChange={(e) => handleRUTChange(e.target.value)}
          onBlur={(e) => handleRUTBlur(e.target.value)}
          placeholder="12.345.678-9"
          className="mt-1 h-11 border-admin-border-primary/30 font-mono"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="min-h-[44px]"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="min-h-[44px] bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23]"
        >
          {saving ? "Creando..." : "Crear cliente"}
        </Button>
      </div>
    </form>
  );
}

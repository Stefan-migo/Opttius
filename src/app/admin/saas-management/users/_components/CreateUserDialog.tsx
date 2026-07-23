"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: Array<{ id: string; name: string; slug: string }>;
  onUserCreated: () => void;
}

const initialForm = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  role: "admin",
  organization_id: "",
  branch_id: "",
};

export function CreateUserDialog({
  open,
  onOpenChange,
  organizations,
  onUserCreated,
}: CreateUserDialogProps) {
  const [form, setForm] = useState(initialForm);
  const [branchesForOrg, setBranchesForOrg] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setBranchesForOrg([]);
      setCreating(false);
    }
  }, [open]);

  const loadBranchesForOrg = async (orgId: string) => {
    if (!orgId) {
      setBranchesForOrg([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/saas-management/organizations/${orgId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setBranchesForOrg(data.organization?.branches || []);
      } else {
        setBranchesForOrg([]);
      }
    } catch {
      setBranchesForOrg([]);
    }
  };

  const handleCreate = async () => {
    if (!form.email || !form.password) {
      toast.error("Email y contraseña son requeridos");
      return;
    }
    if (form.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/saas-management/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          first_name: form.first_name || undefined,
          last_name: form.last_name || undefined,
          role: form.role,
          organization_id: form.organization_id || undefined,
          branch_id: form.branch_id || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear usuario");
      }
      toast.success("Usuario creado correctamente");
      onOpenChange(false);
      onUserCreated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al crear usuario",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setForm(initialForm);
          setBranchesForOrg([]);
        }
      }}
    >
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
          <DialogDescription>
            Crea un nuevo usuario y asígnale organización y rol (solo root/dev).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Email *</Label>
            <Input
              placeholder="usuario@ejemplo.com"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Contraseña * (mín. 8 caracteres)</Label>
            <Input
              placeholder="••••••••"
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nombre</Label>
              <Input
                placeholder="Nombre"
                value={form.first_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, first_name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Apellido</Label>
              <Input
                placeholder="Apellido"
                value={form.last_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, last_name: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <Label>Rol</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Root</SelectItem>
                <SelectItem value="dev">Dev</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="vendedor">Vendedor</SelectItem>
                <SelectItem value="employee">Empleado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Organización</Label>
            <Select
              value={form.organization_id ? form.organization_id : "__none__"}
              onValueChange={(v) => {
                const orgId = v === "__none__" ? "" : v;
                setForm((f) => ({
                  ...f,
                  organization_id: orgId,
                  branch_id: "",
                }));
                loadBranchesForOrg(orgId);
              }}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Sin organización" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin organización</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(form.role === "admin" ||
            form.role === "vendedor" ||
            form.role === "employee") &&
            branchesForOrg.length > 0 && (
              <div>
                <Label>Sucursal (opcional)</Label>
                <Select
                  value={form.branch_id}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, branch_id: v }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {branchesForOrg.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={creating} onClick={handleCreate}>
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear usuario"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

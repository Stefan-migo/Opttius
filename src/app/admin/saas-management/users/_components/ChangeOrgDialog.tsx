"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChangeOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: Array<{ id: string; name: string; slug: string }>;
  user: { id: string; email: string; organization_id?: string } | null;
  onChangeOrg: (userId: string, orgId: string) => Promise<void>;
}

export function ChangeOrgDialog({
  open,
  onOpenChange,
  organizations,
  user,
  onChangeOrg,
}: ChangeOrgDialogProps) {
  const [selectedOrgId, setSelectedOrgId] = useState("");

  useEffect(() => {
    if (user) {
      setSelectedOrgId(user.organization_id || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (!user || !selectedOrgId) {
      toast.error("Selecciona una organización");
      return;
    }
    await onChangeOrg(user.id, selectedOrgId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar Organización</DialogTitle>
          <DialogDescription>
            Asigna una nueva organización al usuario {user?.email}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Organización</label>
            <Select
              value={selectedOrgId ? selectedOrgId : "__none__"}
              onValueChange={(v) =>
                setSelectedOrgId(v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Seleccionar organización" />
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
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

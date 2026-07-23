"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
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

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface CreateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: Organization[];
  onCreated: () => void;
}

export function CreateSubscriptionDialog({
  open,
  onOpenChange,
  organizations,
  onCreated,
}: CreateSubscriptionDialogProps) {
  const [createOrgId, setCreateOrgId] = useState("");
  const [createStatus, setCreateStatus] = useState("trialing");
  const [createTrialDays, setCreateTrialDays] = useState("7");
  const [createLoading, setCreateLoading] = useState(false);

  const handleCreate = async () => {
    const orgId = createOrgId?.trim();
    if (!orgId) {
      toast.error("Selecciona una organización.");
      return;
    }
    const trialDaysNum = parseInt(createTrialDays, 10);
    if (isNaN(trialDaysNum) || trialDaysNum < 1) {
      toast.error("Días de prueba debe ser un número mayor a 0.");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/saas-management/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: orgId,
          status: createStatus,
          trial_days: trialDaysNum,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear suscripción");
      toast.success("Suscripción creada.");
      onOpenChange(false);
      setCreateOrgId("");
      setCreateStatus("trialing");
      setCreateTrialDays("7");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva suscripción</DialogTitle>
          <DialogDescription>
            Crea una suscripción para una organización. Se asignará período de
            prueba según los días indicados.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Organización</Label>
            <Select value={createOrgId} onValueChange={setCreateOrgId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecciona organización" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name} ({org.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={createStatus} onValueChange={setCreateStatus}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trialing">Trial</SelectItem>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="past_due">Vencida</SelectItem>
                <SelectItem value="incomplete">Incompleta</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trial_days">Días de prueba (si es trial)</Label>
            <Input
              id="trial_days"
              min={1}
              type="number"
              value={createTrialDays}
              onChange={(e) => setCreateTrialDays(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={createLoading} onClick={handleCreate}>
            {createLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

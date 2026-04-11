"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";

export default function NewFieldOperationPage() {
  const router = useRouter();
  const { currentBranchId, branches, isSuperAdmin } = useBranch();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [location, setLocation] = useState("");
  const [branchId, setBranchId] = useState(currentBranchId || "");

  useEffect(() => {
    if (currentBranchId && !branchId) {
      setBranchId(currentBranchId);
    }
  }, [currentBranchId, branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !scheduledDate || !branchId) {
      toast.error("Nombre, fecha y sucursal son requeridos");
      return;
    }

    setLoading(true);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...getBranchHeader(currentBranchId),
      };

      const response = await fetch("/api/admin/field-operations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          scheduled_date: scheduledDate,
          location: location.trim() || null,
          branch_id: branchId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear operativo");
      }

      const id = data?.data?.fieldOperation?.id;
      if (id) {
        toast.success("Operativo creado");
        router.push(`/admin/field-operations/${id}`);
      } else {
        toast.error("Respuesta inválida del servidor");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al crear operativo",
      );
    } finally {
      setLoading(false);
    }
  };

  const effectiveBranches = branches || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Link
          className="inline-flex items-center gap-2 text-sm text-admin-text-tertiary hover:text-admin-text-primary min-h-[44px] items-center"
          href="/admin/field-operations"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Volver a operativos
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary tracking-tight">
            Nuevo operativo
          </h1>
          <p className="text-sm text-admin-text-tertiary mt-1">
            Crea un operativo para preparar stock y gestionar ventas en terreno
          </p>
        </div>
      </div>

      {/* Form card - centered, max width for readability */}
      <div className="max-w-xl mx-auto">
        <Card className="border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] overflow-hidden">
          <CardHeader className="p-4 sm:p-6 border-b border-admin-border-primary/10">
            <CardTitle className="text-admin-text-primary text-lg">
              Datos del operativo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label className="text-admin-text-primary" htmlFor="name">
                  Nombre *
                </Label>
                <Input
                  required
                  className="h-11 sm:h-10 min-h-[44px]"
                  id="name"
                  placeholder="Ej: Operativo Empresa ABC - Marzo 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label
                  className="text-admin-text-primary"
                  htmlFor="scheduled_date"
                >
                  Fecha programada *
                </Label>
                <Input
                  required
                  className="h-11 sm:h-10 min-h-[44px]"
                  id="scheduled_date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-admin-text-primary" htmlFor="location">
                  Ubicación
                </Label>
                <Input
                  className="h-11 sm:h-10 min-h-[44px]"
                  id="location"
                  placeholder="Ej: Empresa ABC, Av. Principal 123"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-admin-text-primary" htmlFor="branch_id">
                  Sucursal origen *
                </Label>
                <Select required value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger
                    className="h-11 sm:h-10 min-h-[44px]"
                    id="branch_id"
                  >
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {effectiveBranches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <Link className="sm:order-2" href="/admin/field-operations">
                  <Button
                    className="w-full sm:w-auto min-h-[44px]"
                    type="button"
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </Link>
                <Button
                  className="w-full sm:w-auto min-h-[44px] sm:order-1"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? "Creando..." : "Crear operativo"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import { toast } from "sonner";

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
          href="/admin/field-operations"
          className="inline-flex items-center gap-2 text-sm text-admin-text-tertiary hover:text-admin-text-primary min-h-[44px] items-center"
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-admin-text-primary">
                  Nombre *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Operativo Empresa ABC - Marzo 2026"
                  required
                  className="h-11 sm:h-10 min-h-[44px]"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="scheduled_date"
                  className="text-admin-text-primary"
                >
                  Fecha programada *
                </Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                  className="h-11 sm:h-10 min-h-[44px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-admin-text-primary">
                  Ubicación
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej: Empresa ABC, Av. Principal 123"
                  className="h-11 sm:h-10 min-h-[44px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch_id" className="text-admin-text-primary">
                  Sucursal origen *
                </Label>
                <Select value={branchId} onValueChange={setBranchId} required>
                  <SelectTrigger
                    id="branch_id"
                    className="h-11 sm:h-10 min-h-[44px]"
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
                <Link href="/admin/field-operations" className="sm:order-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto min-h-[44px]"
                  >
                    Cancelar
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto min-h-[44px] sm:order-1"
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

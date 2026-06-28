"use client";

import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrgsHeaderProps {
  onCreateOrg: (data: {
    name: string;
    slug: string;
    subscription_tier: string;
    status: string;
    owner_id: string;
  }) => Promise<void>;
  creating: boolean;
}

export default function OrgsHeader({ onCreateOrg, creating }: OrgsHeaderProps) {
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrgData, setNewOrgData] = useState({
    name: "",
    slug: "",
    subscription_tier: "basic",
    status: "active",
    owner_id: "",
  });

  const handleCreate = async () => {
    await onCreateOrg(newOrgData);
    setNewOrgData({
      name: "",
      slug: "",
      subscription_tier: "basic",
      status: "active",
      owner_id: "",
    });
    setShowCreateDialog(false);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          size="icon"
          title="Volver al dashboard"
          variant="ghost"
          onClick={() => router.push("/admin/saas-management/dashboard")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Gestión de Organizaciones
          </h1>
          <p className="text-white/50 mt-2">
            Administra todas las organizaciones del sistema
          </p>
        </div>
      </div>
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Organización
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Organización</DialogTitle>
            <DialogDescription>
              Completa los datos para crear una nueva organización
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <Input
                placeholder="Ej: Óptica Centro"
                value={newOrgData.name}
                onChange={(e) =>
                  setNewOrgData({ ...newOrgData, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Slug *</label>
              <Input
                placeholder="optica-centro"
                value={newOrgData.slug}
                onChange={(e) =>
                  setNewOrgData({
                    ...newOrgData,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Solo letras minúsculas, números y guiones
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Tier</label>
              <Select
                value={newOrgData.subscription_tier}
                onValueChange={(value) =>
                  setNewOrgData({ ...newOrgData, subscription_tier: value })
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Básico</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancelar
            </Button>
            <Button disabled={creating} onClick={handleCreate}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

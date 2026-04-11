"use client";

import { Building2, Crown, Globe, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface BranchAccess {
  id: string;
  branch_id: string | null;
  role: string;
  is_primary: boolean;
  branches?: Branch | null;
}

interface BranchAccessManagerProps {
  adminUserId: string;
  isSuperAdmin: boolean;
  canEdit: boolean;
}

export default function BranchAccessManager({
  adminUserId,
  isSuperAdmin: initialIsSuperAdmin,
  canEdit,
}: BranchAccessManagerProps) {
  const [branchAccess, setBranchAccess] = useState<BranchAccess[]>([]);
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(initialIsSuperAdmin);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  useEffect(() => {
    fetchBranchAccess();
    fetchAvailableBranches();
  }, [adminUserId]);

  const fetchBranchAccess = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/admin-users/${adminUserId}/branch-access`,
      );
      if (response.ok) {
        const data = await response.json();
        setBranchAccess(data.branchAccess || []);
        const hasSuperAdmin = data.branchAccess?.some(
          (access: BranchAccess) => access.branch_id === null,
        );
        setIsSuperAdmin(hasSuperAdmin);
      }
    } catch (error) {
      console.error("Error fetching branch access:", error);
      toast.error("Error al cargar acceso a sucursales");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBranches = async () => {
    try {
      const response = await fetch("/api/admin/branches");
      if (response.ok) {
        const data = await response.json();
        setAvailableBranches(data.branches || []);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const handleAssignSuperAdmin = async () => {
    if (!canEdit) {
      toast.error("No tienes permisos para realizar esta acción");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        `/api/admin/admin-users/${adminUserId}/branch-access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branch_id: null,
            role: "manager",
            is_primary: true,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Error al asignar super administrador",
        );
      }

      toast.success("Super administrador asignado exitosamente");
      fetchBranchAccess();
    } catch (error) {
      console.error("Error assigning super admin:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al asignar super administrador",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAssignBranch = async () => {
    if (!canEdit || !selectedBranchId) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        `/api/admin/admin-users/${adminUserId}/branch-access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branch_id: selectedBranchId,
            role: "manager",
            is_primary: branchAccess.length === 0,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al asignar sucursal");
      }

      toast.success("Sucursal asignada exitosamente");
      setSelectedBranchId("");
      fetchBranchAccess();
    } catch (error) {
      console.error("Error assigning branch:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al asignar sucursal",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBranch = async (branchId: string | null) => {
    if (!canEdit) {
      toast.error("No tienes permisos para realizar esta acción");
      return;
    }

    if (!confirm("¿Estás seguro de que quieres remover este acceso?")) {
      return;
    }

    try {
      setSaving(true);
      const url = branchId
        ? `/api/admin/admin-users/${adminUserId}/branch-access?branch_id=${branchId}`
        : `/api/admin/admin-users/${adminUserId}/branch-access?branch_id=null`;

      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al remover acceso");
      }

      toast.success("Acceso removido exitosamente");
      fetchBranchAccess();
    } catch (error) {
      console.error("Error removing branch access:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al remover acceso",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-admin-bg-tertiary">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-admin-accent-tertiary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const assignedBranchIds = branchAccess
    .filter((access) => access.branch_id !== null)
    .map((access) => access.branch_id);

  const unassignedBranches = availableBranches.filter(
    (branch) => !assignedBranchIds.includes(branch.id),
  );

  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Acceso a Sucursales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Super Admin Status */}
        {isSuperAdmin ? (
          <div className="p-4 bg-dorado/10 border border-dorado/30 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-dorado" />
                <div>
                  <div className="font-medium text-dorado">
                    Super Administrador
                  </div>
                  <div className="text-sm text-tierra-media">
                    Acceso a todas las sucursales
                  </div>
                </div>
              </div>
              {canEdit && (
                <Button
                  disabled={saving}
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemoveBranch(null)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              )}
            </div>
          </div>
        ) : (
          canEdit && (
            <div className="p-4 border rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium mb-1">
                    Asignar Super Administrador
                  </div>
                  <div className="text-sm text-tierra-media">
                    Otorga acceso a todas las sucursales
                  </div>
                </div>
                <Button
                  disabled={saving}
                  size="sm"
                  variant="outline"
                  onClick={handleAssignSuperAdmin}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Asignar
                </Button>
              </div>
            </div>
          )
        )}

        {/* Branch Access List */}
        {!isSuperAdmin && (
          <>
            <div className="space-y-2">
              <Label>Sucursales Asignadas</Label>
              {branchAccess.filter((access) => access.branch_id !== null)
                .length === 0 ? (
                <div className="p-4 text-center text-tierra-media border rounded-md">
                  No hay sucursales asignadas
                </div>
              ) : (
                <div className="space-y-2">
                  {branchAccess
                    .filter((access) => access.branch_id !== null)
                    .map((access) => (
                      <div
                        className="flex items-center justify-between p-3 border rounded-md bg-admin-bg-secondary"
                        key={access.id}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-admin-accent-tertiary" />
                          <span className="font-medium">
                            {access.branches?.name || "N/A"} (
                            {access.branches?.code || "N/A"})
                          </span>
                          {access.is_primary && (
                            <Badge className="text-xs" variant="outline">
                              Principal
                            </Badge>
                          )}
                        </div>
                        {canEdit && (
                          <Button
                            disabled={saving}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveBranch(access.branch_id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Add Branch */}
            {canEdit && unassignedBranches.length > 0 && (
              <div className="space-y-2">
                <Label>Asignar Nueva Sucursal</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedBranchId}
                    onValueChange={setSelectedBranchId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleccionar sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedBranches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} ({branch.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={!selectedBranchId || saving}
                    onClick={handleAssignBranch}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

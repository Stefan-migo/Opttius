"use client";

import { AlertTriangle, Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrgBranchesTabProps {
  orgId: string;
  onOrgUpdate?: () => void;
}

export default function OrgBranchesTab({
  orgId,
  onOrgUpdate,
}: OrgBranchesTabProps) {
  const [branches, setBranches] = useState<Array<unknown>>([]);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<unknown>(null);
  const [branchFormData, setBranchFormData] = useState({
    name: "",
    code: "",
    address_line_1: "",
    city: "",
    phone: "",
    email: "",
    is_active: true,
  });
  const [deleteBranchConfirmId, setDeleteBranchConfirmId] = useState<
    string | null
  >(null);

  useEffect(() => {
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const fetchBranches = async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/branches`,
      );
      if (!response.ok) throw new Error("Error al cargar sucursales");
      const data = await response.json();
      setBranches(data.branches || []);
    } catch {
      toast.error("Error al cargar sucursales");
    }
  };

  const handleCreateBranch = async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/branches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(branchFormData),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al crear sucursal");

      toast.success("Sucursal creada exitosamente");
      setShowBranchDialog(false);
      setBranchFormData({
        name: "",
        code: "",
        address_line_1: "",
        city: "",
        phone: "",
        email: "",
        is_active: true,
      });
      fetchBranches();
      onOrgUpdate?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleUpdateBranch = async () => {
    if (!editingBranch) return;
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/branches/${editingBranch.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(branchFormData),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al actualizar sucursal");

      toast.success("Sucursal actualizada exitosamente");
      setShowBranchDialog(false);
      setEditingBranch(null);
      setBranchFormData({
        name: "",
        code: "",
        address_line_1: "",
        city: "",
        phone: "",
        email: "",
        is_active: true,
      });
      fetchBranches();
      onOrgUpdate?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleDeleteBranchClick = (branchId: string) => {
    setDeleteBranchConfirmId(branchId);
  };

  const handleDeleteBranchConfirm = async () => {
    if (!deleteBranchConfirmId) return;

    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/branches/${deleteBranchConfirmId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al eliminar sucursal");

      toast.success("Sucursal eliminada exitosamente");
      setDeleteBranchConfirmId(null);
      fetchBranches();
      onOrgUpdate?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  return (
    <>
      <Card className="admin-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sucursales</CardTitle>
          <Button
            onClick={() => {
              setEditingBranch(null);
              setBranchFormData({
                name: "",
                code: "",
                address_line_1: "",
                city: "",
                phone: "",
                email: "",
                is_active: true,
              });
              setShowBranchDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Sucursal
          </Button>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay sucursales registradas
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">
                        {branch.name}
                      </TableCell>
                      <TableCell>{branch.code}</TableCell>
                      <TableCell>
                        {branch.address_line_1 && branch.city
                          ? `${branch.address_line_1}, ${branch.city}`
                          : "-"}
                      </TableCell>
                      <TableCell>{branch.phone || "-"}</TableCell>
                      <TableCell>
                        {branch.is_active ? (
                          <Badge variant="default">Activa</Badge>
                        ) : (
                          <Badge variant="secondary">Inactiva</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingBranch(branch);
                              setBranchFormData({
                                name: branch.name,
                                code: branch.code,
                                address_line_1: branch.address_line_1 || "",
                                city: branch.city || "",
                                phone: branch.phone || "",
                                email: branch.email || "",
                                is_active: branch.is_active,
                              });
                              setShowBranchDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleDeleteBranchClick(branch.id)
                            }
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branch create/edit dialog */}
      <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? "Editar Sucursal" : "Nueva Sucursal"}
            </DialogTitle>
            <DialogDescription>
              {editingBranch
                ? "Modifica los datos de la sucursal"
                : "Completa los datos para crear una nueva sucursal"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  placeholder="Ej: Sucursal Centro"
                  value={branchFormData.name}
                  onChange={(e) =>
                    setBranchFormData({
                      ...branchFormData,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Código</label>
                <Input
                  placeholder="Se genera automáticamente si se deja vacío"
                  value={branchFormData.code}
                  onChange={(e) =>
                    setBranchFormData({
                      ...branchFormData,
                      code: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Dirección</label>
              <Input
                placeholder="Dirección línea 1"
                value={branchFormData.address_line_1}
                onChange={(e) =>
                  setBranchFormData({
                    ...branchFormData,
                    address_line_1: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ciudad</label>
              <Input
                placeholder="Ciudad"
                value={branchFormData.city}
                onChange={(e) =>
                  setBranchFormData({ ...branchFormData, city: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  placeholder="Teléfono"
                  value={branchFormData.phone}
                  onChange={(e) =>
                    setBranchFormData({
                      ...branchFormData,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  placeholder="Email"
                  type="email"
                  value={branchFormData.email}
                  onChange={(e) =>
                    setBranchFormData({
                      ...branchFormData,
                      email: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                checked={branchFormData.is_active}
                className="rounded"
                id="branch-active"
                type="checkbox"
                onChange={(e) =>
                  setBranchFormData({
                    ...branchFormData,
                    is_active: e.target.checked,
                  })
                }
              />
              <label className="text-sm font-medium" htmlFor="branch-active">
                Sucursal activa
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBranchDialog(false);
                setEditingBranch(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={editingBranch ? handleUpdateBranch : handleCreateBranch}
            >
              {editingBranch ? "Guardar Cambios" : "Crear Sucursal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Branch Confirmation Dialog */}
      <Dialog
        open={deleteBranchConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteBranchConfirmId(null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Eliminar sucursal
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar esta sucursal? Esta acción eliminará
              todos los datos relacionados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteBranchConfirmId(null)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteBranchConfirm}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

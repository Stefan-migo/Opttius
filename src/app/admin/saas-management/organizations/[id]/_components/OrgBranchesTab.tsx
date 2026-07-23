"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { OrgBranchDeleteDialog,OrgBranchDialog } from "./OrgBranchDialog";

interface BranchFormData {
  name: string;
  code: string;
  address_line_1: string;
  city: string;
  phone: string;
  email: string;
  is_active: boolean;
}

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

      <OrgBranchDialog
        branchFormData={branchFormData}
        editingBranch={editingBranch}
        open={showBranchDialog}
        onFormChange={(data) => setBranchFormData((f) => ({ ...f, ...data }))}
        onOpenChange={(open) => {
          setShowBranchDialog(open);
          if (!open) setEditingBranch(null);
        }}
        onSave={editingBranch ? handleUpdateBranch : handleCreateBranch}
      />

      <OrgBranchDeleteDialog
        open={deleteBranchConfirmId !== null}
        onConfirm={handleDeleteBranchConfirm}
        onOpenChange={(open) => !open && setDeleteBranchConfirmId(null)}
      />
    </>
  );
}

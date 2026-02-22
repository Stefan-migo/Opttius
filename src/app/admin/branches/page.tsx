"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/hooks/useBranch";

interface Branch {
  id: string;
  name: string;
  code: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  settings?: any;
  created_at: string;
  updated_at: string;
}

export default function BranchesPage() {
  const { isSuperAdmin, refreshBranches } = useBranch();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "Chile",
    phone: "",
    email: "",
    is_active: true,
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/branches");

      if (!response.ok) {
        throw new Error("Failed to fetch branches");
      }

      const data = await response.json();
      setBranches(data.branches || []);
    } catch (error: any) {
      console.error("Error fetching branches:", error);
      toast.error("Error al cargar sucursales");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (branch?: Branch) => {
    if (branch) {
      setSelectedBranch(branch);
      setFormData({
        name: branch.name,
        code: branch.code,
        address_line_1: branch.address_line_1 || "",
        address_line_2: branch.address_line_2 || "",
        city: branch.city || "",
        state: branch.state || "",
        postal_code: branch.postal_code || "",
        country: branch.country || "Chile",
        phone: branch.phone || "",
        email: branch.email || "",
        is_active: branch.is_active,
      });
    } else {
      setSelectedBranch(null);
      setFormData({
        name: "",
        code: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "Chile",
        phone: "",
        email: "",
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedBranch(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code) {
      toast.error("El nombre y código son obligatorios");
      return;
    }

    try {
      setIsSubmitting(true);
      const url = selectedBranch
        ? `/api/admin/branches/${selectedBranch.id}`
        : "/api/admin/branches";

      const method = selectedBranch ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar sucursal");
      }

      toast.success(
        selectedBranch
          ? "Sucursal actualizada exitosamente"
          : "Sucursal creada exitosamente",
      );

      handleCloseDialog();
      fetchBranches();
      // Refresh branches in context so selector updates
      if (refreshBranches) {
        await refreshBranches();
      }
    } catch (error: any) {
      console.error("Error saving branch:", error);
      toast.error(error.message || "Error al guardar sucursal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBranch) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/admin/branches/${selectedBranch.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al eliminar sucursal");
      }

      toast.success("Sucursal eliminada exitosamente");
      setIsDeleteDialogOpen(false);
      setSelectedBranch(null);
      fetchBranches();
      // Refresh branches in context so selector updates
      if (refreshBranches) {
        await refreshBranches();
      }
    } catch (error: any) {
      console.error("Error deleting branch:", error);
      toast.error(error.message || "Error al eliminar sucursal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user is super admin
  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Acceso Restringido</h2>
              <p className="text-muted-foreground">
                Solo los super administradores pueden gestionar sucursales.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestión de Sucursales</h1>
          <p className="text-[var(--admin-accent-primary)]">
            Administra las sucursales de tu negocio
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Sucursal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedBranch ? "Editar Sucursal" : "Nueva Sucursal"}
              </DialogTitle>
              <DialogDescription>
                {selectedBranch
                  ? "Modifica la información de la sucursal"
                  : "Completa los datos para crear una nueva sucursal"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nombre <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Ej: Sucursal Centro"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">
                      Código <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="Ej: SUC-001"
                      required
                      disabled={!!selectedBranch}
                    />
                    {selectedBranch && (
                      <p className="text-xs text-muted-foreground">
                        El código no se puede modificar
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_line_1">Dirección Línea 1</Label>
                  <Input
                    id="address_line_1"
                    value={formData.address_line_1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address_line_1: e.target.value,
                      })
                    }
                    placeholder="Calle y número"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_line_2">Dirección Línea 2</Label>
                  <Input
                    id="address_line_2"
                    value={formData.address_line_2}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address_line_2: e.target.value,
                      })
                    }
                    placeholder="Depto, oficina, etc."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      placeholder="Ciudad"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Región/Estado</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      placeholder="Región"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Código Postal</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          postal_code: e.target.value,
                        })
                      }
                      placeholder="Código postal"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    placeholder="País"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="sucursal@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="is_active">Estado</Label>
                  <Select
                    value={formData.is_active ? "active" : "inactive"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        is_active: value === "active",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="inactive">Inactiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sucursales</CardTitle>
          <CardDescription className="text-[var(--admin-accent-primary)]">
            Lista de todas las sucursales del negocio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay sucursales</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primera sucursal para comenzar
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Sucursal
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[var(--admin-accent-primary)]">
                      Nombre
                    </TableHead>
                    <TableHead className="text-[var(--admin-accent-primary)]">
                      Código
                    </TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Contacto</TableHead>
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
                      <TableCell>
                        <Badge variant="outline">{branch.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <MapPin className="h-4 w-4 text-[var(--accent-foreground)]" />
                          <span>
                            {branch.city || branch.state
                              ? `${branch.city || ""}${branch.city && branch.state ? ", " : ""}${branch.state || ""}`
                              : "Sin ubicación"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {branch.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3" />
                              <span>{branch.phone}</span>
                            </div>
                          )}
                          {branch.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3" />
                              <span>{branch.email}</span>
                            </div>
                          )}
                          {!branch.phone && !branch.email && (
                            <span className="text-sm text-foreground">
                              Sin contacto
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {branch.is_active ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Activa
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactiva
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(branch)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedBranch(branch);
                              setIsDeleteDialogOpen(true);
                            }}
                            disabled={branch.code === "MAIN"}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar sucursal?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará la sucursal{" "}
              <strong>{selectedBranch?.name}</strong> y todos sus datos
              asociados.
              {selectedBranch?.code === "MAIN" && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <strong>Advertencia:</strong> No se puede eliminar la sucursal
                  principal.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedBranch(null);
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting || selectedBranch?.code === "MAIN"}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

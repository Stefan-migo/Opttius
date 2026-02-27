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
      <div className="p-4 sm:p-6 bg-epoch-background min-h-screen">
        <Card className="rounded-xl border border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center py-6 sm:py-8">
              <XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive mx-auto mb-3 sm:mb-4" />
              <h2 className="text-lg sm:text-xl font-bold text-epoch-primary mb-2">
                Acceso Restringido
              </h2>
              <p className="text-sm text-epoch-primary/80">
                Solo los super administradores pueden gestionar sucursales.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-epoch-background min-h-screen space-y-4 sm:space-y-6">
      {/* Header - reorganizado en filas */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-epoch-primary tracking-tight">
          Gestión de Sucursales
        </h1>
        <p className="text-sm sm:text-base text-epoch-primary/80 max-w-2xl">
          Administra las sucursales de tu negocio
        </p>
        <div className="flex justify-start sm:justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => handleOpenDialog()}
                className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase min-h-[44px] px-6 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2 shrink-0" />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-xs sm:text-sm text-epoch-primary/80"
                      >
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
                        className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="code"
                        className="text-xs sm:text-sm text-epoch-primary/80"
                      >
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
                        className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                      />
                      {selectedBranch && (
                        <p className="text-xs text-epoch-primary/70">
                          El código no se puede modificar
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="address_line_1"
                      className="text-xs sm:text-sm text-epoch-primary/80"
                    >
                      Dirección Línea 1
                    </Label>
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
                      className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="address_line_2"
                      className="text-xs sm:text-sm text-epoch-primary/80"
                    >
                      Dirección Línea 2
                    </Label>
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
                      className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="city"
                        className="text-xs sm:text-sm text-epoch-primary/80"
                      >
                        Ciudad
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        placeholder="Ciudad"
                        className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="state"
                        className="text-xs sm:text-sm text-epoch-primary/80"
                      >
                        Región/Estado
                      </Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) =>
                          setFormData({ ...formData, state: e.target.value })
                        }
                        placeholder="Región"
                        className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="postal_code"
                        className="text-xs sm:text-sm text-epoch-primary/80"
                      >
                        Código Postal
                      </Label>
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
                        className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="country"
                      className="text-xs sm:text-sm text-epoch-primary/80"
                    >
                      País
                    </Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      placeholder="País"
                      className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="phone"
                        className="text-xs sm:text-sm text-epoch-primary/80"
                      >
                        Teléfono
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="+56 9 1234 5678"
                        className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-xs sm:text-sm text-epoch-primary/80"
                      >
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="sucursal@ejemplo.com"
                        className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="is_active"
                      className="text-xs sm:text-sm text-epoch-primary/80"
                    >
                      Estado
                    </Label>
                    <Select
                      value={formData.is_active ? "active" : "inactive"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          is_active: value === "active",
                        })
                      }
                    >
                      <SelectTrigger className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activa</SelectItem>
                        <SelectItem value="inactive">Inactiva</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    disabled={isSubmitting}
                    className="rounded-xl border-epoch-primary/20 w-full sm:w-auto min-h-[44px]"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white w-full sm:w-auto min-h-[44px]"
                  >
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
      </div>

      <Card className="rounded-xl border border-border">
        <CardHeader className="p-4 sm:p-6 pb-0">
          <CardTitle className="font-display text-epoch-primary text-base sm:text-lg">
            Sucursales
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-epoch-primary/80">
            Lista de todas las sucursales del negocio
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8 sm:py-12">
              <Loader2 className="h-8 w-8 animate-spin text-epoch-primary" />
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-epoch-primary/40 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-epoch-primary mb-2">
                No hay sucursales
              </h3>
              <p className="text-sm text-epoch-primary/80 mb-4">
                Crea tu primera sucursal para comenzar
              </p>
              <Button
                onClick={() => handleOpenDialog()}
                className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase min-h-[44px] px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Sucursal
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">
                      Nombre
                    </TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">
                      Código
                    </TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">
                      Ubicación
                    </TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">
                      Contacto
                    </TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">
                      Estado
                    </TableHead>
                    <TableHead className="text-right text-epoch-primary/80 text-xs sm:text-sm">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium text-epoch-primary text-xs sm:text-sm">
                        {branch.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-epoch-primary/20 text-epoch-primary font-medium text-[10px] sm:text-xs"
                        >
                          {branch.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-epoch-primary/80 min-w-0">
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-epoch-accent shrink-0" />
                          <span className="truncate">
                            {branch.city || branch.state
                              ? `${branch.city || ""}${branch.city && branch.state ? ", " : ""}${branch.state || ""}`
                              : "Sin ubicación"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-0">
                          {branch.phone && (
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-epoch-primary/80">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span className="truncate">{branch.phone}</span>
                            </div>
                          )}
                          {branch.email && (
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-epoch-primary/80">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{branch.email}</span>
                            </div>
                          )}
                          {!branch.phone && !branch.email && (
                            <span className="text-xs sm:text-sm text-epoch-primary/70">
                              Sin contacto
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {branch.is_active ? (
                          <Badge className="bg-epoch-primary text-white text-[10px] sm:text-xs">
                            <CheckCircle className="h-3 w-3 mr-1 shrink-0" />
                            Activa
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-epoch-primary/20 text-epoch-primary/70 text-[10px] sm:text-xs"
                          >
                            <XCircle className="h-3 w-3 mr-1 shrink-0" />
                            Inactiva
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(branch)}
                            className="min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8 rounded-xl"
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
                            className="min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8 rounded-xl"
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
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-epoch-primary">
              ¿Eliminar sucursal?
            </DialogTitle>
            <DialogDescription className="text-epoch-primary/80">
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedBranch(null);
              }}
              disabled={isSubmitting}
              className="rounded-xl border-epoch-primary/20 w-full sm:w-auto min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting || selectedBranch?.code === "MAIN"}
              className="rounded-xl w-full sm:w-auto min-h-[44px]"
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

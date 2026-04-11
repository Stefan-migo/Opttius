"use client";

import { ArrowLeft, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface Branch {
  id: string;
  name: string;
  code: string;
}

export default function RegisterUserPage() {
  const router = useRouter();
  const { isSuperAdmin } = useBranch();
  const [loading, setLoading] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: "admin",
    branch_id: "",
  });

  // Cargar sucursales disponibles
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const response = await fetch("/api/admin/branches");
        if (response.ok) {
          const data = await response.json();
          setBranches(data.branches || []);
        }
      } catch (err) {
        console.error("Error fetching branches:", err);
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!formData.email || !formData.password) {
      setError("Email y contraseña son requeridos");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    // Validar que si el rol requiere sucursal, se haya seleccionado una
    if (
      (formData.role === "admin" ||
        formData.role === "employee" ||
        formData.role === "vendedor") &&
      !formData.branch_id &&
      branches.length > 0
    ) {
      setError("Debes seleccionar una sucursal para este rol");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/admin-users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          branch_id: formData.branch_id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al registrar usuario");
      }

      toast.success("Usuario registrado exitosamente");
      router.push("/admin/admin-users");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  // Determinar roles permitidos según el usuario actual
  const getAllowedRoles = () => {
    // En una implementación completa, verificar el rol del usuario actual
    // Por ahora, asumimos que admin puede crear admin y employee
    // Super admin puede crear admin, employee, super_admin
    // Root/dev puede crear cualquier rol (se valida en el backend)
    if (isSuperAdmin) {
      return [
        { value: "admin", label: "Administrador" },
        { value: "vendedor", label: "Vendedor" },
        { value: "employee", label: "Empleado" },
        { value: "super_admin", label: "Super Administrador" },
      ];
    }
    return [
      { value: "admin", label: "Administrador" },
      { value: "vendedor", label: "Vendedor" },
      { value: "employee", label: "Empleado" },
    ];
  };

  const requiresBranch =
    formData.role === "admin" ||
    formData.role === "employee" ||
    formData.role === "vendedor";

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-epoch-background min-h-screen">
      {/* Header - reorganizado en filas */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/admin-users">
            <Button
              className="rounded-xl text-epoch-primary hover:bg-epoch-primary/10 min-h-[44px] shrink-0"
              size="sm"
              variant="ghost"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-epoch-primary tracking-tight">
          Registrar Nuevo Usuario
        </h1>
        <p className="text-sm sm:text-base text-epoch-primary/80 max-w-2xl">
          El usuario será registrado con tu organización actual
        </p>
      </div>

      <Card className="rounded-xl border border-border">
        <CardHeader className="p-4 sm:p-6 pb-0">
          <CardTitle className="font-display text-epoch-primary text-base sm:text-lg">
            Información del Usuario
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-epoch-primary/80">
            Completa los datos para registrar un nuevo usuario en tu
            organización
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  className="text-xs sm:text-sm text-epoch-primary/80"
                  htmlFor="firstName"
                >
                  Nombre
                </Label>
                <Input
                  className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label
                  className="text-xs sm:text-sm text-epoch-primary/80"
                  htmlFor="lastName"
                >
                  Apellido
                </Label>
                <Input
                  className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                className="text-xs sm:text-sm text-epoch-primary/80"
                htmlFor="email"
              >
                Email *
              </Label>
              <Input
                required
                className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label
                className="text-xs sm:text-sm text-epoch-primary/80"
                htmlFor="role"
              >
                Rol *
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => {
                  setFormData({ ...formData, role: value, branch_id: "" });
                }}
              >
                <SelectTrigger className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {getAllowedRoles().map((roleOption) => (
                    <SelectItem key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs sm:text-sm text-epoch-primary/70 mt-1">
                {formData.role === "employee"
                  ? "Acceso operativo sin permisos de administración"
                  : formData.role === "vendedor"
                    ? "Acceso a ventas y citas en la sucursal asignada"
                    : formData.role === "admin"
                      ? "Acceso completo a una sucursal"
                      : formData.role === "super_admin"
                        ? "Acceso completo a todas las sucursales de la organización"
                        : ""}
              </p>
            </div>

            {requiresBranch && (
              <div className="space-y-2">
                <Label
                  className="text-xs sm:text-sm text-epoch-primary/80"
                  htmlFor="branch_id"
                >
                  Sucursal {branches.length > 0 ? "*" : ""}
                </Label>
                {loadingBranches ? (
                  <div className="flex items-center gap-2 p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs sm:text-sm text-epoch-primary/70">
                      Cargando sucursales...
                    </span>
                  </div>
                ) : branches.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No hay sucursales disponibles. El usuario puede ser
                      asignado a una sucursal después de la creación.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select
                    value={formData.branch_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, branch_id: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]">
                      <SelectValue placeholder="Seleccionar sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} ({branch.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label
                className="text-xs sm:text-sm text-epoch-primary/80"
                htmlFor="password"
              >
                Contraseña *
              </Label>
              <div className="relative">
                <Input
                  required
                  className="pr-12 rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                  id="password"
                  minLength={8}
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <Button
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent min-h-[44px] min-w-[44px]"
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-epoch-primary/70" />
                  ) : (
                    <Eye className="h-4 w-4 text-epoch-primary/70" />
                  )}
                </Button>
              </div>
              <p className="text-xs sm:text-sm text-epoch-primary/70 mt-1">
                Mínimo 8 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label
                className="text-xs sm:text-sm text-epoch-primary/80"
                htmlFor="confirmPassword"
              >
                Confirmar Contraseña *
              </Label>
              <div className="relative">
                <Input
                  required
                  className="pr-12 rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                  id="confirmPassword"
                  minLength={8}
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
                <Button
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent min-h-[44px] min-w-[44px]"
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-epoch-primary/70" />
                  ) : (
                    <Eye className="h-4 w-4 text-epoch-primary/70" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button
                className="rounded-xl border-epoch-primary/20 min-h-[44px] w-full sm:w-auto order-2 sm:order-1"
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
              <Button
                className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase min-h-[44px] w-full sm:w-auto order-1 sm:order-2"
                disabled={loading}
                type="submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Registrar Usuario
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

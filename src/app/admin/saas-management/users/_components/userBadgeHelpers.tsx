import { CheckCircle2, Crown, Shield, User, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function getRoleBadge(role: string) {
  const colors: Record<string, string> = {
    root: "bg-red-100 text-red-800",
    dev: "bg-orange-100 text-orange-800",
    super_admin: "bg-purple-100 text-purple-800",
    admin: "bg-blue-100 text-blue-800",
    employee: "bg-gray-100 text-gray-800",
    vendedor: "bg-green-100 text-green-800",
  };

  const icons: Record<string, typeof Shield> = {
    root: Shield,
    dev: Shield,
    super_admin: Crown,
    admin: User,
    employee: User,
    vendedor: User,
  };

  const Icon = icons[role] || User;

  return (
    <Badge className={colors[role] || colors.admin}>
      <Icon className="h-3 w-3 mr-1" />
      {role === "root"
        ? "Root"
        : role === "dev"
          ? "Dev"
          : role === "super_admin"
            ? "Super Admin"
            : role === "admin"
              ? "Admin"
              : role === "vendedor"
                ? "Vendedor"
                : role === "employee"
                  ? "Empleado"
                  : role}
    </Badge>
  );
}

export function getActiveBadge(is_active: boolean) {
  return is_active ? (
    <Badge variant="default">
      <CheckCircle2 className="h-3 w-3 mr-1" />
      Activo
    </Badge>
  ) : (
    <Badge variant="secondary">
      <XCircle className="h-3 w-3 mr-1" />
      Inactivo
    </Badge>
  );
}

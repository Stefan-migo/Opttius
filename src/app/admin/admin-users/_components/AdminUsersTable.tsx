import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Crown,
  Edit,
  Eye,
  Globe,
  MoreVertical,
  Phone,
  Shield,
  Trash2,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTimeAgo } from "@/lib/utils";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  permissions: Record<string, string[]>;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  is_super_admin?: boolean;
  branches?: Array<{
    id: string;
    name: string;
    code: string;
    is_primary: boolean;
  }>;
  profiles?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  analytics?: {
    activityCount30Days: number;
    lastActivity?: string;
    fullName?: string;
  };
}

interface AdminUsersTableProps {
  adminUsers: AdminUser[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
  isSuperAdmin: boolean;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string, email: string) => void;
  onPermissionsEdit: (user: AdminUser) => void;
}

function getRoleBadge(admin: AdminUser) {
  if (admin.is_super_admin || admin.role === "super_admin") {
    return (
      <Badge className="flex items-center gap-1 bg-epoch-accent text-epoch-primary" variant="default">
        <Globe className="h-3 w-3" />
        Super Administrador
      </Badge>
    );
  }
  if (admin.role === "vendedor") {
    return (
      <Badge className="flex items-center gap-1" variant="secondary">
        <User className="h-3 w-3" />
        Vendedor
      </Badge>
    );
  }
  if (admin.role === "employee") {
    return (
      <Badge className="flex items-center gap-1" variant="secondary">
        <User className="h-3 w-3" />
        Empleado
      </Badge>
    );
  }
  return (
    <Badge className="flex items-center gap-1" variant="default">
      <Crown className="h-3 w-3" />
      Administrador
    </Badge>
  );
}

function getStatusBadge(isActive: boolean) {
  return <Badge variant={isActive ? "default" : "outline"}>{isActive ? "Activo" : "Inactivo"}</Badge>;
}

function formatLastActivity(dateString?: string) {
  if (!dateString) return "Nunca";
  return formatTimeAgo(dateString, "es-AR");
}

export function AdminUsersTable({
  adminUsers,
  loading,
  totalCount,
  currentPage,
  itemsPerPage,
  isSuperAdmin,
  onPageChange,
  onItemsPerPageChange,
  onToggleStatus,
  onDelete,
  onPermissionsEdit,
}: AdminUsersTableProps) {
  return (
    <Card className="rounded-xl border border-border">
      <CardHeader className="p-4 sm:p-6 pb-0">
        <CardTitle className="flex items-center gap-2 font-display text-epoch-primary text-base sm:text-lg">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          Usuarios Administradores ({totalCount})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-4">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última Actividad</TableHead>
                <TableHead>Actividad (30d)</TableHead>
                <TableHead>Fecha Registro</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((admin) => (
                <TableRow className="hover:bg-[#AE000025] transition-colors" key={admin.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-epoch-primary text-sm">
                        {admin.analytics?.fullName || "Sin nombre"}
                      </div>
                      <div className="text-xs sm:text-sm text-epoch-primary/70">
                        {admin.email}
                      </div>
                      {admin.profiles?.phone && (
                        <div className="flex items-center text-[10px] sm:text-xs text-epoch-primary/70 mt-1">
                          <Phone className="h-3 w-3 mr-1 shrink-0" />
                          {admin.profiles.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(admin)}</TableCell>
                  <TableCell>
                    {admin.is_super_admin ? (
                      <Badge className="flex items-center gap-1 w-fit" variant="outline">
                        <Globe className="h-3 w-3" />
                        Todas las sucursales
                      </Badge>
                    ) : admin.branches && admin.branches.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {admin.branches.slice(0, 2).map((branch) => (
                          <Badge className="flex items-center gap-1 w-fit text-xs" key={branch.id} variant="outline">
                            <Building2 className="h-3 w-3" />
                            {branch.name}
                            {branch.is_primary && <span className="text-epoch-accent">★</span>}
                          </Badge>
                        ))}
                        {admin.branches.length > 2 && (
                          <span className="text-[10px] sm:text-xs text-epoch-primary/70">
                            +{admin.branches.length - 2} más
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm text-epoch-primary/70">Sin sucursales</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(admin.is_active)}</TableCell>
                  <TableCell>
                    <div className="flex items-center text-xs sm:text-sm text-epoch-primary/70">
                      <Clock className="h-3 w-3 mr-1 shrink-0" />
                      {formatLastActivity(admin.last_login)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className="font-medium text-epoch-primary text-sm">
                        {admin.analytics?.activityCount30Days || 0}
                      </div>
                      <div className="text-[10px] sm:text-xs text-epoch-primary/70">acciones</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm text-epoch-primary/70">
                    {formatDate(admin.created_at, { locale: "es-AR" })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="h-8 w-8 p-0 min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8" size="sm" variant="ghost">
                          <span className="sr-only">Abrir menú</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link className="flex items-center cursor-pointer" href={`/admin/admin-users/${admin.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> Ver detalles
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link className="flex items-center cursor-pointer" href={`/admin/admin-users/${admin.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => onPermissionsEdit(admin)}>
                          <Shield className="mr-2 h-4 w-4" /> Editar Permisos
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {isSuperAdmin && (
                          <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => onToggleStatus(admin.id, admin.is_active)}>
                            {admin.is_active ? (
                              <><AlertTriangle className="mr-2 h-4 w-4 text-red-500" /> Desactivar</>
                            ) : (
                              <><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Activar</>
                            )}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="flex items-center cursor-pointer text-red-500 focus:text-red-500" onClick={() => onDelete(admin.id, admin.email)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {!loading && adminUsers.length > 0 && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={[10, 20, 50, 100]}
              totalItems={totalCount}
              totalPages={Math.ceil(totalCount / itemsPerPage)}
              onItemsPerPageChange={onItemsPerPageChange}
              onPageChange={onPageChange}
            />
          </div>
        )}

        {adminUsers.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <Users className="h-10 w-10 sm:h-12 sm:w-12 text-epoch-primary/40 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-epoch-primary mb-2">
              No se encontraron administradores
            </h3>
            <p className="text-sm text-epoch-primary/80">
              Ajusta los filtros o crea un nuevo administrador.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

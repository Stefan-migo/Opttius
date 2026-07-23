"use client";

import {
  Building2,
  CheckCircle2,
  Eye,
  Loader2,
  MapPin,
  MoreVertical,
  Trash2,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

import type { User } from "./types";
import { getActiveBadge, getRoleBadge } from "./userBadgeHelpers";

interface UsersTableProps {
  users: User[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewUser: (userId: string) => void;
  onActivate: (userId: string) => void;
  onDeactivate: (userId: string) => void;
  onChangeOrgClick: (user: User) => void;
  onResetPassword: (userId: string) => void;
  onDeleteClick: (user: User) => void;
}

export function UsersTable({
  users,
  loading,
  error,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  onViewUser,
  onActivate,
  onDeactivate,
  onChangeOrgClick,
  onResetPassword,
  onDeleteClick,
}: UsersTableProps) {
  return (
    <Card className="admin-card">
      <CardHeader>
        <CardTitle>Usuarios ({totalCount})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No se encontraron usuarios
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Organización</TableHead>
                    <TableHead>Sucursales</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.fullName || user.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.organization ? (
                          <div>
                            <div className="font-medium">
                              {user.organization.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {user.organization.slug}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">
                            Sin organización
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.branches && user.branches.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{user.branches.length}</span>
                          </div>
                        ) : user.is_super_admin ? (
                          <Badge variant="outline">Todas</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getActiveBadge(user.is_active)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {user.last_login
                          ? formatDate(user.last_login)
                          : "Nunca"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => onViewUser(user.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.is_active ? (
                              <DropdownMenuItem
                                onClick={() => onDeactivate(user.id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Desactivar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => onActivate(user.id)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Activar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => onChangeOrgClick(user)}
                            >
                              <Building2 className="h-4 w-4 mr-2" />
                              Cambiar organización
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onResetPassword(user.id)}
                            >
                              Resetear contraseña
                            </DropdownMenuItem>
                            {user.role !== "root" && user.role !== "dev" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => onDeleteClick(user)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={currentPage === 1}
                    size="sm"
                    variant="outline"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    disabled={currentPage === totalPages}
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onPageChange(Math.min(totalPages, currentPage + 1))
                    }
                  >
                    Siguiente
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

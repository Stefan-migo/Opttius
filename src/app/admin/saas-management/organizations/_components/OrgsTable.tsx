"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
  MapPin,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

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

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  status: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
  stats?: {
    activeUsers: number;
    branches: number;
  };
  subscriptions?: Array<{
    id: string;
    status: string;
    current_period_start?: string;
    current_period_end?: string;
  }>;
  owner?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface OrgsTableProps {
  organizations: Organization[];
  loading: boolean;
  error: string | null;
  selectedOrgs: Set<string>;
  onSelectOrg: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onAction: (
    orgId: string,
    action: "suspend" | "activate" | "cancel" | "change_tier",
    value?: string,
  ) => void;
  onDeleteClick: (org: Organization) => void;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    active: "default",
    suspended: "secondary",
    cancelled: "destructive",
  };
  const icons: Record<string, typeof CheckCircle2> = {
    active: CheckCircle2,
    suspended: Pause,
    cancelled: XCircle,
  };
  const Icon = icons[status] || CheckCircle2;
  return (
    <Badge variant={variants[status] || "default"}>
      <Icon className="h-3 w-3 mr-1" />
      {status === "active" ? "Activa" : status === "suspended" ? "Suspendida" : "Cancelada"}
    </Badge>
  );
}

function getTierBadge(tier: string) {
  const colors: Record<string, string> = {
    basic: "bg-gray-100 text-gray-800",
    pro: "bg-blue-100 text-blue-800",
    premium: "bg-purple-100 text-purple-800",
  };
  return (
    <Badge className={colors[tier] || colors.basic}>
      {tier === "basic" ? "Básico" : tier === "pro" ? "Pro" : tier === "premium" ? "Premium" : tier}
    </Badge>
  );
}

export default function OrgsTable({
  organizations,
  loading,
  error,
  selectedOrgs,
  onSelectOrg,
  onSelectAll,
  onAction,
  onDeleteClick,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
}: OrgsTableProps) {
  const router = useRouter();

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">
          Organizaciones ({totalCount})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#C5A059]" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">{error}</div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            No se encontraron organizaciones
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="w-12 text-white/70">
                      <input
                        checked={
                          selectedOrgs.size === organizations.length &&
                          organizations.length > 0
                        }
                        type="checkbox"
                        onChange={(e) => onSelectAll(e.target.checked)}
                      />
                    </TableHead>
                    <TableHead className="text-white/70">
                      Organización
                    </TableHead>
                    <TableHead className="text-white/70">Tier</TableHead>
                    <TableHead className="text-white/70">Estado</TableHead>
                    <TableHead className="text-white/70">Usuarios</TableHead>
                    <TableHead className="text-white/70">
                      Sucursales
                    </TableHead>
                    <TableHead className="text-white/70">Owner</TableHead>
                    <TableHead className="text-white/70">Creada</TableHead>
                    <TableHead className="text-right text-white/70">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow
                      key={org.id}
                      className="border-white/10 hover:bg-white/5"
                    >
                      <TableCell>
                        <input
                          checked={selectedOrgs.has(org.id)}
                          type="checkbox"
                          onChange={(e) =>
                            onSelectOrg(org.id, e.target.checked)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">
                            {org.name}
                          </div>
                          <div className="text-sm text-white/40">
                            {org.slug}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTierBadge(org.subscription_tier)}</TableCell>
                      <TableCell>{getStatusBadge(org.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-white/70">
                          <Users className="h-4 w-4" />
                          {org.stats?.activeUsers || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-white/70">
                          <MapPin className="h-4 w-4" />
                          {org.stats?.branches || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        {org.owner ? (
                          <div>
                            <div className="text-sm text-white">
                              {org.owner.first_name} {org.owner.last_name}
                            </div>
                            <div className="text-xs text-white/40">
                              {org.owner.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-white/40">Sin owner</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-white/50">
                        {formatDate(org.created_at)}
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
                              onClick={() =>
                                router.push(
                                  `/admin/saas-management/organizations/${org.id}`,
                                )
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {org.status === "active" ? (
                              <DropdownMenuItem
                                onClick={() => onAction(org.id, "suspend")}
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                Suspender
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => onAction(org.id, "activate")}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Activar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                onAction(org.id, "change_tier", "basic")
                              }
                            >
                              Cambiar a Básico
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onAction(org.id, "change_tier", "pro")
                              }
                            >
                              Cambiar a Pro
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onAction(org.id, "change_tier", "premium")
                              }
                            >
                              Cambiar a Premium
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => onDeleteClick(org)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar Organización
                            </DropdownMenuItem>
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

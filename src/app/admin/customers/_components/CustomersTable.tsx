"use client";

import {
  AlertTriangle,
  CheckCircle,
  Edit,
  Eye,
  Mail,
  Phone,
  Users,
} from "lucide-react";
import Link from "next/link";

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
import type { Customer } from "@/lib/api/services/customerService";

interface CustomersTableProps {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  onRetry: () => void;
  onPageChange: (page: number) => void;
}

export function CustomersTable({
  customers,
  loading,
  error,
  currentPage,
  totalPages,
  onRetry,
  onPageChange,
}: CustomersTableProps) {
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);

  if (error) {
    return (
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardContent className="text-center py-16">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">
            Error al cargar clientes
          </h3>
          <p className="text-admin-text-tertiary mb-4">{error}</p>
          <Button onClick={onRetry}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Lista de Clientes ({customers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>RUT</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 && !loading ? (
                <TableRow>
                  <TableCell className="text-center py-12" colSpan={6}>
                    <Users className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-admin-text-primary mb-2">
                      No se encontraron clientes
                    </h3>
                    <p className="text-admin-text-tertiary">
                      Ajusta los filtros o agrega nuevos clientes.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow
                    className="hover:bg-[#AE000025] transition-colors"
                    key={customer.id}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {customer.first_name && customer.last_name
                            ? `${customer.first_name} ${customer.last_name}`
                            : customer.first_name ||
                              customer.last_name ||
                              "Sin nombre"}
                        </div>
                        {customer.email && (
                          <div className="text-sm text-admin-text-tertiary">
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1 text-admin-text-tertiary" />
                            <span className="text-admin-text-tertiary">
                              {customer.email}
                            </span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1 text-admin-text-tertiary" />
                            <span className="text-admin-text-tertiary">
                              {customer.phone}
                            </span>
                          </div>
                        )}
                        {!customer.email && !customer.phone && (
                          <span className="text-xs text-admin-text-tertiary">
                            Sin contacto
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {customer.rut ? (
                        <span className="text-sm">{customer.rut}</span>
                      ) : (
                        <span className="text-xs text-admin-text-tertiary">
                          -
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {customer.is_active !== false ? (
                          <Badge
                            className="bg-admin-success text-white"
                            style={{ color: "var(--admin-accent-secondary)" }}
                            variant="default"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Inactivo
                          </Badge>
                        )}
                        {customer.is_convenio_client && (
                          <Badge
                            className="border-admin-accent-primary/50 text-admin-accent-primary"
                            variant="outline"
                          >
                            Convenio
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-admin-text-tertiary">
                      {new Date(customer.created_at).toLocaleDateString(
                        "es-AR",
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex space-x-2">
                        <Link href={`/admin/customers/${customer.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </Link>
                        <Link href={`/admin/customers/${customer.id}/edit`}>
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-6 space-x-2">
            <Button
              disabled={currentPage === 1}
              variant="outline"
              onClick={() => onPageChange(currentPage - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-admin-text-tertiary">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              disabled={currentPage === totalPages}
              variant="outline"
              onClick={() => onPageChange(currentPage + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

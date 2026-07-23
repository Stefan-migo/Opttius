"use client";

import { Eye, Users } from "lucide-react";
import Link from "next/link";

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
import type { AgreementCustomer } from "@/lib/api/services/agreementService";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Props {
  customers: AgreementCustomer[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function AgreementCustomersCard({
  customers,
  page,
  totalPages,
  onPageChange,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Clientes del convenio
        </CardTitle>
        <p className="text-sm text-admin-text-tertiary">
          Clientes que han comprado bajo este convenio
        </p>
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <p className="text-admin-text-tertiary py-4">
            Aún no hay clientes que hayan comprado bajo este convenio.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>RUT</TableHead>
                  <TableHead>Órdenes</TableHead>
                  <TableHead>Última compra</TableHead>
                  <TableHead>Total copago</TableHead>
                  <TableHead>Total institucional</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.customer_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {[c.first_name, c.last_name]
                            .filter(Boolean)
                            .join(" ") || "Sin nombre"}
                        </div>
                        {c.email && (
                          <div className="text-sm text-admin-text-tertiary">
                            {c.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-admin-text-tertiary">
                      {c.rut || "-"}
                    </TableCell>
                    <TableCell>{c.order_count}</TableCell>
                    <TableCell className="text-admin-text-tertiary">
                      {formatDate(c.last_order_at)}
                    </TableCell>
                    <TableCell>{formatCurrency(c.total_copago)}</TableCell>
                    <TableCell>
                      {formatCurrency(c.total_institutional)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/customers/${c.customer_id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  disabled={page <= 1}
                  size="sm"
                  variant="outline"
                  onClick={() => onPageChange(page - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-admin-text-tertiary">
                  Página {page} de {totalPages}
                </span>
                <Button
                  disabled={page >= totalPages}
                  size="sm"
                  variant="outline"
                  onClick={() => onPageChange(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

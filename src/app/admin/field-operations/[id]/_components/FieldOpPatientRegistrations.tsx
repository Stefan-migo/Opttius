"use client";

import {
  FilePlus,
  Pencil,
  RefreshCw,
  Stethoscope,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRUT } from "@/lib/utils/rut";
import type { Customer } from "@/lib/api/services/customerService";

interface FieldOpPatientRegistrationsProps {
  customers: Customer[];
  customersLoading: boolean;
  onAddCustomer: () => void;
  operativoReturnUrl: string;
  onPrescription: (customerId: string) => void;
  onQuote: (customerId: string) => void;
  onDeleteCustomer: (customerId: string) => void;
}

export default function FieldOpPatientRegistrations({
  customers,
  customersLoading,
  onAddCustomer,
  operativoReturnUrl,
  onPrescription,
  onQuote,
  onDeleteCustomer,
}: FieldOpPatientRegistrationsProps) {
  return (
    <div className="rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-admin-border-primary/20 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-admin-text-primary font-semibold">
          <Users className="h-5 w-5 shrink-0" />
          Clientes del operativo
        </h3>
        <Button
          className="min-h-[44px] bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23]"
          size="sm"
          onClick={onAddCustomer}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo cliente
        </Button>
      </div>
      <div className="overflow-x-auto">
        {customersLoading ? (
          <div className="p-8 flex justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-admin-text-tertiary" />
          </div>
        ) : customers.length === 0 ? (
          <p className="p-6 text-admin-text-tertiary text-sm">
            No hay clientes vinculados a este operativo. Agregue un cliente
            desde el botón arriba.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-admin-text-tertiary font-semibold">
                  Nombre
                </TableHead>
                <TableHead className="text-admin-text-tertiary font-semibold">
                  Email
                </TableHead>
                <TableHead className="text-admin-text-tertiary font-semibold">
                  Teléfono
                </TableHead>
                <TableHead className="text-admin-text-tertiary font-semibold">
                  RUT
                </TableHead>
                <TableHead className="text-admin-text-tertiary font-semibold">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow className="hover:bg-[#AE000025]" key={c.id}>
                  <TableCell className="font-medium text-admin-text-primary">
                    {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                      "—"}
                  </TableCell>
                  <TableCell className="text-admin-text-tertiary">
                    {c.email || "—"}
                  </TableCell>
                  <TableCell className="text-admin-text-tertiary">
                    {c.phone || "—"}
                  </TableCell>
                  <TableCell className="text-admin-text-tertiary font-mono">
                    {c.rut ? formatRUT(c.rut) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        className="text-admin-accent-primary hover:underline text-sm font-medium"
                        href={`/admin/customers/${c.id}`}
                      >
                        Ver
                      </Link>
                      <button
                        className="inline-flex items-center gap-1 text-admin-text-tertiary hover:text-admin-accent-primary text-sm"
                        title="Nueva receta"
                        type="button"
                        onClick={() => onPrescription(c.id)}
                      >
                        <Stethoscope className="h-4 w-4" />
                      </button>
                      <button
                        className="inline-flex items-center gap-1 text-admin-text-tertiary hover:text-admin-accent-primary text-sm"
                        title="Nuevo presupuesto"
                        type="button"
                        onClick={() => onQuote(c.id)}
                      >
                        <FilePlus className="h-4 w-4" />
                      </button>
                      <Link
                        className="inline-flex items-center gap-1 text-admin-text-tertiary hover:text-admin-accent-primary text-sm"
                        href={`/admin/customers/${c.id}/edit?return_to=${encodeURIComponent(operativoReturnUrl)}`}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        className="inline-flex items-center gap-1 text-admin-text-tertiary hover:text-red-500 text-sm"
                        title="Eliminar"
                        type="button"
                        onClick={() => onDeleteCustomer(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

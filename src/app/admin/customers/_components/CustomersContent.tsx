"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Customer } from "@/lib/api/services/customerService";

import { useCustomers } from "../_hooks/useCustomers";
import { CustomersFilters } from "./CustomersFilters";
import { CustomersStatsCards } from "./CustomersStatsCards";
import { CustomersTable } from "./CustomersTable";

interface CustomersContentProps {
  initialCustomers: Customer[];
  currentBranchId: string | null;
  isSuperAdmin: boolean;
  organizationId: string | null;
}

export default function CustomersContent({
  initialCustomers,
}: CustomersContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fieldOperationIdFromUrl = searchParams.get("field_operation_id");

  const {
    customers,
    stats,
    loading,
    error,
    currentPage,
    totalPages,
    searchTerm,
    statusFilter,
    agreementFilter,
    agreements,
    operativoName,
    isGlobalView,
    currentBranchId,
    branches,
    setSearchTerm,
    setStatusFilter,
    setAgreementFilter,
    setCurrentPage,
    fetchCustomers,
  } = useCustomers(initialCustomers, fieldOperationIdFromUrl);

  if (loading && customers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary">
            Gestión de Clientes
          </h1>
          <p className="text-sm text-admin-text-tertiary">
            Cargando información de clientes...
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card className="animate-pulse" key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Operativo mode banner */}
      {fieldOperationIdFromUrl && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 rounded-xl bg-admin-accent-primary/20 border border-admin-accent-primary/30">
          <span className="text-sm font-medium text-admin-text-primary">
            Clientes del operativo: {operativoName || "..."}
          </span>
          <Link
            className="text-sm text-admin-accent-primary hover:underline font-medium"
            href={`/admin/field-operations/${fieldOperationIdFromUrl}`}
          >
            Volver al operativo
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary">
          Gestión de Clientes
        </h1>
        <p className="text-sm text-admin-text-tertiary">
          {fieldOperationIdFromUrl
            ? "Clientes vinculados a este operativo"
            : "Administra los clientes de tu sucursal"}
        </p>
        <div className="flex justify-end">
          <Button
            className="min-h-[44px]"
            onClick={() =>
              router.push(
                fieldOperationIdFromUrl
                  ? `/admin/customers/new?field_operation_id=${fieldOperationIdFromUrl}`
                  : "/admin/customers/new",
              )
            }
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <CustomersStatsCards
          stats={stats}
          statsLabel={
            isGlobalView
              ? "Todas las sucursales"
              : `Sucursal: ${branches?.find((b) => b.id === currentBranchId)?.name ?? "seleccionada"}`
          }
        />
      )}

      {/* Filters */}
      <CustomersFilters
        agreementFilter={agreementFilter}
        agreements={agreements}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        onAgreementFilterChange={(v) => { setAgreementFilter(v); setCurrentPage(1); }}
        onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
        onSearchKeyDown={(e) => { if (e.key === "Enter") fetchCustomers(); }}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Table */}
      <CustomersTable
        currentPage={currentPage}
        customers={customers}
        error={error}
        loading={loading}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onRetry={fetchCustomers}
      />
    </div>
  );
}

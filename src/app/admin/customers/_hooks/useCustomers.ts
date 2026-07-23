"use client";

import { useEffect, useState } from "react";

import { useBranch } from "@/hooks/useBranch";
import { agreementService } from "@/lib/api/services/agreementService";
import { Customer, customerService } from "@/lib/api/services/customerService";
import { handleApiError } from "@/lib/api/services/errorService";
import { appLogger } from '@/lib/logger';

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
}

export function useCustomers(initialCustomers: Customer[], fieldOperationIdFromUrl: string | null) {
  const { currentBranchId, isSuperAdmin, branches } = useBranch();
  const isGlobalView = !currentBranchId && isSuperAdmin;
  const [operativoName, setOperativoName] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [agreementFilter, setAgreementFilter] = useState<string>("all");
  const [agreements, setAgreements] = useState<{ id: string; name: string }[]>(
    [],
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!fieldOperationIdFromUrl) {
      setOperativoName(null);
      return;
    }
    fetch(`/api/admin/field-operations/${fieldOperationIdFromUrl}`)
      .then((r) => r.json())
      .then((j) => setOperativoName(j?.data?.fieldOperation?.name ?? null))
      .catch(() => setOperativoName(null));
  }, [fieldOperationIdFromUrl]);

  useEffect(() => {
    agreementService
      .getAgreements({
        status: "active",
        branchId: currentBranchId || undefined,
      })
      .then((r) =>
        setAgreements(r.data.map((a) => ({ id: a.id, name: a.name }))),
      )
      .catch(() => setAgreements([]));
  }, [currentBranchId]);

  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, [
    currentPage,
    statusFilter,
    agreementFilter,
    currentBranchId,
    isGlobalView,
    debouncedSearchTerm,
    fieldOperationIdFromUrl,
  ]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, pagination } = await customerService.getCustomers({
        page: currentPage,
        limit: 20,
        search: debouncedSearchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        agreementId: agreementFilter !== "all" ? agreementFilter : undefined,
        branchId: currentBranchId || undefined,
        isGlobalView,
        isSuperAdmin,
        fieldOperationId: fieldOperationIdFromUrl || undefined,
      });
      setCustomers(data);
      setTotalPages(pagination.totalPages || 1);
      setError(null);
    } catch (err) {
      appLogger.error("Error fetching customers:", err);
      const errorObj = handleApiError(err, "Customers List");
      setError(errorObj?.message || "Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await customerService.getCustomerStats(
        currentBranchId || undefined,
        isGlobalView,
        isSuperAdmin,
      );
      setStats(statsData);
    } catch (err) {
      appLogger.error("Error fetching customer stats:", err);
      handleApiError(err, "Customer Stats");
    }
  };

  return {
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
    isSuperAdmin,
    currentBranchId,
    branches,
    setSearchTerm,
    setStatusFilter,
    setAgreementFilter,
    setCurrentPage,
    fetchCustomers,
  };
}

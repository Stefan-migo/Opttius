"use client";

import { useEffect, useState } from "react";

import { customerService } from "@/lib/api/services";

export function useCustomerSelection(
  effectiveBranchId: string | undefined,
  initialFieldOperationId: string | undefined,
  initialCustomerId?: string,
) {
  // Customer selection
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<unknown[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<unknown>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // Load initial customer
  useEffect(() => {
    if (
      initialCustomerId &&
      (!selectedCustomer ||
        (selectedCustomer as unknown).id !== initialCustomerId)
    ) {
      fetchCustomer(initialCustomerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCustomerId]);

  const fetchCustomer = async (customerId: string) => {
    try {
      const customer = await customerService.getCustomer(customerId);
      setSelectedCustomer(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
    }
  };

  // Search customers
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.length < 2) {
        setCustomerResults([]);
        return;
      }
      setSearchingCustomers(true);
      try {
        const customers = await customerService.searchCustomers(
          customerSearch,
          effectiveBranchId,
          initialFieldOperationId,
        );
        setCustomerResults(customers || []);
      } catch (error) {
        console.error("Error searching customers:", error);
      } finally {
        setSearchingCustomers(false);
      }
    };
    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [customerSearch, effectiveBranchId, initialFieldOperationId]);

  return {
    customerSearch,
    setCustomerSearch,
    customerResults,
    setCustomerResults,
    selectedCustomer,
    setSelectedCustomer,
    searchingCustomers,
    fetchCustomer,
  };
}

/**
 * usePOSCustomer - Hook para gestión de clientes en el POS
 * Extraído de page.tsx para mejorar modularidad
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { searchCustomers } from "@/lib/api/services";

import type { POSCustomer } from "../types";

interface UsePOSCustomerProps {
  branchId?: string | null;
  fieldOperationId?: string | null;
  onCustomerSelect?: (customer: POSCustomer | null) => void;
  onQuotesFetch?: (customerId: string) => void;
}

export function usePOSCustomer({
  branchId,
  fieldOperationId,
  onCustomerSelect,
  onQuotesFetch,
}: UsePOSCustomerProps = {}) {
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<POSCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomer | null>(
    null,
  );
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [rut, setRut] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search customers with debounce
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const searchResults = await searchCustomers(
          searchTerm,
          branchId || undefined,
          fieldOperationId || undefined,
        );
        // Map to POSCustomer
        const mappedResults: typeof results = (searchResults || []).map(
          (c) => ({
            id: c.id,
            email: c.email,
            first_name: c.first_name,
            last_name: c.last_name,
            name: c.name,
            rut: c.rut,
            business_name: undefined,
            address: undefined,
            phone: c.phone,
            is_convenio_client: undefined,
          }),
        );
        setResults(mappedResults);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Error searching customers:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, branchId, fieldOperationId]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelectCustomer(results[selectedIndex]);
        } else if (results.length > 0) {
          handleSelectCustomer(results[0]);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Escape") {
        setResults([]);
        setSearchTerm("");
        setSelectedIndex(-1);
      }
    },
    [selectedIndex, results],
  );

  // Select customer
  const handleSelectCustomer = useCallback(
    (customer: POSCustomer) => {
      // Build full name from first_name + last_name if name is not set
      const fullName =
        customer.name ||
        (customer.first_name && customer.last_name
          ? `${customer.first_name} ${customer.last_name}`.trim()
          : customer.first_name || customer.email || "");

      setSelectedCustomer({
        ...customer,
        name: fullName, // Ensure name is always set
      });
      setSearchTerm(fullName);
      setResults([]);
      setSelectedIndex(-1);
      setBusinessName(customer.business_name || "");
      setRut(customer.rut || "");
      onCustomerSelect?.(customer);
      onQuotesFetch?.(customer.id);
    },
    [onCustomerSelect, onQuotesFetch],
  );

  // Clear customer selection
  const clearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setSearchTerm("");
    setResults([]);
    setSelectedIndex(-1);
    setBusinessName("");
    setRut("");
    setEmail("");
    setPhone("");
    onCustomerSelect?.(null);
  }, [onCustomerSelect]);

  // Update search term and clear selection if empty (but only if no customer is selected)
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      setSelectedIndex(-1);
      // Only clear customer if search is empty AND no customer is currently selected
      if (value.trim().length === 0 && !selectedCustomer) {
        clearCustomer();
      }
    },
    [clearCustomer, selectedCustomer],
  );

  return {
    // States
    searchTerm,
    setSearchTerm: handleSearchChange,
    results,
    selectedCustomer,
    selectedIndex,
    loading,
    businessName,
    setBusinessName,
    rut,
    setRut,
    email,
    setEmail,
    phone,
    setPhone,

    // Refs
    searchInputRef,
    suggestionsRef,

    // Methods
    handleSelectCustomer,
    handleKeyDown,
    clearCustomer,

    // Helpers
    hasResults: results.length > 0,
    isSearching: loading && searchTerm.trim().length >= 2,
  };
}

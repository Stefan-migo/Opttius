import { useState, useEffect, useCallback } from "react";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import { Customer, Prescription, Frame } from "../types/quote.types";

export function useCustomerSearch() {
  const { currentBranchId } = useBranch();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);

  const searchCustomers = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/customers/search?q=${encodeURIComponent(query)}&branch_id=${currentBranchId}`,
          {
            headers: getBranchHeader(currentBranchId),
          },
        );

        if (response.ok) {
          const data = await response.json();
          setResults(data.customers || []);
        }
      } catch (error) {
        console.error("Error searching customers:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [currentBranchId],
  );

  // Debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchCustomers(search);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [search, searchCustomers]);

  const selectCustomer = (customer: Customer) => {
    setSelected(customer);
    setSearch("");
    setResults([]);
  };

  const clearCustomer = () => {
    setSelected(null);
    setSearch("");
    setResults([]);
  };

  return {
    search,
    setSearch,
    results,
    selected,
    loading,
    selectCustomer,
    clearCustomer,
  };
}

export function usePrescriptionSearch(customerId: string | null) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPrescriptions = useCallback(async () => {
    if (!customerId) {
      setPrescriptions([]);
      setSelected(null);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/customers/${customerId}/prescriptions`,
      );

      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data.prescriptions || []);
      }
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const selectPrescription = (prescription: Prescription) => {
    setSelected(prescription);
  };

  const clearPrescription = () => {
    setSelected(null);
  };

  return {
    prescriptions,
    selected,
    loading,
    selectPrescription,
    clearPrescription,
    refetch: fetchPrescriptions,
  };
}

export function useFrameSearch() {
  const { currentBranchId } = useBranch();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Frame[]>([]);
  const [selected, setSelected] = useState<Frame | null>(null);
  const [loading, setLoading] = useState(false);

  const searchFrames = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/products/search?q=${encodeURIComponent(query)}&type=frames&branch_id=${currentBranchId}`,
        );

        if (response.ok) {
          const data = await response.json();
          setResults(data.products || []);
        }
      } catch (error) {
        console.error("Error searching frames:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [currentBranchId],
  );

  // Debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchFrames(search);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [search, searchFrames]);

  const selectFrame = (frame: Frame) => {
    setSelected(frame);
    setSearch("");
    setResults([]);
  };

  const clearFrame = () => {
    setSelected(null);
    setSearch("");
    setResults([]);
  };

  return {
    search,
    setSearch,
    results,
    selected,
    loading,
    selectFrame,
    clearFrame,
  };
}

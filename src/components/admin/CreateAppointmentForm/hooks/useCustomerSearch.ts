import { useState, useEffect } from "react";
import { getBranchHeader } from "@/lib/utils/branch";

interface Customer {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  rut?: string;
}

interface GuestCustomerData {
  first_name: string;
  last_name: string;
  rut: string;
  email: string;
  phone: string;
}

interface UseCustomerSearchReturn {
  // Registered customer search
  customerSearch: string;
  setCustomerSearch: (search: string) => void;
  customerResults: Customer[];
  searchingCustomers: boolean;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  clearCustomerSearch: () => void;

  // Guest customer mode
  isGuestCustomer: boolean;
  setIsGuestCustomer: (isGuest: boolean) => void;
  guestCustomerData: GuestCustomerData;
  updateGuestCustomerData: (data: Partial<GuestCustomerData>) => void;
  resetGuestCustomerData: () => void;

  // Validation
  validateCustomer: () => { isValid: boolean; errors: Record<string, string> };
}

interface UseCustomerSearchProps {
  initialData?: any;
  initialCustomerId?: string;
  /** Sucursal actual para filtrar clientes. Obligatorio para admins no super. */
  currentBranchId?: string | null;
}

export function useCustomerSearch({
  initialData,
  initialCustomerId,
  currentBranchId,
}: UseCustomerSearchProps = {}): UseCustomerSearchReturn {
  // Registered customer search
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    initialData?.customer || null,
  );
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // Guest customer mode
  const [isGuestCustomer, setIsGuestCustomer] = useState(
    !initialData?.customer && !initialCustomerId,
  );
  const [guestCustomerData, setGuestCustomerData] = useState<GuestCustomerData>(
    {
      first_name: "",
      last_name: "",
      rut: "",
      email: "",
      phone: "",
    },
  );

  // Search customers with debounce (filtered by branch)
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.length < 1) {
        setCustomerResults([]);
        return;
      }

      setSearchingCustomers(true);
      try {
        const headers = getBranchHeader(currentBranchId ?? null);
        const response = await fetch(
          `/api/admin/customers/search?q=${encodeURIComponent(customerSearch)}`,
          { headers },
        );
        if (response.ok) {
          const data = await response.json();
          // API returns { success: true, data: [...] }
          setCustomerResults(data.data ?? data.customers ?? []);
        }
      } catch (error) {
        console.error("Error searching customers:", error);
      } finally {
        setSearchingCustomers(false);
      }
    };

    const debounceTimer = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounceTimer);
  }, [customerSearch, currentBranchId]);

  // Load customer if initialCustomerId provided
  useEffect(() => {
    const fetchCustomer = async (customerId: string) => {
      try {
        const response = await fetch(`/api/admin/customers/${customerId}`);
        if (response.ok) {
          const data = await response.json();
          setSelectedCustomer(data.data);
        }
      } catch (error) {
        console.error("Error fetching customer:", error);
      }
    };

    if (initialCustomerId && !selectedCustomer) {
      fetchCustomer(initialCustomerId);
    }
  }, [initialCustomerId, selectedCustomer]);

  const clearCustomerSearch = () => {
    setCustomerSearch("");
    setCustomerResults([]);
  };

  const updateGuestCustomerData = (data: Partial<GuestCustomerData>) => {
    setGuestCustomerData((prev) => ({ ...prev, ...data }));
  };

  const resetGuestCustomerData = () => {
    setGuestCustomerData({
      first_name: "",
      last_name: "",
      rut: "",
      email: "",
      phone: "",
    });
  };

  const validateCustomer = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const errors: Record<string, string> = {};

    if (isGuestCustomer) {
      // Validate guest customer data
      if (!guestCustomerData.first_name?.trim()) {
        errors.guest_first_name = "El nombre es obligatorio";
      }
      if (!guestCustomerData.last_name?.trim()) {
        errors.guest_last_name = "El apellido es obligatorio";
      }
      if (!guestCustomerData.rut?.trim()) {
        errors.guest_rut = "El RUT es obligatorio";
      }
    } else {
      // Validate registered customer
      if (!selectedCustomer) {
        errors.customer = "Selecciona un cliente registrado";
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  // Handle toggle between guest and registered customer
  const handleCustomerModeToggle = (isGuest: boolean) => {
    setIsGuestCustomer(isGuest);
    if (isGuest) {
      // Switching to guest mode
      setSelectedCustomer(null);
      clearCustomerSearch();
    } else {
      // Switching to registered mode
      resetGuestCustomerData();
    }
  };

  return {
    // Registered customer search
    customerSearch,
    setCustomerSearch,
    customerResults,
    searchingCustomers,
    selectedCustomer,
    setSelectedCustomer,
    clearCustomerSearch,

    // Guest customer mode
    isGuestCustomer,
    setIsGuestCustomer: handleCustomerModeToggle,
    guestCustomerData,
    updateGuestCustomerData,
    resetGuestCustomerData,

    // Validation
    validateCustomer,
  };
}

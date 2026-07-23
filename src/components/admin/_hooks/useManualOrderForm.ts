"use client";

import { useEffect, useState } from "react";

import { extractDataFromResponse } from "@/lib/api/response-helpers";
import { getBranchHeader } from "@/lib/utils/branch";

import type { OrderItem, ShippingInfo } from "../_components/ManualOrderFormTypes";

export function useCustomerSearch(customerSearch: string, currentBranchId: string | null) {
  const [customerResults, setCustomerResults] = useState<unknown[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [openCustomerSearch, setOpenCustomerSearch] = useState(false);

  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return; }
    const search = async () => {
      setSearchingCustomers(true);
      try {
        const response = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(customerSearch)}`, { headers: getBranchHeader(currentBranchId) });
        if (response.ok) {
          const data = await response.json();
          setCustomerResults(extractDataFromResponse(data));
        }
      } catch (error) { console.error("Error searching customers:", error); }
      finally { setSearchingCustomers(false); }
    };
    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [customerSearch, currentBranchId]);

  return { customerResults, searchingCustomers, openCustomerSearch, setOpenCustomerSearch };
}

export function useProductSearch(productSearch: string) {
  const [productResults, setProductResults] = useState<unknown[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [openProductSearch, setOpenProductSearch] = useState(false);

  useEffect(() => {
    if (productSearch.length < 2) { setProductResults([]); return; }
    const search = async () => {
      setSearchingProducts(true);
      try {
        const response = await fetch(`/api/admin/products/search?q=${encodeURIComponent(productSearch)}`);
        if (response.ok) {
          const data = await response.json();
          setProductResults(extractDataFromResponse(data));
        }
      } catch (error) { console.error("Error searching products:", error); }
      finally { setSearchingProducts(false); }
    };
    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [productSearch]);

  return { productResults, searchingProducts, openProductSearch, setOpenProductSearch };
}

export function useClickOutside(
  setOpenCustomerSearch: (v: boolean) => void,
  setOpenProductSearch: (v: boolean) => void,
) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".customer-search-container")) setOpenCustomerSearch(false);
      if (!target.closest(".product-search-container")) setOpenProductSearch(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setOpenCustomerSearch, setOpenProductSearch]);
}

export function calculateTotal(items: OrderItem[]): { subtotal: number; total: number } {
  const itemsTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  return { subtotal: itemsTotal, total: itemsTotal };
}

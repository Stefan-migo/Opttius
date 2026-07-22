"use client";

import { Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBranchHeader } from "@/lib/utils/branch";

interface CustomerResult {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  rut?: string;
}

interface SelectedCustomer {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
}

interface CustomerSearchFieldProps {
  currentBranchId: string | null;
  value: SelectedCustomer | null;
  onChange: (customer: SelectedCustomer | null) => void;
}

export function CustomerSearchField({
  currentBranchId,
  value,
  onChange,
}: CustomerSearchFieldProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [loading, setLoading] = useState(false);

  const searchCustomers = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      try {
        setLoading(true);
        const params = new URLSearchParams({ q });
        if (currentBranchId) params.set("branch_id", currentBranchId);
        const headers = getBranchHeader(currentBranchId || null);
        const response = await fetch(`/api/admin/customers/search?${params}`, {
          headers,
        });
        if (response.ok) {
          const res = await response.json();
          const list =
            res?.data ?? res?.customers ?? (Array.isArray(res) ? res : []);
          setResults(Array.isArray(list) ? list.slice(0, 15) : []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [currentBranchId],
  );

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(query), 300);
    return () => clearTimeout(t);
  }, [query, searchCustomers]);

  if (value) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-xl bg-epoch-background">
        <div>
          <div className="font-medium">
            {value.first_name} {value.last_name}
          </div>
          <div className="text-sm text-gray-600">{value.email}</div>
        </div>
        <Button
          className="rounded-xl border-admin-border-primary/20"
          size="sm"
          type="button"
          variant="outline"
          onClick={() => onChange(null)}
        >
          <X className="h-4 w-4 mr-1" />
          Cambiar
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        className="pl-10 rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
        placeholder="Buscar por nombre, RUT o email..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            </div>
          ) : results.length > 0 ? (
            results.map((c) => (
              <button
                className="w-full text-left p-3 hover:bg-gray-100 border-b last:border-b-0"
                key={c.id}
                type="button"
                onClick={() => {
                  onChange({
                    id: c.id,
                    first_name: c.first_name,
                    last_name: c.last_name,
                    email: c.email,
                  });
                  setQuery("");
                  setResults([]);
                }}
              >
                <div className="font-medium">
                  {c.first_name} {c.last_name}
                </div>
                <div className="text-sm text-gray-600">
                  {c.email}
                  {c.rut ? ` • RUT: ${c.rut}` : ""}
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              No se encontraron clientes
            </div>
          )}
        </div>
      )}
    </div>
  );
}

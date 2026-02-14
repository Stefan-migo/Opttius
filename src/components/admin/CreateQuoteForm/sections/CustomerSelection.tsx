import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, Loader2, X } from "lucide-react";
import { useCustomerSearch } from "../hooks";
import { Customer } from "../types/quote.types";

interface CustomerSelectionProps {
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer) => void;
  onCustomerClear: () => void;
  disabled?: boolean;
  initialCustomerId?: string;
}

export function CustomerSelection({
  selectedCustomer,
  onCustomerSelect,
  onCustomerClear,
  disabled = false,
  initialCustomerId,
}: CustomerSelectionProps) {
  const {
    search,
    setSearch,
    results,
    loading,
    selected,
    selectCustomer,
    clearCustomer,
  } = useCustomerSearch(initialCustomerId);

  // When customer is loaded from initialCustomerId, notify parent
  useEffect(() => {
    if (selected && !selectedCustomer) {
      onCustomerSelect(selected);
    }
  }, [selected, selectedCustomer, onCustomerSelect]);

  const handleSelect = (customer: Customer) => {
    selectCustomer(customer);
    onCustomerSelect(customer);
  };

  const handleClear = () => {
    clearCustomer();
    onCustomerClear();
  };

  if (selectedCustomer && !disabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="flex items-center justify-between p-4 border rounded-lg bg-admin-bg-secondary"
            style={{ backgroundColor: "var(--admin-border-primary)" }}
          >
            <div>
              <div className="font-medium">
                {selectedCustomer.first_name} {selectedCustomer.last_name}
              </div>
              <div className="text-sm text-tierra-media">
                {selectedCustomer.email}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
            >
              <X className="h-4 w-4 mr-2" />
              Cambiar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="h-5 w-5 mr-2" />
          Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-tierra-media" />
          <Input
            placeholder="Buscar cliente por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            disabled={disabled}
          />
          {search.length >= 2 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </div>
              ) : results.length > 0 ? (
                results.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 hover:bg-gray-100 cursor-pointer border-b"
                    onClick={() => handleSelect(customer)}
                  >
                    <div className="font-medium">
                      {customer.first_name} {customer.last_name}
                    </div>
                    <div className="text-sm text-tierra-media space-y-1">
                      {customer.email && <div>{customer.email}</div>}
                      {customer.rut && <div>RUT: {customer.rut}</div>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-tierra-media">
                  No se encontraron clientes
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { Mail, Phone, Search, User } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { extractDataFromResponse } from "@/lib/api/response-helpers";

import type { Customer } from "./types";

interface CustomerSearchCardProps {
  email: string;
  name: string;
  onSelect: (customer: Customer) => void;
  onChangeEmail: (email: string) => void;
  onChangeName: (name: string) => void;
}

export function CustomerSearchCard({
  email,
  name,
  onSelect,
  onChangeEmail,
  onChangeName,
}: CustomerSearchCardProps) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  useEffect(() => {
    if (customerSearch.length >= 3) {
      searchCustomers();
    } else {
      setCustomers([]);
    }
  }, [customerSearch]);

  const searchCustomers = async () => {
    try {
      setSearching(true);
      const response = await fetch(
        `/api/admin/customers?search=${encodeURIComponent(customerSearch)}&limit=10`,
      );
      if (response.ok) {
        const data = await response.json();
        setCustomers(extractDataFromResponse(data));
      }
    } catch (err) {
      console.error("Error searching customers:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    onSelect(customer);
    setCustomerSearch(
      `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
        customer.email,
    );
    setCustomers([]);
  };

  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="h-5 w-5 mr-2" />
          Información del Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
            Buscar Cliente
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-admin-text-tertiary h-4 w-4" />
            <Input
              className="pl-10"
              placeholder="Buscar por nombre o email..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
          </div>
          {searching && (
            <p className="text-sm text-admin-text-tertiary mt-2">
              Buscando clientes...
            </p>
          )}
          {customers.length > 0 && (
            <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
              {customers.map((customer) => (
                <button
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelect(customer)}
                >
                  <div className="font-medium">
                    {customer.first_name && customer.last_name
                      ? `${customer.first_name} ${customer.last_name}`
                      : customer.email}
                  </div>
                  <div className="text-sm text-admin-text-tertiary">
                    {customer.email}
                  </div>
                  {customer.is_member && (
                    <div className="text-xs text-admin-success">
                      Miembro {customer.membership_tier}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
            Email del Cliente <span className="text-red-500">*</span>
          </label>
          <Input
            required
            placeholder="cliente@ejemplo.com"
            type="email"
            value={email}
            onChange={(e) => onChangeEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
            Nombre del Cliente
          </label>
          <Input
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
          />
        </div>

        {selectedCustomer && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">
              Cliente Seleccionado:
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                {selectedCustomer.email}
              </div>
              {selectedCustomer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  {selectedCustomer.phone}
                </div>
              )}
              {selectedCustomer.is_member && (
                <div className="text-admin-success font-medium">
                  Miembro {selectedCustomer.membership_tier}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, X, Loader2 } from "lucide-react";
import type { POSCustomer } from "../types";

interface POSCustomerSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  results: POSCustomer[];
  loading: boolean;
  selectedCustomer: POSCustomer | null;
  selectedIndex: number;
  onSelectCustomer: (customer: POSCustomer) => void;
  onHoverResult?: (index: number) => void;
  onClearCustomer: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  customerBusinessName: string;
  onBusinessNameChange: (value: string) => void;
  customerRUT: string;
  onRUTChange: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  suggestionsRef?: React.RefObject<HTMLDivElement | null>;
  quotesCount?: number;
}

export function POSCustomerSearch({
  searchTerm,
  onSearchChange,
  results,
  loading,
  selectedCustomer,
  selectedIndex,
  onSelectCustomer,
  onHoverResult,
  onClearCustomer,
  onKeyDown,
  customerBusinessName,
  onBusinessNameChange,
  customerRUT,
  onRUTChange,
  inputRef,
  suggestionsRef,
  quotesCount = 0,
}: POSCustomerSearchProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef as React.Ref<HTMLInputElement>}
          placeholder="Buscar cliente (nombre, email, teléfono, RUT)..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="pl-10"
          autoComplete="off"
        />
      </div>

      {searchTerm.trim().length > 0 && (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg border">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && results.length > 0 && (
            <div
              ref={suggestionsRef as React.Ref<HTMLDivElement>}
              className="max-h-60 overflow-y-auto border rounded-lg bg-white dark:bg-gray-900 shadow-lg z-20"
            >
              {results.map((customer, index) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => onSelectCustomer(customer)}
                  onMouseEnter={() => onHoverResult?.(index)}
                  className={`w-full p-3 text-left border-b last:border-b-0 flex justify-between items-center transition-colors ${
                    selectedIndex === index
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {customer.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex flex-wrap gap-2">
                      {customer.email && <span>{customer.email}</span>}
                      {customer.phone && <span>Tel: {customer.phone}</span>}
                      {customer.rut && <span>RUT: {customer.rut}</span>}
                    </div>
                  </div>
                  {selectedIndex === index && (
                    <div className="text-xs text-blue-600 ml-2">Enter</div>
                  )}
                </button>
              ))}
            </div>
          )}

          {!loading &&
            !selectedCustomer &&
            searchTerm.trim().length > 0 &&
            results.length === 0 && (
              <div className="border rounded-lg bg-white dark:bg-gray-900 p-3 text-center text-gray-500 text-sm">
                <p>No se encontraron clientes</p>
                <p className="text-xs mt-1">
                  Puedes continuar sin cliente o ingresar datos manualmente
                </p>
              </div>
            )}
        </div>
      )}

      {selectedCustomer ? (
        <div className="space-y-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-green-900 dark:text-green-100">
                {selectedCustomer.name || selectedCustomer.email}
              </div>
              {selectedCustomer.rut && (
                <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                  RUT: {selectedCustomer.rut}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCustomer}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {quotesCount > 0 && (
            <div className="mt-2 text-xs text-green-700 dark:text-green-300">
              {quotesCount} presupuesto(s) disponible(s)
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-gray-500">
            Cliente no seleccionado (opcional para ventas simples)
          </div>
          <div>
            <Label className="text-xs text-gray-600">Nombre (opcional)</Label>
            <Input
              type="text"
              placeholder="Nombre del cliente"
              value={customerBusinessName}
              onChange={(e) => onBusinessNameChange(e.target.value)}
              className="text-sm mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">RUT (opcional)</Label>
            <Input
              type="text"
              placeholder="RUT del cliente"
              value={customerRUT}
              onChange={(e) => onRUTChange(e.target.value)}
              className="text-sm mt-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}

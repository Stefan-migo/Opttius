"use client";

import { ArrowRight, FileText, Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRUTAsYouType } from "@/lib/utils/rut";

import type { POSCustomer, POSQuote } from "../types";

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
  customerEmail?: string;
  onCustomerEmailChange?: (value: string) => void;
  customerPhone?: string;
  onCustomerPhoneChange?: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  suggestionsRef?: React.RefObject<HTMLDivElement | null>;
  // Quotes
  quotes?: POSQuote[];
  loadingQuotes?: boolean;
  selectedQuote?: POSQuote | null;
  onLoadQuote?: (quoteId: string) => void;
  onSelectQuote?: (quote: POSQuote) => void;
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
  customerEmail = "",
  onCustomerEmailChange,
  customerPhone = "",
  onCustomerPhoneChange,
  inputRef,
  suggestionsRef,
  quotes = [],
  loadingQuotes = false,
  selectedQuote,
  onLoadQuote,
  onSelectQuote,
}: POSCustomerSearchProps) {
  const quotesCount = quotes.length;
  const [quoteInput, setQuoteInput] = useState("");
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [showQuickCustomerFields, setShowQuickCustomerFields] = useState(false);
  const quickCustomerRef = useRef<HTMLDivElement>(null);

  // Check if there's quick customer data entered
  const hasQuickCustomerData =
    customerBusinessName?.trim() ||
    customerRUT?.trim() ||
    customerEmail?.trim() ||
    customerPhone?.trim();

  // Close quick customer fields when clicking outside, only if no data entered
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showQuickCustomerFields &&
        quickCustomerRef.current &&
        !quickCustomerRef.current.contains(event.target as Node) &&
        !hasQuickCustomerData
      ) {
        setShowQuickCustomerFields(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showQuickCustomerFields, hasQuickCustomerData]);

  const handleLoadQuote = async () => {
    if (!quoteInput.trim() || !onLoadQuote) return;

    setLoadingQuote(true);
    try {
      await onLoadQuote(quoteInput.trim());
      setShowQuoteDialog(false);
      setQuoteInput("");
    } finally {
      setLoadingQuote(false);
    }
  };

  // When customer is selected, show their name in the search input
  const displaySearchValue = selectedCustomer
    ? selectedCustomer.name || selectedCustomer.email || ""
    : searchTerm;

  return (
    <div className="space-y-3">
      {/* Customer search - hide when quick customer data is entered */}
      {!hasQuickCustomerData && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            autoComplete="off"
            className="pl-10"
            placeholder={
              selectedCustomer
                ? ""
                : "Buscar cliente (nombre, email, teléfono, RUT)..."
            }
            ref={inputRef as React.Ref<HTMLInputElement>}
            value={displaySearchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      )}

      {/* Search results - hide when quick customer data is entered */}
      {searchTerm.trim().length > 0 &&
        !selectedCustomer &&
        !hasQuickCustomerData && (
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg border">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}

            {!loading && results.length > 0 && (
              <div
                className="max-h-60 overflow-y-auto border rounded-lg bg-white dark:bg-gray-900 shadow-lg z-20"
                ref={suggestionsRef as React.Ref<HTMLDivElement>}
              >
                {results.map((customer, index) => (
                  <button
                    className={`w-full p-3 text-left border-b last:border-b-0 flex justify-between items-center transition-colors ${
                      selectedIndex === index
                        ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                    key={customer.id}
                    type="button"
                    onClick={() => onSelectCustomer(customer)}
                    onMouseEnter={() => onHoverResult?.(index)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {customer.name ||
                          (customer.first_name && customer.last_name
                            ? `${customer.first_name} ${customer.last_name}`
                            : customer.email)}
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
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              size="sm"
              variant="ghost"
              onClick={onClearCustomer}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {quotesCount > 0 && (
            <div className="mt-2 text-xs text-green-700 dark:text-green-300">
              {quotesCount} presupuesto(s) disponible(s)
            </div>
          )}
          {/* Quote Selection - Show list when customer has quotes, otherwise show manual input */}
          {selectedCustomer && quotes.length > 0 && (
            <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
              <DialogTrigger asChild>
                <Button
                  className="w-full mt-2 gap-2"
                  size="sm"
                  variant="outline"
                >
                  <FileText className="h-4 w-4" />
                  Seleccionar Presupuesto
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Presupuestos del Cliente</DialogTitle>
                  <DialogDescription>
                    Selecciona un presupuesto para agregar al carrito
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {loadingQuotes ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    quotes.map((quote) => (
                      <div
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedQuote?.id === quote.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-muted-foreground"
                        }`}
                        key={quote.id}
                        onClick={() => {
                          onSelectQuote?.(quote);
                          setShowQuoteDialog(false);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              {quote.quote_number}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(quote.created_at).toLocaleDateString(
                                "es-CL",
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              $
                              {quote.total_amount?.toLocaleString("es-CL") ||
                                "0"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {quote.status}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
          {/* Show message when no quotes available */}
          {selectedCustomer && quotes.length === 0 && !loadingQuotes && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              <p>No hay presupuestos disponibles para este cliente</p>
              <p className="text-gray-500 mt-1">
                Puedes crear un nuevo presupuesto desde el módulo de
                Presupuestos
              </p>
            </div>
          )}
          {/* Manual Quote Input - only show when customer is selected but has no quotes and onLoadQuote is available */}
          {selectedCustomer &&
            quotes.length === 0 &&
            onLoadQuote &&
            loadingQuotes && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">
                  Cargando presupuestos...
                </span>
              </div>
            )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-gray-500">
            Cliente no seleccionado (opcional)
          </div>
          {/* Quick customer fields - progressive disclosure */}
          <div
            ref={quickCustomerRef}
            className={showQuickCustomerFields ? "grid grid-cols-2 gap-2" : ""}
          >
            <div className={showQuickCustomerFields ? "" : "w-full"}>
              <Input
                className="text-xs h-8"
                placeholder="Nombre del cliente"
                type="text"
                value={customerBusinessName}
                onChange={(e) => {
                  onBusinessNameChange(e.target.value);
                  if (e.target.value.length > 0) {
                    setShowQuickCustomerFields(true);
                  }
                }}
                onFocus={() => setShowQuickCustomerFields(true)}
              />
            </div>
            {/* Secondary fields - shown when name is active or has content */}
            {showQuickCustomerFields && (
              <>
                <div>
                  <Input
                    className="text-xs h-8"
                    placeholder="RUT"
                    type="text"
                    value={customerRUT}
                    onChange={(e) =>
                      onRUTChange(formatRUTAsYouType(e.target.value))
                    }
                  />
                </div>
                {onCustomerEmailChange && (
                  <div>
                    <Input
                      className="text-xs h-8"
                      placeholder="Email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => onCustomerEmailChange(e.target.value)}
                    />
                  </div>
                )}
                {onCustomerPhoneChange && (
                  <div>
                    <Input
                      className="text-xs h-8"
                      placeholder="Teléfono"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => onCustomerPhoneChange(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

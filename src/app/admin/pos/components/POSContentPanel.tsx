"use client";

import { useCallback, useRef } from "react";

import { usePOS } from "../hooks";
import type { POSCustomer, POSProduct } from "../types";
import { POSAdvancedSale } from "./POSAdvancedSale";
import type { POSAdvancedSaleProps } from "./POSAdvancedSale.types";
import { POSCustomerSearch } from "./POSCustomerSearch";
import { POSProductSearch } from "./POSProductSearch";
import type { SaleMode } from "./POSSaleToggle";
import { POSSaleToggle } from "./POSSaleToggle";

export interface POSContentPanelProps {
  saleMode: SaleMode;
  onSaleModeChange: (mode: SaleMode) => void;
  selectedProductIndex: number;
  setSelectedProductIndex: (i: number) => void;
  onLoadQuote: (input: string) => Promise<void>;
  onProductKeyDown: (
    e: React.KeyboardEvent,
    products: POSProduct[],
    selectedIdx: number,
    addToCartFn: (p: POSProduct) => void,
    clearSearchFn: () => void,
    setSelectedIdxFn: (i: number) => void,
  ) => void;
}

export function POSContentPanel({
  saleMode,
  onSaleModeChange,
  selectedProductIndex,
  setSelectedProductIndex,
  onLoadQuote,
  onProductKeyDown,
}: POSContentPanelProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const customerSearchInputRef = useRef<HTMLInputElement>(null);
  const customerSuggestionsRef = useRef<HTMLDivElement>(null);

  const handleCustomerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // Handle customer selection - default behavior is fine
    }
  }, []);

  const {
    customerSearchTerm,
    setCustomerSearchTerm,
    customerResults,
    customerLoading,
    customer,
    setCustomer,
    customerBusinessName,
    setCustomerBusinessName,
    customerRUT,
    setCustomerRUT,
    customerEmail,
    setCustomerEmail,
    customerPhone,
    setCustomerPhone,
    clearCustomer,
    productSearchTerm,
    setProductSearchTerm,
    productResults,
    productLoading,
    handleSelectProduct,
    clearProductSearch,
    addToCart,
    quotes,
    selectedQuote,
    loadingQuotes,
    handleSelectQuote,
    branchId,
  } = usePOS();

  const handleCustomerSelect = useCallback(
    (c: POSCustomer) => {
      setCustomer(c);
      if (c?.rut) setCustomerRUT(c.rut);
      if (c?.business_name) setCustomerBusinessName(c.business_name);
    },
    [setCustomer, setCustomerRUT, setCustomerBusinessName],
  );

  const handleClearCustomer = useCallback(() => {
    clearCustomer();
    setCustomerRUT("");
    setCustomerBusinessName("");
    setCustomerEmail("");
    setCustomerPhone("");
  }, [
    clearCustomer,
    setCustomerRUT,
    setCustomerBusinessName,
    setCustomerEmail,
    setCustomerPhone,
  ]);

  const handleAdvancedCustomerChange = useCallback(
    (c: POSAdvancedSaleProps["customer"]) => {
      if (c) {
        setCustomer({
          id: c.id,
          name: c.name ?? undefined,
          first_name: c.first_name ?? undefined,
          last_name: c.last_name ?? undefined,
          email: c.email ?? undefined,
          rut: c.rut ?? undefined,
          business_name: c.business_name ?? undefined,
          phone: null,
        });
        if (c.rut) setCustomerRUT(c.rut);
        if (c.business_name) setCustomerBusinessName(c.business_name);
      } else {
        setCustomer(null);
        setCustomerRUT("");
        setCustomerBusinessName("");
      }
    },
    [setCustomer, setCustomerRUT, setCustomerBusinessName],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Customer section */}
      <div className="p-4 border-b">
        <POSCustomerSearch
          customerBusinessName={customerBusinessName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          customerRUT={customerRUT}
          inputRef={customerSearchInputRef}
          loading={customerLoading}
          loadingQuotes={loadingQuotes}
          quotes={quotes}
          results={customerResults}
          searchTerm={customerSearchTerm}
          selectedCustomer={customer}
          selectedIndex={-1}
          selectedQuote={selectedQuote}
          suggestionsRef={customerSuggestionsRef}
          onBusinessNameChange={setCustomerBusinessName}
          onClearCustomer={handleClearCustomer}
          onCustomerEmailChange={setCustomerEmail}
          onCustomerPhoneChange={setCustomerPhone}
          onKeyDown={handleCustomerKeyDown}
          onLoadQuote={onLoadQuote}
          onRUTChange={setCustomerRUT}
          onSearchChange={setCustomerSearchTerm}
          onSelectCustomer={handleCustomerSelect}
          onSelectQuote={handleSelectQuote}
        />
      </div>

      {/* Sale mode toggle */}
      <div className="px-4 py-2 border-b">
        <POSSaleToggle mode={saleMode} onModeChange={onSaleModeChange} />
      </div>

      {/* Sale mode content */}
      {saleMode === "quick" ? (
        <div className="flex-1 p-4 overflow-y-auto">
          <POSProductSearch
            inputRef={searchInputRef}
            loading={productLoading}
            products={productResults}
            searchTerm={productSearchTerm}
            selectedIndex={selectedProductIndex}
            suggestionsRef={suggestionsRef}
            onKeyDown={(e) =>
              onProductKeyDown(
                e,
                productResults,
                selectedProductIndex,
                addToCart,
                clearProductSearch,
                setSelectedProductIndex,
              )
            }
            onSearchChange={setProductSearchTerm}
            onSelectProduct={(product) => {
              handleSelectProduct(product);
              setSelectedProductIndex(-1);
            }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <POSAdvancedSale
            branchId={branchId}
            customer={
              customer
                ? {
                    id: customer.id,
                    name: customer.name || undefined,
                    first_name: customer.first_name || undefined,
                    last_name: customer.last_name || undefined,
                    email: customer.email || undefined,
                    rut: customer.rut || undefined,
                    business_name: customer.business_name || undefined,
                  }
                : null
            }
            quickCustomerEmail={customerEmail || null}
            quickCustomerName={customerBusinessName || null}
            quickCustomerPhone={customerPhone || null}
            quickCustomerRUT={customerRUT || null}
            onAddToCart={(items) => {
              items.forEach((item) => addToCart(item.product as POSProduct));
            }}
            onCustomerChange={handleAdvancedCustomerChange}
          />
        </div>
      )}
    </div>
  );
}

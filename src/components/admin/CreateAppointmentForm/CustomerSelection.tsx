import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, User, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRUT } from "@/lib/utils/rut";
import type { Customer, GuestCustomerData } from "./types/appointment.types";

interface CustomerSelectionProps {
  isGuestCustomer: boolean;
  selectedCustomer: Customer | null;
  guestCustomerData: GuestCustomerData;
  customerSearch: string;
  customerResults: Customer[];
  searchingCustomers: boolean;
  onGuestModeToggle: (isGuest: boolean) => void;
  onCustomerSelect: (customer: Customer) => void;
  onCustomerClear: () => void;
  onGuestDataChange: (data: Partial<GuestCustomerData>) => void;
  onCustomerSearchChange: (search: string) => void;
  onCustomerSearchClear: () => void;
}

export default function CustomerSelection({
  isGuestCustomer,
  selectedCustomer,
  guestCustomerData,
  customerSearch,
  customerResults,
  searchingCustomers,
  onGuestModeToggle,
  onCustomerSelect,
  onCustomerClear,
  onGuestDataChange,
  onCustomerSearchChange,
  onCustomerSearchClear,
}: CustomerSelectionProps) {
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    if (customerSearch.length >= 1 && inputContainerRef.current) {
      const rect = inputContainerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [customerSearch.length]);

  const dropdownContent = customerSearch.length >= 1 &&
    dropdownPosition.width > 0 && (
      <div
        className="fixed z-[9999] bg-white/95 backdrop-blur-md border border-admin-border-primary shadow-premium-lg rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
      >
        <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
          {customerResults.length > 0
            ? customerResults.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center gap-3 p-3 hover:bg-admin-accent-primary/5 cursor-pointer rounded-xl transition-colors group"
                  onClick={() => {
                    onCustomerSelect(customer);
                    onCustomerSearchClear();
                  }}
                >
                  <div className="h-9 w-9 bg-admin-bg-tertiary rounded-lg flex items-center justify-center font-bold text-admin-text-secondary group-hover:bg-admin-accent-primary/10 group-hover:text-admin-accent-primary transition-colors text-xs">
                    {customer.first_name?.[0]}
                    {customer.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-admin-text-primary truncate">
                      {customer.first_name} {customer.last_name}
                    </p>
                    <p className="text-[10px] text-admin-text-tertiary truncate">
                      {customer.rut || customer.email}
                    </p>
                  </div>
                </div>
              ))
            : !searchingCustomers && (
                <div className="p-8 text-center text-admin-text-tertiary">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">
                    Sin coincidencias
                  </p>
                </div>
              )}
        </div>
      </div>
    );

  return (
    <Card className="border-none bg-admin-bg-tertiary/20 shadow-premium-sm rounded-2xl !overflow-visible border border-admin-border-primary/30">
      <CardHeader className="pb-4 border-b border-admin-border-primary/10">
        <CardTitle className="flex items-center text-lg font-bold text-admin-text-primary tracking-tight">
          <div className="h-8 w-8 bg-admin-accent-primary/10 rounded-lg flex items-center justify-center mr-3">
            <User className="h-4 w-4 text-admin-accent-primary" />
          </div>
          Identificación del Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Toggle between registered and guest customer */}
        <div className="flex items-center justify-between p-4 bg-white/40 rounded-xl border border-admin-border-primary/20">
          <div className="space-y-0.5">
            <Label className="text-sm font-bold text-admin-text-primary">
              Cliente Registrado
            </Label>
            <p className="text-[10px] font-medium text-admin-text-tertiary uppercase">
              Búsqueda en base de datos oficial
            </p>
          </div>
          <Switch
            checked={!isGuestCustomer}
            onCheckedChange={onGuestModeToggle}
            className="data-[state=checked]:bg-admin-accent-primary"
          />
        </div>

        {isGuestCustomer ? (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="p-4 bg-admin-info/5 border border-admin-info/10 rounded-xl">
              <p className="text-[11px] font-bold text-admin-info uppercase tracking-tight flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                Registro Temporal
              </p>
              <p className="text-[10px] text-admin-text-secondary mt-1">
                Ingrese los datos para esta reserva única. El cliente será
                formalizado íntegramente al momento de la atención.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider ml-1">
                  Nombre *
                </Label>
                <Input
                  placeholder="Nombre"
                  value={guestCustomerData.first_name}
                  onChange={(e) =>
                    onGuestDataChange({ first_name: e.target.value })
                  }
                  className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider ml-1">
                  Apellido *
                </Label>
                <Input
                  placeholder="Apellido"
                  value={guestCustomerData.last_name}
                  onChange={(e) =>
                    onGuestDataChange({ last_name: e.target.value })
                  }
                  className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider ml-1">
                  RUT *
                </Label>
                <Input
                  placeholder="12.345.678-9"
                  value={guestCustomerData.rut}
                  onChange={(e) => {
                    const value = e.target.value;
                    const formatted = formatRUT(value);
                    onGuestDataChange({ rut: formatted });
                  }}
                  className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider ml-1">
                  Teléfono
                </Label>
                <Input
                  type="tel"
                  placeholder="+56 9..."
                  value={guestCustomerData.phone}
                  onChange={(e) => onGuestDataChange({ phone: e.target.value })}
                  className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider ml-1">
                Email
              </Label>
              <Input
                type="email"
                placeholder="cliente@ejemplo.com"
                value={guestCustomerData.email}
                onChange={(e) => onGuestDataChange({ email: e.target.value })}
                className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all"
              />
            </div>
          </div>
        ) : selectedCustomer ? (
          <div className="relative p-5 rounded-2xl bg-admin-accent-primary/[0.03] border border-admin-accent-primary/20 animate-in zoom-in-95 duration-300">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-admin-accent-primary/10 rounded-full flex items-center justify-center font-black text-admin-accent-primary">
                  {selectedCustomer.first_name?.[0]}
                  {selectedCustomer.last_name?.[0]}
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-admin-text-primary tracking-tight">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[11px] font-medium text-admin-text-secondary flex items-center gap-2">
                      <span className="opacity-50">✉️</span>{" "}
                      {selectedCustomer.email}
                    </p>
                    {selectedCustomer.phone && (
                      <p className="text-[11px] font-medium text-admin-text-secondary flex items-center gap-2">
                        <span className="opacity-50">📞</span>{" "}
                        {selectedCustomer.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg text-admin-accent-primary hover:bg-admin-accent-primary/10 font-bold text-[10px] uppercase tracking-widest"
                onClick={onCustomerClear}
              >
                Cambiar
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative" ref={inputContainerRef}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
              {searchingCustomers ? (
                <Loader2 className="h-4 w-4 animate-spin text-admin-accent-primary" />
              ) : (
                <Search className="h-4 w-4 text-admin-text-tertiary" />
              )}
            </div>
            <Input
              placeholder="Buscar por Nombre, RUT o Email..."
              value={customerSearch}
              onChange={(e) => onCustomerSearchChange(e.target.value)}
              className="h-12 pl-12 rounded-2xl border-admin-border-primary/50 bg-white/60 focus:bg-white focus:ring-2 focus:ring-admin-accent-primary/20 transition-all font-medium text-sm"
            />

            {typeof document !== "undefined" &&
              dropdownContent &&
              createPortal(dropdownContent, document.body)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

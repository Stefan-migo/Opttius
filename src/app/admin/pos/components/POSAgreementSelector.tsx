"use client";

import { useState } from "react";

import { Building2, Check, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Agreement {
  id: string;
  name: string;
  business_name?: string;
  discount_percentage?: number;
  status?: string;
}

interface POSAgreementSelectorProps {
  agreements: Agreement[];
  selectedAgreementId: string | null;
  onSelect: (agreement: Agreement | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function POSAgreementSelector({
  agreements,
  selectedAgreementId,
  onSelect,
  disabled = false,
  placeholder = "Seleccionar convenio...",
}: POSAgreementSelectorProps) {
  const selectedAgreement = agreements.find(
    (a) => a.id === selectedAgreementId,
  );
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between gap-2",
            !selectedAgreement && "text-muted-foreground",
          )}
          disabled={disabled}
        >
          {selectedAgreement ? (
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{selectedAgreement.name}</span>
              {selectedAgreement.discount_percentage && (
                <Badge variant="secondary" className="ml-auto flex-shrink-0">
                  -{selectedAgreement.discount_percentage}%
                </Badge>
              )}
            </div>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span>{placeholder}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar convenios..." />
          <CommandList>
            <CommandEmpty>No se encontraron convenios</CommandEmpty>
            <CommandGroup heading="Convenios disponibles">
              {agreements.map((agreement) => (
                <CommandItem
                  key={agreement.id}
                  value={agreement.name}
                  onSelect={() => {
                    onSelect(agreement);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedAgreementId === agreement.id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{agreement.name}</span>
                    {agreement.business_name && (
                      <span className="text-xs text-muted-foreground">
                        {agreement.business_name}
                      </span>
                    )}
                  </div>
                  {agreement.discount_percentage && (
                    <Badge variant="secondary" className="ml-auto">
                      -{agreement.discount_percentage}%
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

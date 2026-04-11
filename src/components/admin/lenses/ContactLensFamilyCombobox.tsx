"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
import { extractDataFromResponse } from "@/lib/api/response-helpers";
import { cn } from "@/lib/utils";

export interface ContactLensFamilyOption {
  id: string;
  name: string;
  brand?: string | null;
  use_type?: string;
  modality?: string;
}

interface ContactLensFamilyComboboxProps {
  value: string;
  onChange: (value: string) => void;
  /** Optional category slug filter (e.g. "lentes-contacto") */
  categorySlug?: string | null;
  /** Optional: use pre-fetched families. When not provided, fetches from API. */
  families?: ContactLensFamilyOption[];
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ContactLensFamilyCombobox({
  value,
  onChange,
  categorySlug = null,
  families: familiesProp,
  loading: loadingProp,
  placeholder = "Selecciona familia (opcional)",
  disabled = false,
  className,
}: ContactLensFamilyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [fetchedFamilies, setFetchedFamilies] = useState<
    ContactLensFamilyOption[]
  >([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchFamilies = useCallback(
    async (searchTerm?: string) => {
      if (familiesProp != null) return;
      setFetchLoading(true);
      try {
        const params = new URLSearchParams();
        if (categorySlug) {
          params.set("category_slug", categorySlug);
        }
        if (searchTerm?.trim()) {
          params.set("search", searchTerm.trim());
        }
        const res = await fetch(
          `/api/admin/contact-lens-families?${params.toString()}`,
        );
        const json = await res.json();
        const data = extractDataFromResponse<ContactLensFamilyOption>(json);
        if (Array.isArray(json?.data)) {
          setFetchedFamilies(json.data);
        } else {
          setFetchedFamilies(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error fetching contact lens families:", err);
        setFetchedFamilies([]);
      } finally {
        setFetchLoading(false);
      }
    },
    [categorySlug, familiesProp],
  );

  useEffect(() => {
    fetchFamilies(search);
  }, [fetchFamilies, search]);

  const baseList = (familiesProp ?? fetchedFamilies).filter(
    (f) => (f as { is_active?: boolean }).is_active !== false,
  );
  const families = search.trim()
    ? baseList.filter(
        (f) =>
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          (f.brand && f.brand.toLowerCase().includes(search.toLowerCase())),
      )
    : baseList;
  const loading = loadingProp ?? fetchLoading;

  const allForDisplay = familiesProp ?? fetchedFamilies;
  const displayValue = !value
    ? "Sin familia (manual)"
    : (() => {
        const f = allForDisplay.find((x) => x.id === value);
        return f ? `${f.name}${f.brand ? ` (${f.brand})` : ""}` : value;
      })();

  const handleSelect = (val: string) => {
    onChange(val || "");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled || loading}
          role="combobox"
          variant="outline"
        >
          {loading ? "Cargando..." : displayValue || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nombre o marca..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No se encontraron familias.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__manual__" onSelect={() => handleSelect("")}>
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0",
                  )}
                />
                Sin familia (manual)
              </CommandItem>
              {families.map((f) => (
                <CommandItem
                  key={f.id}
                  value={f.id}
                  onSelect={() => handleSelect(f.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === f.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {f.name}
                  {f.brand ? ` (${f.brand})` : ""}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

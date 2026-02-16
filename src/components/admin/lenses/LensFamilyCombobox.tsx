"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  getCategorySlugsForPresbyopia,
  getRecommendedLensTypes,
  type PresbyopiaSolution,
} from "@/lib/presbyopia-helpers";
import { extractDataFromResponse } from "@/lib/api/response-helpers";

export interface LensFamilyOption {
  id: string;
  name: string;
  brand?: string | null;
  lens_type?: string;
  lens_material?: string;
}

interface LensFamilyComboboxProps {
  value: string;
  onChange: (value: string) => void;
  presbyopiaSolution?: PresbyopiaSolution | null;
  /** Optional: use pre-fetched families (filtered client-side). When not provided, fetches from API. */
  families?: LensFamilyOption[];
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MANUAL_OPTION_VALUE = "__manual__";

export function LensFamilyCombobox({
  value,
  onChange,
  presbyopiaSolution = null,
  families: familiesProp,
  loading: loadingProp,
  placeholder = "Selecciona familia (opcional)",
  disabled = false,
  className,
}: LensFamilyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [fetchedFamilies, setFetchedFamilies] = useState<LensFamilyOption[]>(
    [],
  );
  const [fetchLoading, setFetchLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchFamilies = useCallback(
    async (searchTerm?: string) => {
      if (familiesProp != null) return;
      setFetchLoading(true);
      try {
        const slugs = getCategorySlugsForPresbyopia(
          presbyopiaSolution ?? undefined,
        );
        const params = new URLSearchParams();
        if (slugs.length > 0) {
          params.set("category_slug", slugs.join(","));
        }
        if (searchTerm?.trim()) {
          params.set("search", searchTerm.trim());
        }
        const res = await fetch(
          `/api/admin/lens-families?${params.toString()}`,
        );
        const json = await res.json();
        const data = extractDataFromResponse<LensFamilyOption>(json);
        if (Array.isArray(json?.data)) {
          setFetchedFamilies(json.data);
        } else {
          setFetchedFamilies(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error fetching lens families:", err);
        setFetchedFamilies([]);
      } finally {
        setFetchLoading(false);
      }
    },
    [presbyopiaSolution, familiesProp],
  );

  useEffect(() => {
    fetchFamilies(search);
  }, [fetchFamilies, search]);

  const slugs = getCategorySlugsForPresbyopia(presbyopiaSolution ?? undefined);
  const recommendedTypes = getRecommendedLensTypes(
    presbyopiaSolution ?? "none",
  );
  const baseList = familiesProp ?? fetchedFamilies;
  const filteredList =
    baseList.length > 0 && (slugs.length > 0 || recommendedTypes.length > 0)
      ? baseList.filter((f) => {
          const cat = (f as { categories?: { slug?: string } }).categories;
          const catSlug =
            typeof cat === "object" && cat?.slug ? cat.slug : null;
          if (catSlug && slugs.length > 0) {
            return slugs.includes(catSlug);
          }
          if (recommendedTypes.length > 0) {
            return recommendedTypes.includes(
              (f as { lens_type?: string }).lens_type ?? "",
            );
          }
          return true;
        })
      : baseList;
  const families = search.trim()
    ? filteredList.filter(
        (f) =>
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          (f.brand && f.brand.toLowerCase().includes(search.toLowerCase())),
      )
    : filteredList;
  const loading = loadingProp ?? fetchLoading;

  const allFamiliesForDisplay = familiesProp ?? fetchedFamilies;
  const displayValue = !value
    ? "Sin familia (manual)"
    : (() => {
        const f = allFamiliesForDisplay.find((x) => x.id === value);
        return f ? `${f.name}${f.brand ? ` (${f.brand})` : ""}` : value;
      })();

  const handleSelect = (val: string) => {
    const newVal = val === MANUAL_OPTION_VALUE ? "" : val;
    onChange(newVal);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn("w-full justify-between font-normal", className)}
        >
          {loading ? "Cargando..." : displayValue || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
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

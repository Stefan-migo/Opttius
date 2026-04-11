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
import {
  getCategorySlugsForPresbyopia,
  getLensTypesForPresbyopia,
  getRecommendedLensTypes,
  type PresbyopiaSolution,
} from "@/lib/presbyopia-helpers";
import { cn } from "@/lib/utils";

export interface LensFamilyOption {
  id: string;
  name: string;
  brand?: string | null;
  lens_type?: string;
  lens_material?: string;
}

/** prescription_type values that map 1:1 to lens_type for filtering when presbyopiaSolution is "none" */
const PRESCRIPTION_TYPE_TO_LENS_FILTER = [
  "reading",
  "computer",
  "sports",
] as const;

interface LensFamilyComboboxProps {
  value: string;
  onChange: (value: string) => void;
  presbyopiaSolution?: PresbyopiaSolution | null;
  /** When presbyopiaSolution is "none", use prescription_type to filter (reading/computer/sports → only that type) */
  prescriptionType?: string | null;
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
  prescriptionType = null,
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

  // When presbyopiaSolution is "none" and prescriptionType is reading/computer/sports, filter by that type only
  const effectiveLensTypes = (() => {
    const fromPresbyopia = getLensTypesForPresbyopia(
      presbyopiaSolution ?? undefined,
    );
    if (presbyopiaSolution && presbyopiaSolution !== "none") {
      return fromPresbyopia;
    }
    const pt = prescriptionType?.toLowerCase().trim();
    if (
      pt &&
      (PRESCRIPTION_TYPE_TO_LENS_FILTER as readonly string[]).includes(pt)
    ) {
      return [pt];
    }
    return fromPresbyopia;
  })();

  const fetchFamilies = useCallback(
    async (searchTerm?: string) => {
      if (familiesProp != null) return;
      setFetchLoading(true);
      try {
        const lensTypes = (() => {
          const fromPresbyopia = getLensTypesForPresbyopia(
            presbyopiaSolution ?? undefined,
          );
          if (presbyopiaSolution && presbyopiaSolution !== "none") {
            return fromPresbyopia;
          }
          const pt = prescriptionType?.toLowerCase().trim();
          if (
            pt &&
            (PRESCRIPTION_TYPE_TO_LENS_FILTER as readonly string[]).includes(pt)
          ) {
            return [pt];
          }
          return fromPresbyopia;
        })();
        const slugs =
          lensTypes.length === 0
            ? getCategorySlugsForPresbyopia(presbyopiaSolution ?? undefined)
            : [];
        const params = new URLSearchParams();
        if (lensTypes.length > 0) {
          params.set("lens_type", lensTypes.join(","));
        } else if (slugs.length > 0) {
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
    [presbyopiaSolution, prescriptionType, familiesProp],
  );

  useEffect(() => {
    fetchFamilies(search);
  }, [fetchFamilies, search]);

  const lensTypes = effectiveLensTypes;
  const slugs =
    lensTypes.length === 0
      ? getCategorySlugsForPresbyopia(presbyopiaSolution ?? undefined)
      : [];
  const recommendedTypes =
    lensTypes.length > 0
      ? lensTypes
      : getRecommendedLensTypes(presbyopiaSolution ?? "none");
  const baseList = familiesProp ?? fetchedFamilies;
  const filteredList =
    baseList.length > 0 &&
    (lensTypes.length > 0 || slugs.length > 0 || recommendedTypes.length > 0)
      ? baseList.filter((f) => {
          const familyType = (f as unknown).lens_type || "";
          const cat =
            (f as unknown).categories ??
            (f as unknown).category ??
            (typeof (f as unknown).category_id === "object"
              ? (f as unknown).category_id
              : null);
          const catSlug =
            typeof cat === "object" && cat?.slug ? cat.slug : null;

          // Prefer lens_type when available
          if (lensTypes.length > 0) {
            return familyType ? lensTypes.includes(familyType) : false;
          }

          // Fallback to category-based filtering
          if (catSlug && slugs.length > 0 && slugs.includes(catSlug)) {
            return true;
          }
          if (recommendedTypes.length > 0 && familyType) {
            const normalizedType = familyType
              .toLowerCase()
              .replace(/[^a-z]/g, "");
            const hasMatch = recommendedTypes.some((rt) => {
              const normalizedRT = rt.toLowerCase().replace(/[^a-z]/g, "");
              return (
                normalizedRT === normalizedType ||
                (normalizedRT === "singlevision" &&
                  (normalizedType === "monofocal" ||
                    normalizedType === "visionsencilla"))
              );
            });
            if (hasMatch) return true;
          }
          if (!catSlug && slugs.length > 0) return true;
          if (catSlug && slugs.length > 0 && !slugs.includes(catSlug)) {
            return false;
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

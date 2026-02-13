"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, User, Package, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { extractDataFromResponse } from "@/lib/api/response-helpers";

interface SearchResult {
  id: string;
  name: string;
  type: "customer" | "product";
  subtitle?: string;
}

interface DashboardSearchProps {
  type: "customer" | "product";
  placeholder?: string;
}

export function DashboardSearch({ type, placeholder }: DashboardSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async () => {
    if (!query || query.length < 2) return;

    setLoading(true);
    try {
      const endpoint =
        type === "customer"
          ? `/api/admin/customers/search?q=${encodeURIComponent(query)}`
          : `/api/admin/products/search?q=${encodeURIComponent(query)}&limit=10`;

      const response = await fetch(endpoint);
      const data = await response.json();

      if (response.ok) {
        if (type === "customer") {
          setResults(
            (extractDataFromResponse(data) || []).map((c: any) => ({
              id: c.id,
              name:
                `${c.first_name || ""} ${c.last_name || ""}`.trim() ||
                c.email ||
                "Sin nombre",
              type: "customer" as const,
              subtitle: c.email || c.phone || c.rut || "",
            })),
          );
        } else {
          setResults(
            (extractDataFromResponse(data) || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              type: "product" as const,
              subtitle:
                p.sku || p.barcode || `Stock: ${p.inventory_quantity || 0}`,
            })),
          );
        }
      }
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    if (result.type === "customer") {
      router.push(`/admin/customers/${result.id}`);
    } else {
      router.push(`/admin/products/edit/${result.id}`);
    }
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-start h-10 hover:bg-[#AE0000]/5 hover:border-[#AE0000] border-gray-300 transition-all duration-300"
      >
        {type === "customer" ? (
          <User className="h-4 w-4 mr-2 flex-shrink-0 text-[var(--admin-accent-secondary)]" />
        ) : (
          <Package className="h-4 w-4 mr-2 flex-shrink-0" />
        )}
        <span className="truncate">
          {placeholder ||
            (type === "customer" ? "Buscar Cliente" : "Buscar Producto")}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {type === "customer" ? "Buscar Cliente" : "Buscar Producto"}
            </DialogTitle>
            <DialogDescription>
              Escribe al menos 2 caracteres para buscar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={
                  placeholder ||
                  (type === "customer"
                    ? "Nombre, email o RUT..."
                    : "Nombre, SKU o código de barras...")
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No se encontraron resultados
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="max-h-[400px] overflow-y-auto space-y-1">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      {result.type === "customer" ? (
                        <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <Package className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {result.name}
                        </p>
                        {result.subtitle && (
                          <p className="text-sm text-gray-500 truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

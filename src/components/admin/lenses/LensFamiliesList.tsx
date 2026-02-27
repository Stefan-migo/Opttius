"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, Search, RefreshCw, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";

interface LensFamily {
  id: string;
  name: string;
  brand: string | null;
  lens_type: string;
  lens_material: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const LENS_TYPES = [
  { value: "single_vision", label: "Monofocal" },
  { value: "bifocal", label: "Bifocal" },
  { value: "trifocal", label: "Trifocal" },
  { value: "progressive", label: "Progresivo" },
  { value: "reading", label: "Lectura" },
  { value: "computer", label: "Computadora" },
  { value: "sports", label: "Deportivo" },
];

const LENS_MATERIALS = [
  { value: "cr39", label: "CR-39" },
  { value: "polycarbonate", label: "Policarbonato" },
  { value: "high_index_1_67", label: "Alto Índice 1.67" },
  { value: "high_index_1_74", label: "Alto Índice 1.74" },
  { value: "trivex", label: "Trivex" },
  { value: "glass", label: "Vidrio" },
];

export default function LensFamiliesList() {
  const router = useRouter();
  const [families, setFamilies] = useState<LensFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchFamilies();
  }, [includeInactive]);

  const fetchFamilies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (includeInactive) {
        params.append("include_inactive", "true");
      }
      const response = await fetch(
        `/api/admin/lens-families?${params.toString()}`,
      );
      if (response.ok) {
        const result = await response.json();
        setFamilies(result.data ?? result.families ?? []);
      } else {
        toast.error("Error al cargar familias de lentes");
      }
    } catch (error) {
      console.error("Error fetching families:", error);
      toast.error("Error al cargar familias de lentes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta familia?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/lens-families/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar familia");
      }

      toast.success("Familia eliminada exitosamente");
      fetchFamilies();
    } catch (error) {
      toast.error("Error al eliminar familia");
    }
  };

  const filteredFamilies = families.filter((family) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      family.name.toLowerCase().includes(searchLower) ||
      (family.brand || "").toLowerCase().includes(searchLower) ||
      family.lens_type.toLowerCase().includes(searchLower) ||
      family.lens_material.toLowerCase().includes(searchLower)
    );
  });

  // Pagination calculations
  const totalFamilies = filteredFamilies.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFamilies = filteredFamilies.slice(startIndex, endIndex);
  const totalPages = Math.ceil(totalFamilies / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, includeInactive]);

  return (
    <div className="py-6 space-y-8">
      <div className="border-b border-admin-border-primary/10 pb-6">
        <div className="space-y-1">
          <h2 className="text-sm font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] flex items-center">
            Matriz de Familias de Lentes
          </h2>
          <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest">
            Protocolos de Materiales y Tratamientos por Marca
          </p>
        </div>
      </div>

      <Card className="border border-admin-border-primary/20 bg-admin-bg-tertiary rounded-xl shadow-none overflow-hidden">
        <CardHeader className="bg-admin-bg-tertiary/50 border-b border-admin-border-primary/10 py-4 sm:py-6 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-epoch-primary opacity-50" />
              <h3 className="text-[11px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em]">
                Registro de Familias de Lentes Oftálmicos (
                {filteredFamilies.length})
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-xl text-[9px] font-display font-bold tracking-widest uppercase h-auto py-2 border-none ${
                  includeInactive
                    ? "bg-admin-error/10 text-admin-error"
                    : "hover:bg-admin-bg-tertiary text-admin-text-tertiary"
                }`}
                onClick={() => setIncludeInactive(!includeInactive)}
              >
                {includeInactive ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-2" />
                    OCULTAR INACTIVAS
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-2" />
                    MOSTRAR INACTIVAS
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 border-none hover:bg-admin-bg-tertiary text-epoch-primary"
                onClick={fetchFamilies}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-3 sm:p-6 border-b border-admin-border-primary/10 bg-admin-bg-tertiary/20">
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-admin-text-tertiary opacity-40" />
              <Input
                placeholder="Buscar por nombre, marca o material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 sm:pl-12 rounded-xl border-admin-border-primary/10 focus:border-epoch-primary focus:ring-0 bg-white p-3 sm:p-6 text-[9px] sm:text-[10px] font-display font-bold tracking-widest uppercase"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-24 bg-admin-bg-tertiary/10">
              <RefreshCw className="h-8 w-8 text-epoch-primary animate-spin mx-auto mb-4 opacity-30" />
              <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                SINCRONIZANDO MATRIZ...
              </p>
            </div>
          ) : paginatedFamilies.length === 0 ? (
            <div className="text-center py-24 bg-admin-bg-tertiary/10 border-2 border-dashed border-admin-border-primary/5 m-6">
              <EyeOff className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4 opacity-20" />
              <h3 className="text-xs font-display font-bold text-admin-text-primary uppercase tracking-[0.2em]">
                REGISTRO NO ENCONTRADO
              </h3>
              <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest mt-2">
                No existen familias vinculadas bajo los criterios actuales
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0 -mx-2 sm:mx-0 px-2 sm:px-0">
              <Table className="min-w-[600px]">
                <TableHeader className="bg-admin-bg-tertiary/30">
                  <TableRow className="hover:bg-transparent border-admin-border-primary/10">
                    <TableHead className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-3 sm:p-6 whitespace-nowrap">
                      MARCA / FAMILIA
                    </TableHead>
                    <TableHead className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-3 sm:p-6 whitespace-nowrap">
                      TIPO DE LENTE
                    </TableHead>
                    <TableHead className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-3 sm:p-6 whitespace-nowrap">
                      MATERIAL BASE
                    </TableHead>
                    <TableHead className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-3 sm:p-6 whitespace-nowrap">
                      COMENTARIOS
                    </TableHead>
                    <TableHead className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-3 sm:p-6 whitespace-nowrap">
                      ESTADO
                    </TableHead>
                    <TableHead className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-6 text-right">
                      ACCIONES
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFamilies.map((family) => (
                    <TableRow
                      key={family.id}
                      className="border-admin-border-primary/10 hover:bg-admin-bg-tertiary/50 transition-colors"
                    >
                      <TableCell className="p-3 sm:p-6">
                        <div className="space-y-1">
                          <p className="text-sm font-display font-bold text-admin-text-primary uppercase tracking-tight">
                            {family.name}
                          </p>
                          <span className="text-[9px] font-display font-bold text-admin-text-tertiary tracking-widest uppercase bg-admin-bg-tertiary px-2 py-0.5 border border-admin-border-primary/5">
                            {family.brand || "MARCA GENÉRICA"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="p-3 sm:p-6">
                        <span className="text-[10px] font-serif italic text-admin-text-primary uppercase tracking-wider">
                          {
                            LENS_TYPES.find((t) => t.value === family.lens_type)
                              ?.label
                          }
                        </span>
                      </TableCell>
                      <TableCell className="p-3 sm:p-6">
                        <span className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                          {
                            LENS_MATERIALS.find(
                              (m) => m.value === family.lens_material,
                            )?.label
                          }
                        </span>
                      </TableCell>
                      <TableCell className="p-3 sm:p-6">
                        <p className="text-[10px] font-serif italic text-admin-text-tertiary max-w-[200px] truncate">
                          {family.description || "Sin anotaciones técnicas"}
                        </p>
                      </TableCell>
                      <TableCell className="p-3 sm:p-6">
                        <div
                          className={`px-2 py-1 text-[8px] font-display font-bold tracking-widest uppercase inline-block border ${
                            family.is_active
                              ? "bg-epoch-primary/5 text-epoch-primary border-epoch-primary/20"
                              : "bg-admin-error/5 text-admin-error border-admin-error/20"
                          }`}
                        >
                          {family.is_active ? "ACTIVA" : "INACTIVA"}
                        </div>
                      </TableCell>
                      <TableCell className="p-3 sm:p-6 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-xl hover:bg-admin-bg-tertiary text-epoch-primary"
                            onClick={() =>
                              router.push(`/admin/lens-families/${family.id}`)
                            }
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-xl hover:bg-admin-error/5 text-admin-error"
                            onClick={() => handleDelete(family.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredFamilies.length > 0 && (
            <div className="mt-4 px-4 sm:px-6 pb-4 sm:pb-6 overflow-x-auto min-w-0">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={totalFamilies}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemsPerPageOptions={[10, 20, 50, 100]}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

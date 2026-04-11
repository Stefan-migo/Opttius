"use client";
import { Edit, Eye, EyeOff, RefreshCw, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ContactLensFamily {
  id: string;
  name: string;
  brand: string | null;
  use_type: string;
  modality: string;
  material: string | null;
  packaging: string;
  base_curve: number | null;
  diameter: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const USE_TYPES = [
  { value: "daily", label: "Diario" },
  { value: "bi_weekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
  { value: "extended_wear", label: "Uso Prolongado" },
];

const MODALITIES = [
  { value: "spherical", label: "Esférico" },
  { value: "toric", label: "Tórico" },
  { value: "multifocal", label: "Multifocal" },
  { value: "cosmetic", label: "Cosmético" },
];

export default function ContactLensFamiliesList() {
  const router = useRouter();
  const [families, setFamilies] = useState<ContactLensFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [includeInactive, setIncludeInactive] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchFamilies();
  }, [includeInactive, modalityFilter]);

  const fetchFamilies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (includeInactive) {
        params.append("include_inactive", "true");
      }
      if (modalityFilter && modalityFilter !== "all") {
        params.append("modality", modalityFilter);
      }
      const response = await fetch(
        `/api/admin/contact-lens-families?${params.toString()}`,
      );
      if (response.ok) {
        const result = await response.json();
        setFamilies(result.data ?? result.families ?? []);
      } else {
        toast.error("Error al cargar familias de lentes de contacto");
      }
    } catch (error) {
      console.error("Error fetching families:", error);
      toast.error("Error al cargar familias de lentes de contacto");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta familia?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/contact-lens-families/${id}`, {
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
      family.use_type.toLowerCase().includes(searchLower) ||
      family.modality.toLowerCase().includes(searchLower)
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
  }, [searchTerm, includeInactive, modalityFilter]);

  return (
    <div className="py-6 space-y-8">
      <div className="border-b border-admin-border-primary/10 pb-6">
        <div className="space-y-1">
          <h2 className="text-sm font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] flex items-center">
            Matriz de Lentes de Contacto
          </h2>
          <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest">
            Registro Técnico de Modalidades y Parámetros Biométricos
          </p>
        </div>
      </div>

      <Card className="border border-admin-border-primary/20 bg-admin-bg-tertiary rounded-xl shadow-none overflow-hidden">
        <CardHeader className="bg-admin-bg-tertiary/50 border-b border-admin-border-primary/10 py-4 sm:py-6 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-epoch-primary opacity-50" />
              <h3 className="text-[11px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em]">
                Registro de Familias de Lentes de Contacto (
                {filteredFamilies.length})
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className={`rounded-xl text-[9px] font-display font-bold tracking-widest uppercase h-auto py-2 border-none ${
                  includeInactive
                    ? "bg-admin-error/10 text-admin-error"
                    : "hover:bg-admin-bg-tertiary text-admin-text-tertiary"
                }`}
                size="sm"
                variant="ghost"
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
                className="h-8 w-8 p-0 border-none hover:bg-admin-bg-tertiary text-epoch-primary"
                size="sm"
                variant="ghost"
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
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-admin-text-tertiary opacity-40" />
                <Input
                  className="pl-10 sm:pl-12 rounded-xl border-admin-border-primary/10 focus:border-epoch-primary focus:ring-0 bg-white p-3 sm:p-6 text-[9px] sm:text-[10px] font-display font-bold tracking-widest uppercase"
                  placeholder="Buscar por nombre, tipo o modalidad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={modalityFilter}
                  onValueChange={setModalityFilter}
                >
                  <SelectTrigger className="rounded-xl border-admin-border-primary/10 h-auto p-3 sm:p-6 text-[9px] sm:text-[10px] font-display font-bold tracking-widest uppercase">
                    <SelectValue placeholder="Modalidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las modalidades</SelectItem>
                    {MODALITIES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-24 bg-admin-bg-tertiary/10">
              <RefreshCw className="h-8 w-8 text-epoch-primary animate-spin mx-auto mb-4 opacity-30" />
              <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                SINCRONIZANDO MATRIZ CLINICA...
              </p>
            </div>
          ) : paginatedFamilies.length === 0 ? (
            <div className="text-center py-24 bg-admin-bg-tertiary/10 border-2 border-dashed border-admin-border-primary/5 m-6">
              <EyeOff className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4 opacity-20" />
              <h3 className="text-xs font-display font-bold text-admin-text-primary uppercase tracking-[0.2em]">
                MATRIZ SIN REGISTROS
              </h3>
              <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest mt-2">
                No se han detectado familias de contacto en la base de datos
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0 -mx-2 sm:mx-0 px-2 sm:px-0">
              <Table className="min-w-[600px]">
                <TableHeader className="bg-admin-bg-tertiary/30">
                  <TableRow className="hover:bg-transparent border-admin-border-primary/10">
                    <TableHead className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-3 sm:p-6 whitespace-nowrap">
                      FAMILIA / FABRICANTE
                    </TableHead>
                    <TableHead className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-3 sm:p-6 whitespace-nowrap">
                      FRECUENCIA
                    </TableHead>
                    <TableHead className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-3 sm:p-6 whitespace-nowrap">
                      MODALIDAD
                    </TableHead>
                    <TableHead className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-3 sm:p-6 whitespace-nowrap">
                      MATERIAL
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
                  {paginatedFamilies.map((family, idx) => {
                    const prevModality =
                      idx > 0 ? paginatedFamilies[idx - 1].modality : null;
                    const showGroupHeader = prevModality !== family.modality;
                    return (
                      <React.Fragment key={family.id}>
                        {showGroupHeader && (
                          <TableRow
                            className="bg-admin-bg-tertiary/40 hover:bg-transparent"
                            key={`group-${family.modality}-${idx}`}
                          >
                            <TableCell
                              className="p-2 sm:p-3 text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em]"
                              colSpan={6}
                            >
                              {MODALITIES.find(
                                (m) => m.value === family.modality,
                              )?.label || family.modality}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow className="border-admin-border-primary/10 hover:bg-admin-bg-tertiary/50 transition-colors">
                          <TableCell className="p-3 sm:p-6">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-display font-bold text-admin-text-primary uppercase tracking-tight">
                                  {family.name}
                                </p>
                                <Badge
                                  className="text-[8px] font-display font-bold tracking-widest uppercase border-admin-border-primary/20"
                                  variant="outline"
                                >
                                  {MODALITIES.find(
                                    (m) => m.value === family.modality,
                                  )?.label || family.modality}{" "}
                                  ·{" "}
                                  {USE_TYPES.find(
                                    (t) => t.value === family.use_type,
                                  )?.label || family.use_type}
                                </Badge>
                              </div>
                              <span className="text-[9px] font-display font-bold text-admin-text-tertiary tracking-widest uppercase bg-admin-bg-tertiary px-2 py-0.5 border border-admin-border-primary/5">
                                {family.brand || "FABRICANTE NO ASIGNADO"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="p-3 sm:p-6">
                            <span className="text-[10px] font-serif italic text-admin-text-primary uppercase tracking-wider">
                              {USE_TYPES.find(
                                (t) => t.value === family.use_type,
                              )?.label || family.use_type}
                            </span>
                          </TableCell>
                          <TableCell className="p-3 sm:p-6">
                            <span className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                              {MODALITIES.find(
                                (m) => m.value === family.modality,
                              )?.label || family.modality}
                            </span>
                          </TableCell>
                          <TableCell className="p-3 sm:p-6">
                            <span className="text-[10px] font-serif italic text-admin-text-tertiary">
                              {family.material || "Material Estándar"}
                            </span>
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
                                className="h-8 w-8 p-0 rounded-xl hover:bg-admin-bg-tertiary text-epoch-primary"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  router.push(
                                    `/admin/contact-lens-families/${family.id}`,
                                  )
                                }
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                className="h-8 w-8 p-0 rounded-xl hover:bg-admin-error/5 text-admin-error"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(family.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredFamilies.length > 0 && (
            <div className="mt-4 px-4 sm:px-6 pb-4 sm:pb-6 overflow-x-auto min-w-0">
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={[10, 20, 50, 100]}
                totalItems={totalFamilies}
                totalPages={totalPages}
                onItemsPerPageChange={setItemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

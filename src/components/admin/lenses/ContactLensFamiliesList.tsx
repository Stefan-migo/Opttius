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
import {
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";

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
  }, [searchTerm, includeInactive]);

  return (
    <div className="py-6 space-y-8">
      <div className="flex justify-between items-end border-b border-admin-border-primary/10 pb-6">
        <div className="space-y-1">
          <h2 className="text-sm font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] flex items-center">
            Matriz de Lentes de Contacto
          </h2>
          <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest">
            Registro Técnico de Modalidades y Parámetros Biométricos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push("/admin/contact-lens-families/new")}
            className="bg-epoch-primary hover:bg-epoch-primary/90 text-white rounded-none text-[10px] font-display font-bold tracking-widest uppercase px-6 py-4 h-auto border-none shadow-premium-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            VINCULAR NUEVO PARÁMETRO
          </Button>
        </div>
      </div>

      <Card className="border border-admin-border-primary/20 bg-white rounded-none shadow-none overflow-hidden">
        <CardHeader className="bg-admin-bg-tertiary/50 border-b border-admin-border-primary/10 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-epoch-primary opacity-50" />
              <h3 className="text-[11px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em]">
                HISTORIAL CLÍNICO DE CONTACTOLOGÍA ({filteredFamilies.length})
              </h3>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-none text-[9px] font-display font-bold tracking-widest uppercase h-auto py-2 border-none ${
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
          <div className="p-6 border-b border-admin-border-primary/10 bg-admin-bg-tertiary/20">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-admin-text-tertiary opacity-40" />
              <Input
                placeholder="BUSCAR EN MATRIZ DE CONTACTOLOGÍA POR NOMBRE, TIPO O MODALIDAD... "
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 rounded-none border-admin-border-primary/10 focus:border-epoch-primary focus:ring-0 bg-white p-6 text-[10px] font-display font-bold tracking-widest uppercase"
              />
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-admin-bg-tertiary/30">
                  <TableRow className="hover:bg-transparent border-admin-border-primary/10">
                    <TableHead className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-6">
                      FAMILIA / FABRICANTE
                    </TableHead>
                    <TableHead className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-6">
                      FRECUENCIA
                    </TableHead>
                    <TableHead className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-6">
                      MODALIDAD
                    </TableHead>
                    <TableHead className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-6">
                      MATERIAL
                    </TableHead>
                    <TableHead className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-6">
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
                      className="border-admin-border-primary/10 hover:bg-admin-bg-tertiary/10 transition-colors"
                    >
                      <TableCell className="p-6">
                        <div className="space-y-1">
                          <p className="text-sm font-display font-bold text-admin-text-primary uppercase tracking-tight">
                            {family.name}
                          </p>
                          <span className="text-[9px] font-display font-bold text-admin-text-tertiary tracking-widest uppercase bg-admin-bg-tertiary px-2 py-0.5 border border-admin-border-primary/5">
                            {family.brand || "FABRICANTE NO ASIGNADO"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="p-6">
                        <span className="text-[10px] font-serif italic text-admin-text-primary uppercase tracking-wider">
                          {USE_TYPES.find((t) => t.value === family.use_type)
                            ?.label || family.use_type}
                        </span>
                      </TableCell>
                      <TableCell className="p-6">
                        <span className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                          {MODALITIES.find((m) => m.value === family.modality)
                            ?.label || family.modality}
                        </span>
                      </TableCell>
                      <TableCell className="p-6">
                        <span className="text-[10px] font-serif italic text-admin-text-tertiary">
                          {family.material || "Material Estándar"}
                        </span>
                      </TableCell>
                      <TableCell className="p-6">
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
                      <TableCell className="p-6 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-none hover:bg-admin-bg-tertiary text-epoch-primary"
                            onClick={() =>
                              router.push(
                                `/admin/contact-lens-families/${family.id}`,
                              )
                            }
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-none hover:bg-admin-error/5 text-admin-error"
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
            <div className="mt-4">
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

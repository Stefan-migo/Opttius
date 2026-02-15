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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Familias de Lentes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las familias de lentes disponibles en el sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/admin/lens-families/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Familia
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lista de Familias</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIncludeInactive(!includeInactive)}
              >
                {includeInactive ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Ocultar Inactivas
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Mostrar Inactivas
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={fetchFamilies}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, marca, tipo o material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : filteredFamilies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron familias de lentes
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFamilies.map((family) => (
                    <TableRow key={family.id}>
                      <TableCell className="font-medium">
                        {family.name}
                      </TableCell>
                      <TableCell>{family.brand || "-"}</TableCell>
                      <TableCell>
                        {
                          LENS_TYPES.find((t) => t.value === family.lens_type)
                            ?.label
                        }
                      </TableCell>
                      <TableCell>
                        {
                          LENS_MATERIALS.find(
                            (m) => m.value === family.lens_material,
                          )?.label
                        }
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {family.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={family.is_active ? "default" : "secondary"}
                        >
                          {family.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/admin/lens-families/${family.id}`)
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(family.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

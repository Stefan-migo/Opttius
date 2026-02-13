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
        const data = await response.json();
        setFamilies(data.families || []);
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Lista de Familias de Contacto</CardTitle>
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
              placeholder="Buscar por nombre, marca, tipo de uso o modalidad..."
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
            No se encontraron familias de lentes de contacto
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Tipo de Uso</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Material</TableHead>
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
                      {USE_TYPES.find((t) => t.value === family.use_type)
                        ?.label || family.use_type}
                    </TableCell>
                    <TableCell>
                      {MODALITIES.find((m) => m.value === family.modality)
                        ?.label || family.modality}
                    </TableCell>
                    <TableCell>{family.material || "-"}</TableCell>
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
                            router.push(`/admin/contact-lens-families/${family.id}`)
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
  );
}
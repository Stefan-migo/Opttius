import { Edit, Eye, EyeOff, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/utils";
import type { ContactLensFamily } from "@/types/contact-lens";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ContactLensMatricesListProps<T = any> {
  matrices: T[];
  families: Array<{ id: string; name: string }>;
  loading: boolean;
  onEdit: (matrix: T) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onRefresh: () => void;
}

export function ContactLensMatricesList({
  matrices,
  families,
  loading,
  onEdit,
  onDelete,
  onCreate,
  onRefresh,
}: ContactLensMatricesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("all");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFamilyId, includeInactive]);

  const filteredMatrices = matrices.filter((matrix) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      matrix.contact_lens_families.name.toLowerCase().includes(searchLower) ||
      (matrix.contact_lens_families.brand || "").toLowerCase().includes(searchLower) ||
      MODALITIES.find((m) => m.value === matrix.contact_lens_families.modality)
        ?.label.toLowerCase().includes(searchLower)
    );
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMatrices = filteredMatrices.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredMatrices.length / itemsPerPage);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setIncludeInactive(!includeInactive)}>
              {includeInactive ? <><EyeOff className="h-4 w-4 mr-2" /> Ocultar Inactivas</> : <><Eye className="h-4 w-4 mr-2" /> Mostrar Inactivas</>}
            </Button>
            <Button size="sm" variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4 mr-2" /> Nueva Matriz
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Buscar por familia o modalidad..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="w-64">
            <Select value={selectedFamilyId} onValueChange={setSelectedFamilyId}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por familia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las familias</SelectItem>
                {families.map((family) => (
                  <SelectItem key={family.id} value={family.id}>{family.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : filteredMatrices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No se encontraron matrices de precios</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Familia</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Rango Esfera</TableHead>
                  <TableHead>Rango Cilindro</TableHead>
                  <TableHead>Rango Eje</TableHead>
                  <TableHead>Rango Adición</TableHead>
                  <TableHead>Precio Venta</TableHead>
                  <TableHead>Costo Compra</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMatrices.map((matrix) => (
                  <TableRow key={matrix.id}>
                    <TableCell className="font-medium">{matrix.contact_lens_families.name}</TableCell>
                    <TableCell>{USE_TYPES.find((t) => t.value === matrix.contact_lens_families.use_type)?.label}</TableCell>
                    <TableCell>{MODALITIES.find((m) => m.value === matrix.contact_lens_families.modality)?.label}</TableCell>
                    <TableCell>{matrix.sphere_min} a {matrix.sphere_max}</TableCell>
                    <TableCell>{matrix.cylinder_min} a {matrix.cylinder_max}</TableCell>
                    <TableCell>{matrix.axis_min}° a {matrix.axis_max}°</TableCell>
                    <TableCell>{matrix.addition_min} a {matrix.addition_max}</TableCell>
                    <TableCell>{formatCurrency(matrix.base_price)}</TableCell>
                    <TableCell>{formatCurrency(matrix.cost)}</TableCell>
                    <TableCell>
                      <Badge variant={matrix.is_active ? "default" : "secondary"}>
                        {matrix.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => onEdit(matrix)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete(matrix.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredMatrices.length}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

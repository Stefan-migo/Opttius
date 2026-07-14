import { Edit, Eye, EyeOff, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const PACKAGING_TYPES = [
  { value: "box_30", label: "Caja de 30 lentes" },
  { value: "box_6", label: "Caja de 6 lentes" },
  { value: "box_3", label: "Caja de 3 lentes" },
  { value: "bottle", label: "Botella" },
];

interface ContactLensFamiliesListProps {
  families: ContactLensFamily[];
  loading: boolean;
  onEdit: (family: ContactLensFamily) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onRefresh: () => void;
}

export function ContactLensFamiliesList({
  families,
  loading,
  onEdit,
  onDelete,
  onCreate,
  onRefresh,
}: ContactLensFamiliesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, includeInactive]);

  const filteredFamilies = families.filter(
    (family) =>
      family.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (family.brand && family.brand.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const totalPages = Math.ceil(filteredFamilies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFamilies = filteredFamilies.slice(startIndex, endIndex);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Familias de Lentes de Contacto</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
            </Button>
            <Button size="sm" onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" /> Nueva Familia
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por nombre o marca..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <input checked={includeInactive} className="rounded" id="includeInactive" type="checkbox" onChange={(e) => setIncludeInactive(e.target.checked)} />
            <Label className="cursor-pointer" htmlFor="includeInactive">Incluir inactivas</Label>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Uso</TableHead>
                    <TableHead>Modalidad</TableHead>
                    <TableHead>Embalaje</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFamilies.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-center py-8" colSpan={7}>
                        No se encontraron familias
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedFamilies.map((family) => (
                      <TableRow key={family.id}>
                        <TableCell className="font-medium">{family.name}</TableCell>
                        <TableCell>{family.brand || "-"}</TableCell>
                        <TableCell>{USE_TYPES.find((t) => t.value === family.use_type)?.label}</TableCell>
                        <TableCell>{MODALITIES.find((m) => m.value === family.modality)?.label}</TableCell>
                        <TableCell>{PACKAGING_TYPES.find((p) => p.value === family.packaging)?.label}</TableCell>
                        <TableCell>
                          <Badge variant={family.is_active ? "default" : "secondary"}>
                            {family.is_active ? <><Eye className="h-3 w-3 mr-1" /> Activa</> : <><EyeOff className="h-3 w-3 mr-1" /> Inactiva</>}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => onEdit(family)}><Edit className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => onDelete(family.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredFamilies.length}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

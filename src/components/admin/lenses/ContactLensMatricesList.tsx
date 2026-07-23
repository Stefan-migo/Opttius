"use client";

import { Edit, Eye, EyeOff, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

import { ContactLensMatrixDialog } from "./_components/ContactLensMatrixDialog";
import { useContactLensMatrices } from "./_hooks/useContactLensMatrices";

export default function ContactLensMatricesList() {
  const {
    matrices, families, loading, searchTerm, setSearchTerm,
    selectedFamilyId, setSelectedFamilyId, includeInactive, setIncludeInactive,
    showDialog, setShowDialog, editingMatrix, formData, setFormData,
    currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
    totalMatrices, totalPages, fetchMatrices,
    handleSubmit, handleDelete, openEditDialog, openCreateDialog,
  } = useContactLensMatrices();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Matrices de Precios de Lentes de Contacto</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setIncludeInactive(!includeInactive)}>
              {includeInactive ? <><EyeOff className="h-4 w-4 mr-2" />Ocultar Inactivas</> : <><Eye className="h-4 w-4 mr-2" />Mostrar Inactivas</>}
            </Button>
            <Button size="sm" variant="outline" onClick={fetchMatrices}><RefreshCw className="h-4 w-4" /></Button>
            <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />Nueva Matriz</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Buscar por familia, marca o rango de esfera..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="w-full sm:w-64">
            <Select value={selectedFamilyId} onValueChange={setSelectedFamilyId}>
              <SelectTrigger><SelectValue placeholder="Todas las familias" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas las familias</SelectItem>{families.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : matrices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No se encontraron matrices de precios</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Familia</TableHead><TableHead>Marca</TableHead><TableHead>Rango Esfera</TableHead><TableHead>Rango Cilindro</TableHead><TableHead>Precio Base</TableHead><TableHead>Costo</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {matrices.map((matrix) => {
                  const family = matrix.contact_lens_families;
                  return (
                    <TableRow key={matrix.id}>
                      <TableCell className="font-medium">{family.name}</TableCell>
                      <TableCell>{family.brand || "-"}</TableCell>
                      <TableCell>{matrix.sphere_min} a {matrix.sphere_max}</TableCell>
                      <TableCell>{matrix.cylinder_min != null && matrix.cylinder_max != null ? `${matrix.cylinder_min} a ${matrix.cylinder_max}` : "N/A"}</TableCell>
                      <TableCell>{formatCurrency(matrix.base_price)}</TableCell>
                      <TableCell>{formatCurrency(matrix.cost)}</TableCell>
                      <TableCell><Badge variant={matrix.is_active ? "default" : "secondary"}>{matrix.is_active ? "Activa" : "Inactiva"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(matrix)}><Edit className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(matrix.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && totalMatrices > 0 && (
          <div className="mt-4">
            <Pagination currentPage={currentPage} itemsPerPage={itemsPerPage} itemsPerPageOptions={[10, 20, 50, 100]} totalItems={totalMatrices} totalPages={totalPages} onItemsPerPageChange={setItemsPerPage} onPageChange={setCurrentPage} />
          </div>
        )}

        <ContactLensMatrixDialog editingMatrix={editingMatrix} families={families} formData={formData} open={showDialog} onFormChange={setFormData} onOpenChange={setShowDialog} onSubmit={handleSubmit} />
      </CardContent>
    </Card>
  );
}

"use client";

import { Plus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";

import { MatrixDialog } from "./_components/MatrixDialog";
import type { MatrixFormData } from "./_components/MatrixDialog";
import { MatricesTable, SearchBar } from "./_components/LensMatricesListComponents";
import type { LensPriceMatrix, LensFamily } from "./types";

export default function LensMatricesList() {
  const [matrices, setMatrices] = useState<LensPriceMatrix[]>([]);
  const [families, setFamilies] = useState<LensFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);

  const [editingMatrix, setEditingMatrix] = useState<LensPriceMatrix | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const emptyForm: MatrixFormData = {
    lens_family_id: "", name: "", sphere_min: "", sphere_max: "",
    cylinder_min: "", cylinder_max: "", base_price: "", cost: "", is_active: true,
  };
  const [formData, setFormData] = useState<MatrixFormData>(emptyForm);

  const fetchFamilies = async () => {
    const { data } = await supabase.from("lens_families").select("id, name, brand, lens_type, lens_material").eq("is_active", true).order("name");
    if (data) setFamilies(data);
  };

  const fetchMatrices = async () => {
    setLoading(true);
    const { data } = await supabase.from("lens_price_matrices").select("*, lens_families(*)").order("lens_families(name)");
    if (data) setMatrices(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMatrix) {
      const { error } = await supabase.from("lens_price_matrices").update(formData).eq("id", editingMatrix.id);
      if (error) { toast.error("Error al actualizar"); return; }
      toast.success("Matriz actualizada");
    } else {
      const { error } = await supabase.from("lens_price_matrices").insert(formData);
      if (error) { toast.error("Error al crear"); return; }
      toast.success("Matriz creada");
    }
    setShowDialog(false);
    fetchMatrices();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta matriz?")) return;
    const { error } = await supabase.from("lens_price_matrices").delete().eq("id", id);
    if (error) { toast.error("Error al eliminar"); return; }
    toast.success("Matriz eliminada");
    fetchMatrices();
  };

  const handleToggleActive = async (matrix: LensPriceMatrix) => {
    const { error } = await supabase.from("lens_price_matrices").update({ is_active: !matrix.is_active }).eq("id", matrix.id);
    if (error) { toast.error("Error al cambiar estado"); return; }
    toast.success(`Matriz ${matrix.is_active ? "desactivada" : "activada"}`);
    fetchMatrices();
  };

  const resetForm = () => { setFormData(emptyForm); setEditingMatrix(null); };

  const openEditDialog = (matrix: LensPriceMatrix) => {
    setEditingMatrix(matrix);
    setFormData({
      lens_family_id: matrix.lens_family_id, name: matrix.name || "",
      sphere_min: String(matrix.sphere_min), sphere_max: String(matrix.sphere_max),
      cylinder_min: String(matrix.cylinder_min), cylinder_max: String(matrix.cylinder_max),
      base_price: String(matrix.base_price), cost: String(matrix.cost), is_active: matrix.is_active,
    });
    setShowDialog(true);
  };

  const openCreateDialog = () => { resetForm(); setShowDialog(true); };

  const filteredMatrices = matrices.filter((m) => {
    const matchesSearch = !searchTerm || m.lens_families?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFamily = familyFilter === "all" || m.lens_family_id === familyFilter;
    return matchesSearch && matchesFamily;
  });

  useEffect(() => { fetchFamilies(); fetchMatrices(); }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Matrices de Precios de Lentes Ópticos</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchMatrices}><RefreshCw className="h-4 w-4 mr-2" />Actualizar</Button>
            <Button size="sm" onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />Nueva Matriz</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <SearchBar
          searchTerm={searchTerm} familyFilter={familyFilter}
          families={families} onSearchChange={setSearchTerm} onFamilyFilterChange={setFamilyFilter}
        />

        <MatricesTable
          matrices={filteredMatrices} loading={loading}
          currentPage={currentPage} itemsPerPage={itemsPerPage}
          totalCount={filteredMatrices.length}
          onEdit={openEditDialog} onDelete={handleDelete} onToggleActive={handleToggleActive}
          onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage}
        />

        <MatrixDialog
          open={showDialog} editingMatrix={!!editingMatrix}
          formData={formData} families={families}
          onClose={() => { setShowDialog(false); resetForm(); }}
          onSubmit={handleSubmit} onChange={(d) => setFormData({ ...formData, ...d })}
        />
      </CardContent>
    </Card>
  );
}

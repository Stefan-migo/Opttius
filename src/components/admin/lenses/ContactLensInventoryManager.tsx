/**
 * ContactLensInventoryManager - Componente para gestionar inventario de LC
 * Se integra dentro de la pestaña Contactología
 */

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  contactLensInventoryService,
  type ContactLensInventory,
} from "@/lib/api/services/contactLensInventoryService";
import { formatCurrency } from "@/lib/utils";

interface ContactLensFamily {
  id: string;
  name: string;
  brand: string | null;
}

interface ContactLensInventoryManagerProps {
  families: ContactLensFamily[];
  branchId: string | null;
}

export default function ContactLensInventoryManager({
  families,
  branchId,
}: ContactLensInventoryManagerProps) {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("");
  const [inventory, setInventory] = useState<ContactLensInventory[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ContactLensInventory | null>(
    null,
  );

  // Form state
  const [formData, setFormData] = useState({
    sphereMin: "",
    sphereMax: "",
    cylinderMin: "0",
    cylinderMax: "0",
    quantity: "",
    minStockThreshold: "3",
  });

  // Load inventory when family or branch changes
  useEffect(() => {
    if (selectedFamilyId && branchId) {
      loadInventory();
    }
  }, [selectedFamilyId, branchId]);

  const loadInventory = async () => {
    if (!selectedFamilyId || !branchId) return;
    setLoading(true);
    try {
      const data = await contactLensInventoryService.getInventory(
        selectedFamilyId,
        branchId,
      );
      setInventory(data);
    } catch (error) {
      console.error("Error loading inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({
      sphereMin: "",
      sphereMax: "",
      cylinderMin: "0",
      cylinderMax: "0",
      quantity: "",
      minStockThreshold: "3",
    });
    setShowAddDialog(true);
  };

  const handleEdit = (item: ContactLensInventory) => {
    setEditingItem(item);
    setFormData({
      sphereMin: item.sphere_min.toString(),
      sphereMax: item.sphere_max.toString(),
      cylinderMin: item.cylinder_min.toString(),
      cylinderMax: item.cylinder_max.toString(),
      quantity: item.quantity.toString(),
      minStockThreshold: item.min_stock_threshold.toString(),
    });
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    if (!selectedFamilyId || !branchId) return;

    const data = {
      contact_lens_family_id: selectedFamilyId,
      branch_id: branchId,
      sphere_min: parseFloat(formData.sphereMin),
      sphere_max: parseFloat(formData.sphereMax),
      cylinder_min: parseFloat(formData.cylinderMin),
      cylinder_max: parseFloat(formData.cylinderMax),
      quantity: parseInt(formData.quantity),
      min_stock_threshold: parseInt(formData.minStockThreshold),
    };

    try {
      await contactLensInventoryService.createInventory(data);
      toast.success("Inventario actualizado correctamente");
      setShowAddDialog(false);
      loadInventory();
    } catch (error) {
      console.error("Error saving inventory:", error);
      toast.error("Error al guardar inventario");
    }
  };

  const selectedFamily = families.find((f) => f.id === selectedFamilyId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-display font-bold text-admin-text-primary uppercase tracking-[0.2em]">
            Inventario por Graduación
          </h3>
          <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest">
            Control de stock disponible por esfera y cilindro
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedFamilyId} onValueChange={setSelectedFamilyId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecciona una familia" />
            </SelectTrigger>
            <SelectContent>
              {families.map((family) => (
                <SelectItem key={family.id} value={family.id}>
                  {family.name} ({family.brand})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedFamilyId && branchId && (
            <Button onClick={handleAddNew} size="sm">
              Agregar Stock
            </Button>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      {selectedFamilyId && branchId ? (
        loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando inventario...
          </div>
        ) : inventory.length === 0 ? (
          <Card className="bg-admin-bg-tertiary">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No hay inventario registrado para esta familia
              </p>
              <Button className="mt-4" onClick={handleAddNew} variant="outline">
                Agregar primera entrada de inventario
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-admin-bg-tertiary">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Esfera</TableHead>
                  <TableHead>Cilindro</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Stock Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.sphere_min === item.sphere_max
                        ? `${item.sphere_min.toFixed(2)}`
                        : `${item.sphere_min.toFixed(2)} a ${item.sphere_max.toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      {item.cylinder_min === 0 && item.cylinder_max === 0
                        ? "Esférico"
                        : `${item.cylinder_min.toFixed(2)} a ${item.cylinder_max.toFixed(2)}`}
                    </TableCell>
                    <TableCell className="font-bold">{item.quantity}</TableCell>
                    <TableCell>{item.min_stock_threshold}</TableCell>
                    <TableCell>
                      {item.quantity > item.min_stock_threshold ? (
                        <Badge className="bg-green-100 text-green-700">
                          Disponible
                        </Badge>
                      ) : item.quantity > 0 ? (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          Bajo
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">
                          Sin Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      ) : (
        <Card className="bg-admin-bg-tertiary">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Selecciona una familia de lentes de contacto para ver su
              inventario
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Inventario" : "Agregar Inventario"}
            </DialogTitle>
            <DialogDescription>
              Configura el stock disponible para un rango de graduación
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Esfera Mínima</Label>
              <Input
                type="number"
                step="0.25"
                value={formData.sphereMin}
                onChange={(e) =>
                  setFormData({ ...formData, sphereMin: e.target.value })
                }
                placeholder="-6.00"
              />
            </div>
            <div>
              <Label>Esfera Máxima</Label>
              <Input
                type="number"
                step="0.25"
                value={formData.sphereMax}
                onChange={(e) =>
                  setFormData({ ...formData, sphereMax: e.target.value })
                }
                placeholder="-0.50"
              />
            </div>
            <div>
              <Label>Cilindro Mínimo</Label>
              <Input
                type="number"
                step="0.25"
                value={formData.cylinderMin}
                onChange={(e) =>
                  setFormData({ ...formData, cylinderMin: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label>Cilindro Máximo</Label>
              <Input
                type="number"
                step="0.25"
                value={formData.cylinderMax}
                onChange={(e) =>
                  setFormData({ ...formData, cylinderMax: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label>Cantidad (Cajas)</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="10"
              />
            </div>
            <div>
              <Label>Stock Mínimo</Label>
              <Input
                type="number"
                value={formData.minStockThreshold}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minStockThreshold: e.target.value,
                  })
                }
                placeholder="3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

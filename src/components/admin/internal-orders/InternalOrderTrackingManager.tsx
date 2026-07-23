"use client";

import { Building, Edit, MapPin, Plus, Trash2, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getPriorityBadge, getStatusBadge } from "./_components/OrderBadges";
import { OrderDialogs } from "./_components/OrderDialogs";
import { useInternalOrders } from "./_hooks/useInternalOrders";

export default function InternalOrderTrackingManager() {
  const {
    orders, branches, drivers, vehicles, loading,
    showOrderDialog, setShowOrderDialog,
    showDeleteDialog, setShowDeleteDialog,
    editingOrder, deletingItem,
    orderForm, setOrderForm,
    handleCreateOrder, handleEditOrder, handleDeleteOrder,
    handleSaveOrder, handleConfirmDelete,
  } = useInternalOrders();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Truck className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4 animate-pulse" />
          <p className="text-admin-text-tertiary">Cargando órdenes internas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-epoch-primary">Seguimiento de Órdenes Internas</h1>
          <p className="text-admin-text-tertiary">Gestiona las transferencias entre sucursales y el seguimiento logístico</p>
        </div>
        <Button onClick={handleCreateOrder}><Plus className="h-4 w-4 mr-2" />Nueva Orden Interna</Button>
      </div>

      <Card className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]" style={{ backgroundColor: "var(--admin-border-primary)" }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />Órdenes Internas</CardTitle>
              <CardDescription>{orders.length} {orders.length === 1 ? "orden" : "órdenes"} registradas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-16 w-16 text-admin-text-tertiary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-epoch-primary mb-2">No hay órdenes internas</h3>
              <p className="text-admin-text-tertiary mb-6">Crea órdenes para gestionar transferencias entre sucursales</p>
              <Button onClick={handleCreateOrder}><Plus className="h-4 w-4 mr-2" />Crear Primera Orden</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead><TableHead>Origen</TableHead><TableHead>Destino</TableHead>
                  <TableHead>Estado</TableHead><TableHead>Prioridad</TableHead><TableHead>Fecha Programada</TableHead><TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const origin = branches.find((b) => b.id === order.origin_branch_id);
                  const dest = branches.find((b) => b.id === order.destination_branch_id);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-admin-text-tertiary" />
                          <span>{origin?.name || order.origin_branch_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-admin-text-tertiary" />
                          <span>{dest?.name || order.destination_branch_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                      <TableCell>{order.scheduled_pickup_date ? new Date(order.scheduled_pickup_date).toLocaleDateString() : "Sin fecha"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditOrder(order)}><Edit className="h-4 w-4" /></Button>
                          <Button size="sm" variant="outline" onClick={() => handleDeleteOrder(order)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OrderDialogs
        branches={branches}
        deletingItem={deletingItem}
        drivers={drivers}
        editingOrder={editingOrder}
        orderForm={orderForm}
        showDeleteDialog={showDeleteDialog}
        showOrderDialog={showOrderDialog}
        vehicles={vehicles}
        onConfirmDelete={handleConfirmDelete}
        onDeleteDialogChange={setShowDeleteDialog}
        onFormChange={setOrderForm}
        onOrderDialogChange={setShowOrderDialog}
        onSave={handleSaveOrder}
      />
    </div>
  );
}

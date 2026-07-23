"use client";

import { Loader2, Plus, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FormField from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { OrderItem } from "./ManualOrderFormTypes";

interface CustomerInfoSectionProps {
  customerSearch: string;
  customerResults: unknown[];
  searchingCustomers: boolean;
  openCustomerSearch: boolean;
  email: string;
  onCustomerSearchChange: (v: string) => void;
  onCustomerOpenChange: (v: boolean) => void;
  onLoadCustomer: (c: unknown) => void;
  onEmailChange: (v: string) => void;
}

export function CustomerInfoSection({
  customerSearch, customerResults, searchingCustomers, openCustomerSearch,
  email, onCustomerSearchChange, onCustomerOpenChange, onLoadCustomer, onEmailChange,
}: CustomerInfoSectionProps) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-epoch-primary">Información del Cliente</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="relative customer-search-container">
          <Label>Buscar Cliente Existente</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input className="pl-10" placeholder="Buscar por email o nombre..." value={customerSearch} onChange={(e) => { onCustomerSearchChange(e.target.value); onCustomerOpenChange(true); }} />
            {searchingCustomers && <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
          </div>
          {openCustomerSearch && customerResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {customerResults.map((customer) => (
                <button className="w-full p-3 text-left hover:bg-gray-100 border-b last:border-b-0" key={(customer as { id: string }).id} type="button" onClick={() => onLoadCustomer(customer)}>
                  <div className="font-medium">{(customer as { name: string }).name}</div>
                  <div className="text-sm text-gray-600">{(customer as { email: string }).email}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <FormField required label="Email del Cliente">
          <Input required id="email" type="email" value={email} onChange={(e) => onEmailChange(e.target.value)} />
        </FormField>
      </CardContent>
    </Card>
  );
}

interface OrderDetailsSectionProps {
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  notes: string;
  onStatusChange: (v: string) => void;
  onPaymentStatusChange: (v: string) => void;
  onPaymentMethodChange: (v: string) => void;
  onNotesChange: (v: string) => void;
}

export function OrderDetailsSection({
  status, paymentStatus, paymentMethod, notes,
  onStatusChange, onPaymentStatusChange, onPaymentMethodChange, onNotesChange,
}: OrderDetailsSectionProps) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-epoch-primary">Detalles del Pedido</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Estado">
            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem><SelectItem value="processing">Procesando</SelectItem>
                <SelectItem value="shipped">Enviado</SelectItem><SelectItem value="delivered">Completado</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Estado del Pago">
            <Select value={paymentStatus} onValueChange={onPaymentStatusChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem><SelectItem value="paid">Pagado</SelectItem><SelectItem value="failed">Fallido</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <FormField label="Método de Pago">
          <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="transfer">Transferencia</SelectItem><SelectItem value="cash">Efectivo</SelectItem>
              <SelectItem value="check">Cheque</SelectItem><SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField description="Notas adicionales sobre el pedido" label="Notas del Pedido">
          <Textarea id="notes" placeholder="Notas adicionales sobre el pedido..." value={notes} onChange={(e) => onNotesChange(e.target.value)} />
        </FormField>
      </CardContent>
    </Card>
  );
}

interface ShippingSectionProps {
  shipping: { first_name: string; last_name: string; address_1: string; city: string; state: string; postal_code: string; phone: string };
  onShippingChange: (field: string, value: string) => void;
}

export function ShippingSection({ shipping, onShippingChange }: ShippingSectionProps) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-epoch-primary">Información de Envío</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nombre"><Input id="shipping_first_name" value={shipping.first_name} onChange={(e) => onShippingChange("first_name", e.target.value)} /></FormField>
          <FormField label="Apellido"><Input id="shipping_last_name" value={shipping.last_name} onChange={(e) => onShippingChange("last_name", e.target.value)} /></FormField>
        </div>
        <FormField label="Dirección"><Input id="shipping_address_1" value={shipping.address_1} onChange={(e) => onShippingChange("address_1", e.target.value)} /></FormField>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Ciudad"><Input id="shipping_city" value={shipping.city} onChange={(e) => onShippingChange("city", e.target.value)} /></FormField>
          <FormField label="Provincia"><Input id="shipping_state" value={shipping.state} onChange={(e) => onShippingChange("state", e.target.value)} /></FormField>
          <FormField label="Código Postal"><Input id="shipping_postal_code" value={shipping.postal_code} onChange={(e) => onShippingChange("postal_code", e.target.value)} /></FormField>
        </div>
        <FormField label="Teléfono"><Input id="shipping_phone" value={shipping.phone} onChange={(e) => onShippingChange("phone", e.target.value)} /></FormField>
      </CardContent>
    </Card>
  );
}

interface OrderItemsSectionProps {
  productSearch: string;
  productResults: unknown[];
  searchingProducts: boolean;
  openProductSearch: boolean;
  items: OrderItem[];
  totalAmount: number;
  onProductSearchChange: (v: string) => void;
  onProductOpenChange: (v: boolean) => void;
  onAddProduct: (p: unknown) => void;
  onAddItem: () => void;
  onRemoveItem: (i: number) => void;
  onUpdateItem: (i: number, field: string, value: unknown) => void;
  onCalculateTotal: () => void;
}

export function OrderItemsSection({
  productSearch, productResults, searchingProducts, openProductSearch,
  items, totalAmount,
  onProductSearchChange, onProductOpenChange, onAddProduct,
  onAddItem, onRemoveItem, onUpdateItem, onCalculateTotal,
}: OrderItemsSectionProps) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-epoch-primary">Productos del Pedido</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="relative product-search-container">
          <Label>Buscar Producto</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input className="pl-10" placeholder="Buscar productos por nombre..." value={productSearch} onChange={(e) => { onProductSearchChange(e.target.value); onProductOpenChange(true); }} />
            {searchingProducts && <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
          </div>
          {openProductSearch && productResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {productResults.map((product) => (
                <button className="w-full p-3 text-left hover:bg-gray-100 border-b last:border-b-0" key={(product as { id: string }).id} type="button" onClick={() => onAddProduct(product)}>
                  <div className="flex justify-between items-start">
                    <div><div className="font-medium">{(product as { name: string }).name}</div><div className="text-sm text-gray-600">Stock: {(product as { inventory_quantity: number }).inventory_quantity} unidades</div></div>
                    <div className="text-admin-success font-semibold">${(product as { price: number }).price.toFixed(2)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {items.map((item, index) => (
          <div className="flex gap-4 items-end p-3 bg-gray-50 rounded-lg" key={index}>
            <div className="flex-1"><Label>Nombre del Producto</Label><Input placeholder="Ej: Crema Hidratante Rosa Mosqueta" value={item.product_name} onChange={(e) => onUpdateItem(index, "product_name", e.target.value)} /></div>
            <div className="w-24"><Label>Cantidad</Label><Input min="1" type="number" value={item.quantity} onChange={(e) => onUpdateItem(index, "quantity", parseInt(e.target.value) || 1)} /></div>
            <div className="w-32"><Label>Precio Unitario</Label><Input min="0" step="0.01" type="number" value={item.unit_price} onChange={(e) => onUpdateItem(index, "unit_price", parseFloat(e.target.value) || 0)} /></div>
            <Button size="icon" type="button" variant="outline" onClick={() => onRemoveItem(index)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}

        <Button className="w-full" type="button" variant="outline" onClick={onAddItem}><Plus className="h-4 w-4 mr-2" />Agregar Producto Manual</Button>

        <div className="flex justify-between items-center pt-4 border-t">
          <div><div className="text-sm text-gray-600">Subtotal</div><div className="text-2xl font-bold text-admin-success">${(totalAmount ?? 0).toFixed(2)}</div></div>
          <Button type="button" variant="outline" onClick={onCalculateTotal}>Recalcular Total</Button>
        </div>
      </CardContent>
    </Card>
  );
}

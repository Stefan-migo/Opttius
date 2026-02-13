'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FormField, { FormFieldActions } from '@/components/ui/FormField';
import { Plus, Trash2, Search, User, Loader2 } from 'lucide-react';
import { extractDataFromResponse } from '@/lib/api/response-helpers';
import { useFormSimple } from '@/hooks/useForm';
import { success, error as notifyError } from '@/lib/services/notificationService';
import { handleApiError, getUserFriendlyMessage } from '@/lib/services/errorService';

interface CreateManualOrderFormProps {
  onSubmit: (orderData: any) => void;
  onCancel: () => void;
}

interface OrderItem {
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface ShippingInfo {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
}

interface OrderFormData {
  email: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  total_amount: number;
  notes: string;
  shipping: ShippingInfo;
  items: OrderItem[];
}

export default function CreateManualOrderForm({ onSubmit, onCancel }: CreateManualOrderFormProps) {
  const form = useFormSimple<OrderFormData>(
    {
      email: '',
      status: 'pending',
      payment_status: 'paid',
      payment_method: 'transfer',
      subtotal: 0,
      total_amount: 0,
      notes: '',
      shipping: {
        first_name: '',
        last_name: '',
        address_1: '',
        city: '',
        state: '',
        postal_code: '',
        phone: ''
      },
      items: []
    },
    async (data) => {
      await onSubmit(data);
    },
    {
      onSuccess: () => {
        success('Pedido creado exitosamente');
      },
      onError: (err: unknown) => {
        const standardError = handleApiError(err, 'CreateManualOrderForm');
        notifyError(getUserFriendlyMessage(standardError));
      }
    }
  );

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [openCustomerSearch, setOpenCustomerSearch] = useState(false);
  const [openProductSearch, setOpenProductSearch] = useState(false);

  // Search customers
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.length < 2) {
        setCustomerResults([]);
        return;
      }

      setSearchingCustomers(true);
      try {
        const response = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(customerSearch)}`);
        if (response.ok) {
          const data = await response.json();
          setCustomerResults(extractDataFromResponse(data));
        }
      } catch (error) {
        console.error('Error searching customers:', error);
      } finally {
        setSearchingCustomers(false);
      }
    };

    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [customerSearch]);

  // Search products
  useEffect(() => {
    const searchProducts = async () => {
      if (productSearch.length < 2) {
        setProductResults([]);
        return;
      }

      setSearchingProducts(true);
      try {
        const response = await fetch(`/api/admin/products/search?q=${encodeURIComponent(productSearch)}`);
        if (response.ok) {
          const data = await response.json();
          setProductResults(extractDataFromResponse(data));
        }
      } catch (error) {
        console.error('Error searching products:', error);
      } finally {
        setSearchingProducts(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [productSearch]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.customer-search-container')) {
        setOpenCustomerSearch(false);
      }
      if (!target.closest('.product-search-container')) {
        setOpenProductSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShippingChange = (field: string, value: string) => {
    const currentValues = form.getValues();
    form.setValue('shipping', {
      ...currentValues.shipping,
      [field]: value
    });
  };

  const loadCustomerData = (customer: any) => {
    form.setFieldValues({
      email: customer.email,
      shipping: {
        first_name: customer.name?.split(' ')[0] || '',
        last_name: customer.name?.split(' ').slice(1).join(' ') || '',
        address_1: customer.shipping_info?.address_1 || '',
        city: customer.shipping_info?.city || '',
        state: customer.shipping_info?.state || '',
        postal_code: customer.shipping_info?.postal_code || '',
        phone: customer.shipping_info?.phone || customer.phone || ''
      }
    });
    setCustomerSearch('');
    setOpenCustomerSearch(false);
  };

  const addProductToOrder = (product: any) => {
    form.setValue('items', [
      ...form.getValues().items,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price
      }
    ]);
    setProductSearch('');
    setOpenProductSearch(false);
    calculateTotal();
  };

  const addItem = () => {
    form.setValue('items', [
      ...form.getValues().items,
      { product_name: '', quantity: 1, unit_price: 0 }
    ]);
  };

  const removeItem = (index: number) => {
    form.setValue('items', form.getValues().items.filter((_: any, i: number) => i !== index));
    calculateTotal();
  };

  const updateItem = (index: number, field: string, value: any) => {
    form.setValue('items', form.getValues().items.map((item: any, i: number) =>
      i === index ? { ...item, [field]: value } : item
    ));
    calculateTotal();
  };

  const calculateTotal = () => {
    const itemsTotal = form.getValues().items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
    form.setFieldValues({
      subtotal: itemsTotal,
      total_amount: itemsTotal
    });
  };

  return (
    <form onSubmit={form.handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-azul-profundo">Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Search */}
          <div className="relative customer-search-container">
            <Label>Buscar Cliente Existente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por email o nombre..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setOpenCustomerSearch(true);
                }}
                className="pl-10"
              />
              {searchingCustomers && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>

            {/* Customer Results */}
            {openCustomerSearch && customerResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {customerResults.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => loadCustomerData(customer)}
                    className="w-full p-3 text-left hover:bg-gray-100 border-b last:border-b-0"
                  >
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-600">{customer.email}</div>
                    {customer.shipping_info?.city && (
                      <div className="text-xs text-gray-500 mt-1">
                        {customer.shipping_info.city}, {customer.shipping_info.state}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <FormField
            label="Email del Cliente"
            required
          >
            <Input
              id="email"
              type="email"
              value={form.getValues().email}
              onChange={(e) => form.setValue('email', e.target.value)}
              required
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-azul-profundo">Detalles del Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Estado">
              <Select value={form.getValues().status} onValueChange={(value) => form.setValue('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="processing">Procesando</SelectItem>
                  <SelectItem value="shipped">Enviado</SelectItem>
                  <SelectItem value="delivered">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Estado del Pago">
              <Select value={form.getValues().payment_status} onValueChange={(value) => form.setValue('payment_status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                  <SelectItem value="failed">Fallido</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Método de Pago">
            <Select value={form.getValues().payment_method} onValueChange={(value) => form.setValue('payment_method', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Notas del Pedido" description="Notas adicionales sobre el pedido">
            <Textarea
              id="notes"
              value={form.getValues().notes}
              onChange={(e) => form.setValue('notes', e.target.value)}
              placeholder="Notas adicionales sobre el pedido..."
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Shipping Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-azul-profundo">Información de Envío</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nombre">
              <Input
                id="shipping_first_name"
                value={form.getValues().shipping.first_name}
                onChange={(e) => handleShippingChange('first_name', e.target.value)}
              />
            </FormField>
            <FormField label="Apellido">
              <Input
                id="shipping_last_name"
                value={form.getValues().shipping.last_name}
                onChange={(e) => handleShippingChange('last_name', e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Dirección">
            <Input
              id="shipping_address_1"
              value={form.getValues().shipping.address_1}
              onChange={(e) => handleShippingChange('address_1', e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Ciudad">
              <Input
                id="shipping_city"
                value={form.getValues().shipping.city}
                onChange={(e) => handleShippingChange('city', e.target.value)}
              />
            </FormField>
            <FormField label="Provincia">
              <Input
                id="shipping_state"
                value={form.getValues().shipping.state}
                onChange={(e) => handleShippingChange('state', e.target.value)}
              />
            </FormField>
            <FormField label="Código Postal">
              <Input
                id="shipping_postal_code"
                value={form.getValues().shipping.postal_code}
                onChange={(e) => handleShippingChange('postal_code', e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Teléfono">
            <Input
              id="shipping_phone"
              value={form.getValues().shipping.phone}
              onChange={(e) => handleShippingChange('phone', e.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-azul-profundo">Productos del Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product Search */}
          <div className="relative product-search-container">
            <Label>Buscar Producto</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar productos por nombre..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setOpenProductSearch(true);
                }}
                className="pl-10"
              />
              {searchingProducts && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>

            {/* Product Results */}
            {openProductSearch && productResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {productResults.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProductToOrder(product)}
                    className="w-full p-3 text-left hover:bg-gray-100 border-b last:border-b-0"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-600">
                          Stock: {product.inventory_quantity} unidades
                        </div>
                      </div>
                      <div className="text-verde-suave font-semibold">
                        ${product.price.toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Products */}
          {form.getValues().items.map((item: OrderItem, index: number) => (
            <div key={index} className="flex gap-4 items-end p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <Label>Nombre del Producto</Label>
                <Input
                  value={item.product_name}
                  onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                  placeholder="Ej: Crema Hidratante Rosa Mosqueta"
                />
              </div>
              <div className="w-24">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => {
                    updateItem(index, 'quantity', parseInt(e.target.value) || 1);
                  }}
                />
              </div>
              <div className="w-32">
                <Label>Precio Unitario</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(e) => {
                    updateItem(index, 'unit_price', parseFloat(e.target.value) || 0);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addItem}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Producto Manual
          </Button>

          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              <div className="text-sm text-gray-600">Subtotal</div>
              <div className="text-2xl font-bold text-verde-suave">${form.getValues().total_amount.toFixed(2)}</div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={calculateTotal}
            >
              Recalcular Total
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <FormFieldActions align="space-between">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={form.isSubmitting}
        >
          {form.isSubmitting ? 'Creando...' : 'Crear Pedido'}
        </Button>
      </FormFieldActions>
    </form>
  );
}

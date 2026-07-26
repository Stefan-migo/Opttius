"use client";

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormFieldActions } from "@/components/ui/FormField";
import { useBranch } from "@/hooks/useBranch";
import { useFormSimple } from "@/hooks/useForm";
import { getUserFriendlyMessage,handleApiError } from "@/lib/api/services/errorService";
import { error as notifyError, success } from "@/lib/api/services/notificationService";

import { CustomerInfoSection, OrderDetailsSection, OrderItemsSection, ShippingSection } from "./_components/ManualOrderFormSections";
import type { OrderFormData } from "./_components/ManualOrderFormTypes";
import { calculateTotal, useClickOutside, useCustomerSearch, useProductSearch } from "./_hooks/useManualOrderForm";

interface CreateManualOrderFormProps {
  onSubmit: (orderData: unknown) => void;
  onCancel: () => void;
}

export default function CreateManualOrderForm({ onSubmit, onCancel }: CreateManualOrderFormProps) {
  const { currentBranchId } = useBranch();
  const form = useFormSimple<OrderFormData>(
    { email: "", status: "pending", payment_status: "paid", payment_method: "transfer", subtotal: 0, total_amount: 0, notes: "", shipping: { first_name: "", last_name: "", address_1: "", city: "", state: "", postal_code: "", phone: "" }, items: [] },
    async (data) => { await onSubmit(data); },
    { onSuccess: () => success("Pedido creado exitosamente"), onError: (err: unknown) => { const e = handleApiError(err, "CreateManualOrderForm"); notifyError(getUserFriendlyMessage(e)); } },
  );

  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const { customerResults, searchingCustomers, openCustomerSearch, setOpenCustomerSearch } = useCustomerSearch(customerSearch, currentBranchId);
  const { productResults, searchingProducts, openProductSearch, setOpenProductSearch } = useProductSearch(productSearch);
  useClickOutside(setOpenCustomerSearch, setOpenProductSearch);

  const getForm = () => form.getValues() as OrderFormData;

  const handleShippingChange = (field: string, value: string) => {
    form.setValue("shipping", { ...getForm().shipping, [field]: value });
  };

  const loadCustomerData = (customer: Record<string, unknown>) => {
    form.setFieldValues({
      email: customer.email as string,
      shipping: {
        first_name: ((customer.name as string) || "").split(" ")[0] || "",
        last_name: ((customer.name as string) || "").split(" ").slice(1).join(" ") || "",
        address_1: (customer.shipping_info as Record<string, string>)?.address_1 || "",
        city: (customer.shipping_info as Record<string, string>)?.city || "",
        state: (customer.shipping_info as Record<string, string>)?.state || "",
        postal_code: (customer.shipping_info as Record<string, string>)?.postal_code || "",
        phone: (customer.shipping_info as Record<string, string>)?.phone || (customer.phone as string) || "",
      },
    });
    setCustomerSearch("");
    setOpenCustomerSearch(false);
  };

  const addProductToOrder = (product: Record<string, unknown>) => {
    form.setValue("items", [...getForm().items, { product_id: product.id as string, product_name: product.name as string, quantity: 1, unit_price: product.price as number }]);
    setProductSearch("");
    setOpenProductSearch(false);
    form.setFieldValues(calculateTotal(getForm().items));
  };

  const items = getForm().items;
  const addItem = () => form.setValue("items", [...items, { product_name: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (index: number) => { form.setValue("items", items.filter((_, i: number) => i !== index)); form.setFieldValues(calculateTotal(getForm().items)); };
  const updateItem = (index: number, field: string, value: unknown) => { form.setValue("items", items.map((item: Record<string, unknown>, i: number) => i === index ? { ...item, [field]: value } : item)); form.setFieldValues(calculateTotal(getForm().items)); };

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit}>
      <CustomerInfoSection customerResults={customerResults} customerSearch={customerSearch} email={form.values.email} openCustomerSearch={openCustomerSearch} searchingCustomers={searchingCustomers} onCustomerOpenChange={setOpenCustomerSearch} onCustomerSearchChange={setCustomerSearch} onEmailChange={(v) => form.setValue("email", v)} onLoadCustomer={loadCustomerData} />
      <OrderDetailsSection notes={form.values.notes} paymentMethod={form.values.payment_method} paymentStatus={form.values.payment_status} status={form.values.status} onNotesChange={(v) => form.setValue("notes", v)} onPaymentMethodChange={(v) => form.setValue("payment_method", v)} onPaymentStatusChange={(v) => form.setValue("payment_status", v)} onStatusChange={(v) => form.setValue("status", v)} />
      <ShippingSection shipping={form.values.shipping} onShippingChange={handleShippingChange} />
      <OrderItemsSection items={items} openProductSearch={openProductSearch} productResults={productResults} productSearch={productSearch} searchingProducts={searchingProducts} totalAmount={form.values.total_amount} onAddItem={addItem} onAddProduct={addProductToOrder} onCalculateTotal={() => form.setFieldValues(calculateTotal(form.getValues().items))} onProductOpenChange={setOpenProductSearch} onProductSearchChange={setProductSearch} onRemoveItem={removeItem} onUpdateItem={updateItem} />
      <FormFieldActions align="space-between">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button disabled={form.isSubmitting} type="submit">{form.isSubmitting ? "Creando..." : "Crear Pedido"}</Button>
      </FormFieldActions>
    </form>
  );
}

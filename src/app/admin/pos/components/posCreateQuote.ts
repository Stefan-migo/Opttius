/**
 * posCreateQuote — Quote creation action extracted from posDataLoader.ts.
 *
 * Contains the createQuote flow including quick customer creation.
 */
import { toast } from "sonner";

import { createCustomer } from "@/lib/api/services/customerService";
import { createQuote } from "@/lib/api/services/quoteService";

export interface CreateQuoteParams {
  customer: {
    id: string;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    rut?: string | null;
    business_name?: string | null;
  } | null;
  quickCustomerName?: string | null;
  quickCustomerRUT?: string | null;
  quickCustomerEmail?: string | null;
  quickCustomerPhone?: string | null;
  branchId: string | null;
  selectedPrescription:
    | import("@/lib/api/services/customerService").Prescription
    | null;
  selectedFrame: {
    id: string;
    name: string;
    price: number;
    brand?: string;
    sku?: string;
  } | null;
  selectedNearFrame: {
    id: string;
    name: string;
    price: number;
    brand?: string;
    sku?: string;
  } | null;
  orderFormData: {
    lens_family_id: string | null;
    lens_family_name: string | null;
    near_lens_family_id: string | null;
    near_lens_family_name: string | null;
    lens_type: string;
    lens_sourcing_type: string;
    presbyopia_solution: string;
    treatment_ids: string[];
    labor_cost: number;
    frame_name: string;
    frame_sku: string;
    near_frame_name: string;
    near_frame_sku: string;
    customer_own_frame: boolean;
    notes: string;
  };
  customerOwnNearFrame: boolean;
  lensPrice: () => number;
  treatmentsPrice: number;
  totalPrice: () => number;
  discountAmount: () => number;
}

export async function handleCreateQuoteAction(
  params: CreateQuoteParams,
  onStateChange: {
    setCreatingQuote: (v: boolean) => void;
    onCustomerChange: (c: unknown) => void;
  },
): Promise<void> {
  const {
    customer,
    quickCustomerName,
    quickCustomerRUT,
    quickCustomerEmail,
    quickCustomerPhone,
    branchId,
    selectedPrescription,
    selectedFrame,
    selectedNearFrame,
    orderFormData,
    customerOwnNearFrame,
    lensPrice,
    treatmentsPrice,
    totalPrice,
    discountAmount,
  } = params;
  const { setCreatingQuote, onCustomerChange } = onStateChange;

  const isQuickCustomer = !customer && (quickCustomerName || quickCustomerRUT);

  if (!customer && !isQuickCustomer) {
    toast.error("Selecciona un cliente primero");
    return;
  }

  setCreatingQuote(true);
  try {
    let customerId = customer?.id;

    if (!branchId) {
      toast.error("Selecciona una sucursal primero");
      setCreatingQuote(false);
      return;
    }

    if (isQuickCustomer) {
      const trimmedName = (quickCustomerName || "").trim();
      if (!trimmedName) {
        toast.error("El nombre del cliente es requerido");
        setCreatingQuote(false);
        return;
      }

      try {
        const nameParts = trimmedName.split(" ");
        const firstName = nameParts[0];
        const lastName =
          nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

        const newCustomer = await createCustomer({
          first_name: firstName,
          last_name: lastName || undefined,
          email: quickCustomerEmail?.trim() || undefined,
          phone: quickCustomerPhone?.trim() || undefined,
          rut: quickCustomerRUT?.trim() || undefined,
          branch_id: branchId ?? undefined,
        });

        customerId = newCustomer.id;
        toast.success("Cliente creado exitosamente");
      } catch {
        toast.error("Error al crear el cliente");
        setCreatingQuote(false);
        return;
      }
    }

    if (!branchId) {
      toast.error("Selecciona una sucursal primero");
      setCreatingQuote(false);
      return;
    }

    const quoteData = {
      customer_id: customerId!,
      status: "draft" as const,
      subtotal: totalPrice(),
      tax_amount: 0,
      discount_amount: discountAmount(),
      total_amount: totalPrice() - discountAmount(),
      currency: "CLP",
      notes: orderFormData.notes || undefined,
      branch_id: branchId,
      prescription_id: selectedPrescription?.id || null,
      frame_product_id: selectedFrame?.id || null,
      customer_own_frame: orderFormData.customer_own_frame,
      frame_name: orderFormData.frame_name || selectedFrame?.name || null,
      frame_brand: selectedFrame?.brand || null,
      frame_model: selectedFrame?.name || null,
      frame_sku: orderFormData.frame_sku || selectedFrame?.sku || null,
      frame_price: selectedFrame?.price || 0,
      lens_family_id: orderFormData.lens_family_id,
      lens_family_name: orderFormData.lens_family_name,
      lens_type: orderFormData.lens_type,
      lens_treatments: orderFormData.treatment_ids,
      treatments_cost: treatmentsPrice,
      labor_cost: orderFormData.labor_cost,
      presbyopia_solution:
        orderFormData.presbyopia_solution === "single"
          ? ("bifocal" as const)
          : orderFormData.presbyopia_solution === "two_separate"
            ? ("two_separate" as const)
            : ("progressive" as const),
      far_lens_family_id: orderFormData.lens_family_id,
      near_lens_family_id: orderFormData.near_lens_family_id,
      far_lens_cost:
        orderFormData.presbyopia_solution === "two_separate"
          ? 45000
          : lensPrice(),
      near_lens_cost:
        orderFormData.presbyopia_solution === "two_separate"
          ? 35000
          : (undefined as number | undefined),
      near_frame_product_id: selectedNearFrame?.id || null,
      near_frame_name:
        orderFormData.near_frame_name || selectedNearFrame?.name || null,
      near_frame_brand: selectedNearFrame?.brand || null,
      near_frame_model: selectedNearFrame?.name || null,
      near_frame_sku:
        orderFormData.near_frame_sku || selectedNearFrame?.sku || null,
      near_frame_price: selectedNearFrame?.price || 0,
      customer_own_near_frame: customerOwnNearFrame,
    };

    const quote = await createQuote(quoteData);
    toast.success(
      isQuickCustomer
        ? "Cliente y presupuesto creados exitosamente"
        : "Presupuesto creado exitosamente",
    );
    window.open(`/admin/quotes/${quote.id}/print`, "_blank");
  } catch (error) {
    if (error instanceof Response) {
      error
        .json()
        .then((err) => {
          toast.error(err.error || "Error al crear el presupuesto");
        })
        .catch(() => {
          toast.error("Error al crear el presupuesto");
        });
    } else if (error instanceof Error) {
      toast.error(error.message || "Error al crear el presupuesto");
    } else {
      toast.error("Error al crear el presupuesto");
    }
  } finally {
    setCreatingQuote(false);
  }
}

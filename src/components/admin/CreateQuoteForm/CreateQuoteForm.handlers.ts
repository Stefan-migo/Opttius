export function createCustomerHandlers(
  setSelectedCustomer: (c: unknown) => void,
  setCustomerSearch: (s: string) => void,
  setCustomerResults: (r: unknown[]) => void,
  setSelectedPrescription: (p: unknown) => void,
  setPrescriptions: (p: unknown[]) => void,
) {
  return {
    onCustomerSelect: (c: unknown) => { setSelectedCustomer(c); setCustomerSearch(""); setCustomerResults([]); },
    onCustomerClear: () => { setSelectedCustomer(null); setSelectedPrescription(null); setPrescriptions([]); },
  };
}

export function createFrameHandlers(
  setCustomerOwnFrame: (v: boolean) => void,
  setSelectedFrame: (f: unknown) => void,
  setFormData: React.Dispatch<React.SetStateAction<unknown>>,
  setFrameSearch: (s: string) => void,
  setFrameResults: (r: unknown[]) => void,
) {
  return {
    onCustomerOwnFrameChange: (checked: boolean) => {
      setCustomerOwnFrame(checked);
      setFormData((prev: Record<string, unknown>) => ({
        ...prev,
        customer_own_frame: checked,
        ...(checked ? { frame_product_id: "", frame_price: 0, frame_cost: 0 } : {}),
      }));
      if (checked) setSelectedFrame(null);
    },
    onFrameSelect: (frame: unknown) => {
      setSelectedFrame(frame);
      const f = frame as Record<string, unknown>;
      setFormData((prev: Record<string, unknown>) => ({
        ...prev, frame_product_id: f.id, frame_name: f.name, frame_brand: f.frame_brand || "",
        frame_model: f.frame_model || "", frame_color: f.frame_color || "", frame_size: f.frame_size || "",
        frame_sku: f.sku || "", frame_price: (f.price as number) || 0,
        frame_price_includes_tax: f.price_includes_tax || false, frame_cost: (f.price as number) || 0,
      }));
      setFrameSearch(""); setFrameResults([]);
    },
    onFrameClear: () => {
      setSelectedFrame(null);
      setFormData((prev: Record<string, unknown>) => ({
        ...prev, frame_product_id: "", frame_name: "", frame_brand: "", frame_model: "",
        frame_color: "", frame_size: "", frame_sku: "", frame_price: 0, frame_cost: 0,
      }));
    },
  };
}

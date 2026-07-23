"use client";

import ShippingCarrierForm from "./ShippingCarrierForm";
import ShippingRateEditor from "./ShippingRateEditor";
import ShippingZoneManager from "./ShippingZoneManager";

export default function ShippingManager() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-azul-profundo">
            Gestión de Envíos
          </h2>
          <p className="text-tierra-media">
            Configura zonas, tarifas y transportistas
          </p>
        </div>
      </div>
      <ShippingZoneManager />
      <ShippingRateEditor />
      <ShippingCarrierForm />
    </div>
  );
}

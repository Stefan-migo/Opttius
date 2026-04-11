"use client";

import { Suspense } from "react";

import { CheckoutPageContent } from "@/components/checkout/CheckoutPageContent";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando checkout…</div>}>
      <CheckoutPageContent />
    </Suspense>
  );
}

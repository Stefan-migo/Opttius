"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Redirect: La configuración POS está en Sistema > Boletas y Facturas.
 * Esta ruta redirige para mantener compatibilidad con enlaces antiguos.
 */
export default function POSSettingsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/system?tab=billing");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <p className="text-sm text-muted-foreground">
        Redirigiendo a Sistema → Boletas y Facturas...
      </p>
    </div>
  );
}

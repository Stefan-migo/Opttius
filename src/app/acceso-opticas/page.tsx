"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Página exclusiva para ópticas conocidas.
 * Redirige a /signup?access=opticas para que el signup no bloquee por signup_enabled=false.
 * La validación de ?key=XXX se hace en middleware (DEMO_OPTICAS_ACCESS_KEY).
 */
export default function AccesoOpticasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("access", "opticas");
    const key = searchParams.get("key");
    if (key) params.set("key", key);
    router.replace(`/signup?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-epoch-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-epoch-primary" />
    </div>
  );
}

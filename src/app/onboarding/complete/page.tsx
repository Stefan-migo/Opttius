"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, ArrowRight, Building2, Loader2 } from "lucide-react";

export default function OnboardingCompletePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [organizationInfo, setOrganizationInfo] = useState<{
    name: string;
    slug: string;
  } | null>(null);

  useEffect(() => {
    const fetchOrganizationInfo = async () => {
      if (!user || authLoading) return;

      try {
        const response = await fetch("/api/admin/check-status");
        const data = await response.json();

        if (data.organization?.hasOrganization) {
          // Obtener información de la organización usando el endpoint GET
          const orgResponse = await fetch("/api/admin/organizations");
          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            if (orgData.organization) {
              setOrganizationInfo({
                name: orgData.organization.name,
                slug: orgData.organization.slug,
              });
            }
          } else {
            console.warn(
              "Could not fetch organization details:",
              orgResponse.status,
            );
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching organization info:", err);
        setIsLoading(false);
      }
    };

    fetchOrganizationInfo();
  }, [user, authLoading]);

  const handleGoToAdmin = () => {
    // Usar router.push en lugar de full reload para preservar la sesión.
    // router.refresh() invalida la caché de Next.js (branches, notifications).
    router.refresh();
    router.push("/admin");
  };

  // Mostrar loading mientras se verifica autenticación
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--admin-bg-primary)]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Preparando tu entorno...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, redirigir a login
  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--admin-bg-primary)] px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl">
          <CardHeader className="space-y-1 pb-6 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              ¡Tu óptica está lista!
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Ya puedes usar el panel de administración
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {organizationInfo && (
              <div className="bg-[var(--admin-border-primary)] border border-[var(--accent-foreground)] rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-900">
                  <Building2 className="h-5 w-5" />
                  <span className="font-semibold">{organizationInfo.name}</span>
                </div>
                <p className="text-sm text-blue-700">
                  Identificador:{" "}
                  <code className="bg-blue-100 px-1 rounded">
                    {organizationInfo.slug}
                  </code>
                </p>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Tu organización ha sido creada exitosamente. Ahora puedes:
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Gestionar productos e inventario</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Crear y gestionar clientes</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Agendar citas y crear presupuestos</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Procesar ventas en el punto de venta</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={handleGoToAdmin}
              className="w-full bg-[var(--accent-foreground)]"
              size="lg"
            >
              Ir al panel
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

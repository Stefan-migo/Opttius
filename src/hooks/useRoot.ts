import { useEffect, useState } from "react";

import { useAuthContext } from "@/contexts/AuthContext";

/**
 * Hook para verificar si el usuario actual tiene rol root o dev
 * Útil para mostrar/ocultar funcionalidades de gestión SaaS
 * Usa el API de check-status para evitar problemas con RLS
 */
export function useRoot() {
  const { user } = useAuthContext();
  const [isRoot, setIsRoot] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkRootStatus = async () => {
      if (!user) {
        setIsRoot(false);
        setIsLoading(false);
        return;
      }

      try {
        // Usar el API de check-status que ya maneja RLS correctamente
        const response = await fetch("/api/admin/check-status");

        if (!response.ok) {
          setIsRoot(false);
          setIsLoading(false);
          return;
        }

        const data = await response.json();

        // Verificar si el usuario es root/dev desde la respuesta del API
        const isRootUser = data.organization?.isRootUser || false;
        setIsRoot(isRootUser);
      } catch (error) {
        console.error("Error checking root status:", error);
        setIsRoot(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkRootStatus();
  }, [user?.id]);

  return { isRoot, isLoading };
}

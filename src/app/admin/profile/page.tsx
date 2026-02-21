"use client";

import { Suspense } from "react";
import { ProfilePageContent } from "@/components/profile";
import { Loader2 } from "lucide-react";

function ProfilePageInner() {
  return (
    <ProfilePageContent
      variant="admin"
      title="Mi Perfil Administrativo"
      subtitle="Gestiona tu información personal, preferencias y seguridad de acceso."
    />
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando perfil...</p>
          </div>
        </div>
      }
    >
      <ProfilePageInner />
    </Suspense>
  );
}

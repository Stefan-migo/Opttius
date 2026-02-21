"use client";

import { Suspense } from "react";
import { ProfilePageContent } from "@/components/profile";
import { Loader2 } from "lucide-react";

function ProfilePageInner() {
  return (
    <ProfilePageContent
      variant="public"
      title="Mi Perfil"
      subtitle="Gestiona tu información personal, preferencias y configuración de cuenta con seguridad."
    />
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      }
    >
      <ProfilePageInner />
    </Suspense>
  );
}

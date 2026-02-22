"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Settings, History, BarChart3, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmailTemplatesManager from "@/components/admin/EmailTemplatesManager";

export default function SaasEmailsPage() {
  const [activeTab, setActiveTab] = useState("templates");
  const router = useRouter();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/saas-management/dashboard")}
          title="Volver al dashboard"
          className="rounded-none text-epoch-primary hover:bg-epoch-primary/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
            Gestión de Emails SaaS
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra las comunicaciones B2B de la plataforma Opttius
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="admin-card bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Mail className="h-8 w-8 text-epoch-primary" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Enviados (vía Resend)
                </p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="admin-card bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <BarChart3 className="h-8 w-8 text-admin-success" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Tasa de Apertura
                </p>
                <p className="text-2xl font-bold">42.5%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="admin-card bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Settings className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Dominios Verificados
                </p>
                <p className="text-2xl font-bold text-admin-success">Activo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="flex w-full justify-start gap-1 h-auto bg-transparent border-b rounded-none">
          <TabsTrigger
            value="templates"
            className="rounded-t-lg data-[state=active]:bg-white"
          >
            Plantillas
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-t-lg data-[state=active]:bg-white"
          >
            <History className="h-4 w-4 mr-1" />
            Historial
          </TabsTrigger>
          <TabsTrigger
            value="config"
            className="rounded-t-lg data-[state=active]:bg-white"
          >
            Configuración Resend
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <EmailTemplatesManager mode="saas" />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="admin-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              El historial de envíos de Resend estará disponible próximamente.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <Card className="admin-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Configuración Global de Correo
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                La configuración de Resend se maneja a través de variables de
                entorno y el panel de control de Resend.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between p-2 border-b">
                  <span>Remitente SaaS</span>
                  <code className="text-blue-600">noreply@opttius.cl</code>
                </div>
                <div className="flex justify-between p-2 border-b">
                  <span>Región Resend</span>
                  <span>US-East (AWS N. Virginia)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

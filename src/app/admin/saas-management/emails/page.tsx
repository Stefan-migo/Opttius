"use client";

import {
  ArrowLeft,
  BarChart3,
  History,
  Mail,
  MousePointer,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EmailEventsHistory } from "@/components/admin/EmailEventsHistory";
import EmailTemplatesManager from "@/components/admin/EmailTemplatesManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmailMetrics {
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
  period: string;
}

export default function SaasEmailsPage() {
  const [activeTab, setActiveTab] = useState("templates");
  const router = useRouter();
  const [metrics, setMetrics] = useState<EmailMetrics | null>(null);

  useEffect(() => {
    fetch("/api/admin/saas-management/email-metrics")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setMetrics(data))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          className="rounded-xl text-epoch-primary hover:bg-epoch-primary/10"
          size="icon"
          title="Volver al dashboard"
          variant="ghost"
          onClick={() => router.push("/admin/saas-management/dashboard")}
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
                  Total Entregados (30d)
                </p>
                <p className="text-2xl font-bold">
                  {metrics ? metrics.totalDelivered.toLocaleString() : "—"}
                </p>
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
                <p className="text-2xl font-bold">
                  {metrics ? `${metrics.openRate}%` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="admin-card bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <MousePointer className="h-8 w-8 text-epoch-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Tasa de Clics</p>
                <p className="text-2xl font-bold">
                  {metrics ? `${metrics.clickRate}%` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        className="space-y-6"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="flex w-full justify-start gap-1 h-auto bg-transparent border-b rounded-xl">
          <TabsTrigger
            className="rounded-t-lg data-[state=active]:bg-white"
            value="templates"
          >
            Plantillas
          </TabsTrigger>
          <TabsTrigger
            className="rounded-t-lg data-[state=active]:bg-white"
            value="history"
          >
            <History className="h-4 w-4 mr-1" />
            Historial
          </TabsTrigger>
          <TabsTrigger
            className="rounded-t-lg data-[state=active]:bg-white"
            value="config"
          >
            Configuración Resend
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-6" value="templates">
          <EmailTemplatesManager mode="saas" />
        </TabsContent>

        <TabsContent className="space-y-6" value="history">
          <EmailEventsHistory />
        </TabsContent>

        <TabsContent className="space-y-6" value="config">
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

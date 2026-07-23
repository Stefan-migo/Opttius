"use client";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CreditCard,
  HelpCircle,
  Mail,
  MessageCircle,
  RotateCcw,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface SystemNavGridProps {
  telemetryEnabled: boolean;
  onToggleTelemetry: (enabled: boolean) => void;
  updatingTelemetry: boolean;
  onShowResetDemoDialogChange: (open: boolean) => void;
}

export function SystemNavGrid({
  telemetryEnabled,
  onToggleTelemetry,
  updatingTelemetry,
  onShowResetDemoDialogChange,
}: SystemNavGridProps) {
  const router = useRouter();

  return (
    <>
      <div className="grid grid-cols-1 gap-6">
        <Card
          className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-[#C5A059]"
          onClick={() => router.push("/admin/saas-management/backups")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#C5A059]/20 rounded-lg">
                  <Shield className="h-6 w-6 text-[#C5A059]" />
                </div>
                <div>
                  <CardTitle className="text-white">
                    SaaS Disaster Recovery & Backups
                  </CardTitle>
                  <p className="text-sm text-white/50 mt-1">
                    Gestión integral de respaldos del servidor y descarga de
                    volcados SQL
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-white/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Triple
                  Capa de Seguridad Activa
                </div>
                <ul className="text-xs text-white/50 space-y-2 list-disc pl-5">
                  <li>Backups individuales por organización (diarios)</li>
                  <li>Backups integrales de todo el SaaS (semanales)</li>
                  <li>Cifrado AES-256 de archivos en reposo</li>
                </ul>
              </div>
              <div className="flex-1 border-l border-white/10 pl-6">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <AlertCircle className="h-4 w-4 text-amber-400" /> Estado del
                  Sistema
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                  </span>
                  <span className="text-xs text-white/50">
                    Almacenamiento Conectado & Protegido
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="bg-white/5 border-white/10 border-l-4 border-l-[#C5A059]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#C5A059]" />
                <CardTitle className="text-lg text-white">
                  Estado de Telemetría
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${telemetryEnabled ? "text-emerald-400" : "text-red-400"}`}
                >
                  {telemetryEnabled ? "Activa" : "Inactiva"}
                </span>
                <Switch
                  checked={telemetryEnabled}
                  disabled={updatingTelemetry}
                  onCheckedChange={onToggleTelemetry}
                />
              </div>
            </div>
            <p className="text-xs text-white/50 mt-1">
              Control global de recolección de métricas y tracking de eventos.
            </p>
          </CardHeader>
        </Card>
        <Card className="bg-white/5 border-white/10 border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-lg text-white">
                Salud del Sistema
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-medium text-emerald-400">
                  Sistemas operacionales
                </span>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Gestión del Sistema</CardTitle>
          <p className="text-sm text-white/50 mt-2">
            Acceso rápido a las herramientas de administración SaaS
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                path: "/admin/saas-management/analytics",
                icon: BarChart3,
                title: "Analytics Dashboard",
                desc: "Telemetría y métricas de uso del sistema",
              },
              {
                path: "/admin/saas-management/organizations",
                icon: Building2,
                title: "Organizaciones",
                desc: "Gestionar todas las organizaciones",
              },
              {
                path: "/admin/saas-management/users",
                icon: Users,
                title: "Usuarios",
                desc: "Administrar usuarios globales",
              },
              {
                path: "/admin/saas-management/subscriptions",
                icon: CreditCard,
                title: "Suscripciones",
                desc: "Gestionar suscripciones activas",
              },
              {
                path: "/admin/saas-management/tiers",
                icon: Settings,
                title: "Tiers",
                desc: "Configurar planes de suscripción",
              },
              {
                path: "/admin/saas-management/config",
                icon: Settings,
                title: "Configuración SaaS",
                desc: "Período de prueba por defecto y parámetros",
              },
              {
                path: "/admin/saas-management/new-users-flow",
                icon: Users,
                title: "Flujos de Nuevos Usuarios",
                desc: "Solicitudes demo, ópticas conocidas y aprobaciones",
              },
              {
                path: "/admin/saas-management/support",
                icon: HelpCircle,
                title: "Soporte",
                desc: "Búsqueda rápida y resolución",
              },
              {
                path: "/admin/saas-management/emails",
                icon: Mail,
                title: "Emails",
                desc: "Configurar plantillas y comunicaciones SaaS",
              },
              {
                path: "/admin/saas-management/whatsapp",
                icon: MessageCircle,
                title: "WhatsApp",
                desc: "Configurar números y ver conversaciones",
              },
              {
                path: "/admin/saas-management/payments",
                icon: Zap,
                title: "Pasarelas de Pago",
                desc: "Habilitar/deshabilitar métodos de pago",
              },
            ].map((item) => (
              <Card
                className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-[#C5A059]"
                key={item.path}
                onClick={() => router.push(item.path)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#C5A059]/20 rounded-lg">
                        <item.icon className="h-6 w-6 text-[#C5A059]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-white">
                          {item.title}
                        </h3>
                        <p className="text-sm text-white/50">{item.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-white/50" />
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all border-l-4 border-l-amber-500"
              onClick={() => onShowResetDemoDialogChange(true)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <RotateCcw className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        Resetear Óptica Demo
                      </h3>
                      <p className="text-sm text-white/50">
                        Restaurar db demo al estado inicial (solo dev)
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

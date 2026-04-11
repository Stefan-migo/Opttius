"use client";

import {
  ArrowRight,
  BarChart3,
  Calendar,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DOC_SECTIONS = [
  {
    href: "/admin/docs/dashboard",
    label: "Dashboard",
    description: "Visión general, KPIs, citas del día y accesos rápidos",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/docs/pos",
    label: "Punto de Venta",
    description: "Ventas, caja y procesamiento de pagos",
    icon: ShoppingCart,
  },
  {
    href: "/admin/docs/trabajos",
    label: "Trabajos de Laboratorio",
    description: "Órdenes de trabajo, taller y entregas",
    icon: Package,
  },
  {
    href: "/admin/docs/presupuestos",
    label: "Presupuestos",
    description: "Cotizaciones y conversión a trabajo",
    icon: Receipt,
  },
  {
    href: "/admin/docs/citas",
    label: "Citas y Agenda",
    description: "Agendamiento y gestión de citas",
    icon: Calendar,
  },
  {
    href: "/admin/docs/productos",
    label: "Productos e Inventario",
    description: "Catálogo, stock y alertas",
    icon: Package,
  },
  {
    href: "/admin/docs/clientes",
    label: "Clientes",
    description: "CRM, recetas y historial",
    icon: Users,
  },
  {
    href: "/admin/docs/analiticas",
    label: "Analíticas",
    description: "Reportes, métricas y tendencias",
    icon: BarChart3,
  },
] as const;

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-4xl font-display font-bold tracking-tight text-admin-text-primary uppercase"
          data-tour="docs-header"
        >
          Documentación
        </h1>
        <p className="text-admin-text-tertiary mt-2 font-serif italic text-sm">
          Guía de uso del sistema Opttius para tu óptica
        </p>
      </div>

      <Card className="border border-admin-border-primary/20 bg-admin-border-primary/5 rounded-xl shadow-none">
        <CardHeader className="pb-2 border-b border-admin-border-primary/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-epoch-primary/5 border border-epoch-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-epoch-primary" />
            </div>
            <CardTitle className="text-xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
              Secciones del Sistema
            </CardTitle>
          </div>
          <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest mt-2">
            Selecciona una sección para ver la documentación detallada
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {DOC_SECTIONS.map((section) => (
              <Link href={section.href} key={section.href}>
                <Card className="border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-md hover:border-epoch-accent/30 transition-all duration-300 group h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 bg-epoch-primary/5 border border-epoch-primary/10 flex items-center justify-center group-hover:bg-epoch-accent/10 transition-colors">
                        <section.icon className="h-5 w-5 text-epoch-primary" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-admin-text-tertiary group-hover:text-epoch-accent group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-display font-bold text-admin-text-primary uppercase tracking-wide mt-4 text-sm">
                      {section.label}
                    </h3>
                    <p className="text-[11px] font-serif italic text-admin-text-tertiary mt-2 leading-relaxed">
                      {section.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

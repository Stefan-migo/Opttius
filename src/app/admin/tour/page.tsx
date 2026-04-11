"use client";

/**
 * Tour Mockup Page
 *
 * Esta página muestra una versión ligera de las páginas admin para el tour.
 * No carga datos reales, solo muestra la estructura básica necesaria para el tour.
 */

import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function TourMockupPage() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "dashboard";

  // Renderizar mockup según la sección
  switch (section) {
    case "dashboard":
      return <DashboardMockup />;
    case "customers":
      return <CustomersMockup />;
    case "products":
      return <ProductsMockup />;
    case "quotes":
      return <QuotesMockup />;
    case "work-orders":
      return <WorkOrdersMockup />;
    case "appointments":
      return <AppointmentsMockup />;
    case "pos":
      return <POSMockup />;
    case "analytics":
      return <AnalyticsMockup />;
    case "system":
      return <SystemMockup />;
    default:
      return <DashboardMockup />;
  }
}

function DashboardMockup() {
  return (
    <div className="space-y-6 p-6">
      <div data-tour="dashboard-header">
        <h1 className="text-3xl font-bold text-azul-profundo">
          Dashboard - Visión General
        </h1>
        <p className="text-tierra-media mt-2">
          Aquí encontrarás todas las métricas clave de tu óptica
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-tierra-media">Ventas de Hoy</div>
            <div className="text-2xl font-bold">$0</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-tierra-media">Trabajos Pendientes</div>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-tierra-media">Presupuestos</div>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-tierra-media">Citas de Hoy</div>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CustomersMockup() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-azul-profundo">
            Gestión de Clientes
          </h1>
          <p className="text-tierra-media mt-2">
            Administra tu base de datos de clientes
          </p>
        </div>
        <Button>Nuevo Cliente</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4" data-tour="customers-search">
            <Input placeholder="Buscar por RUT, nombre o email..." />
            <div className="text-sm text-tierra-media">
              Puedes buscar clientes por RUT (con o sin formato), nombre o email
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductsMockup() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div data-tour="products-header">
          <h1 className="text-3xl font-bold text-azul-profundo">
            Gestión de Productos
          </h1>
          <p className="text-tierra-media mt-2">
            Administra tu catálogo de productos y categorías
          </p>
        </div>
        <Button>Agregar Producto</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-center text-tierra-media">
            Catálogo de productos (vista mockup para tour)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuotesMockup() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div data-tour="quotes-header">
          <h1 className="text-3xl font-bold text-azul-profundo">
            Presupuestos
          </h1>
          <p className="text-tierra-media mt-2">
            Crea y gestiona presupuestos para tus clientes
          </p>
        </div>
        <Button>Crear Presupuesto</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-center text-tierra-media">
            Lista de presupuestos (vista mockup para tour)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WorkOrdersMockup() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div data-tour="work-orders-header">
          <h1 className="text-3xl font-bold text-azul-profundo">
            Trabajos de Laboratorio
          </h1>
          <p className="text-tierra-media mt-2">
            Sigue el progreso de los trabajos de laboratorio
          </p>
        </div>
        <Button>Nuevo Trabajo</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-center text-tierra-media">
            Lista de trabajos (vista mockup para tour)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AppointmentsMockup() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-azul-profundo">
            Citas y Agenda
          </h1>
          <p className="text-tierra-media mt-2">
            Gestiona tu calendario de citas
          </p>
        </div>
        <Button>Nueva Cita</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div
            className="text-center text-tierra-media"
            data-tour="appointments-calendar"
          >
            Calendario de citas (vista mockup para tour)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function POSMockup() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div data-tour="pos-header">
          <h1 className="text-3xl font-bold text-azul-profundo">
            Punto de Venta
          </h1>
          <p className="text-tierra-media mt-2">
            Sistema de ventas rápido e integrado
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-center text-tierra-media">
            Interfaz de POS (vista mockup para tour)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsMockup() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div data-tour="analytics-header">
          <h1 className="text-3xl font-bold text-azul-profundo">
            Analíticas y Reportes
          </h1>
          <p className="text-tierra-media mt-2">
            Visualiza el rendimiento de tu negocio
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-center text-tierra-media">
            Gráficos y reportes (vista mockup para tour)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SystemMockup() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div data-tour="system-header">
          <h1 className="text-3xl font-bold text-azul-profundo">
            Configuración del Sistema
          </h1>
          <p className="text-tierra-media mt-2">
            Configura tu óptica según tus necesidades
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-center text-tierra-media">
            Opciones de configuración (vista mockup para tour)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

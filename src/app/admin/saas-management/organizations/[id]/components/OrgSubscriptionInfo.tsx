"use client";

import { Crown, MapPin, Package, ShoppingCart, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface OrgStats {
  totalUsers: number;
  activeUsers: number;
  branches: number;
  orders: number;
  products: number;
}

interface SubscriptionInfo {
  id: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  gateway_subscription_id?: string;
}

interface OrgSubscriptionInfoProps {
  stats: OrgStats;
  subscriptions?: SubscriptionInfo[] | null;
  orgId: string;
}

export default function OrgSubscriptionInfo({ stats, subscriptions, orgId }: OrgSubscriptionInfoProps) {
  const router = useRouter();
  const sub = subscriptions?.[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="admin-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeUsers}</div>
          <p className="text-xs text-muted-foreground">de {stats.totalUsers} totales</p>
        </CardContent>
      </Card>

      <Card className="admin-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sucursales</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.branches}</div>
        </CardContent>
      </Card>

      <Card className="admin-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Órdenes</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.orders}</div>
        </CardContent>
      </Card>

      <Card className="admin-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Productos</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.products}</div>
        </CardContent>
      </Card>

      <Card className="admin-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Suscripción</CardTitle>
          <Crown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm font-medium">{sub?.status || "Sin suscripción"}</div>
          {sub?.current_period_end && (
            <p className="text-xs text-muted-foreground">Vence: {formatDate(sub.current_period_end)}</p>
          )}
          <Button className="mt-2" size="sm" variant="outline" onClick={() =>
            router.push(`/admin/saas-management/subscriptions?organization_id=${orgId}`)
          }>
            Gestionar suscripciones
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

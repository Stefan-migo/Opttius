"use client";

import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

function getStatusBadge(
  status: string,
  isExpiringSoon?: boolean,
  isExpired?: boolean,
) {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    active: "default",
    trialing: "secondary",
    past_due: "destructive",
    cancelled: "destructive",
    incomplete: "secondary",
  };
  const icons: Record<string, typeof CheckCircle2> = {
    active: CheckCircle2,
    trialing: Clock,
    past_due: AlertTriangle,
    cancelled: XCircle,
    incomplete: Clock,
  };
  const Icon = icons[status] || CheckCircle2;
  const variant = variants[status] || "default";
  let className = "";
  if (isExpired) className = "bg-red-100 text-red-800";
  else if (isExpiringSoon) className = "bg-yellow-100 text-yellow-800";
  return (
    <Badge className={className} variant={variant}>
      <Icon className="h-3 w-3 mr-1" />
      {status === "active"
        ? "Activa"
        : status === "trialing"
          ? "Trial"
          : status === "past_due"
            ? "Vencida"
            : status === "cancelled"
              ? "Cancelada"
              : status === "incomplete"
                ? "Incompleta"
                : status}
    </Badge>
  );
}

export interface SubscriptionDetails {
  id: string;
  organization_id: string;
  status: string;
  trial_ends_at?: string | null;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at?: string;
  canceled_at?: string;
  gateway_subscription_id?: string;
  gateway_customer_id?: string;
  created_at: string;
  updated_at: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    subscription_tier: string;
    status: string;
    owner_id?: string;
    created_at: string;
  };
  daysUntilExpiry?: number;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
}

interface Props {
  subscription: SubscriptionDetails;
}

export function SubscriptionInfoCards({ subscription }: Props) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <CreditCard className="h-5 w-5" />
            Información de la Suscripción
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Estado
              </label>
              <div className="mt-1">
                {getStatusBadge(
                  subscription.status,
                  subscription.isExpiringSoon,
                  subscription.isExpired,
                )}
              </div>
            </div>
            {subscription.daysUntilExpiry !== null && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Días hasta vencimiento
                </label>
                <p
                  className={`text-lg font-semibold ${subscription.isExpired ? "text-red-600" : subscription.isExpiringSoon ? "text-yellow-600" : ""}`}
                >
                  {subscription.daysUntilExpiry != null &&
                  subscription.daysUntilExpiry < 0
                    ? `Vencida hace ${Math.abs(subscription.daysUntilExpiry)} días`
                    : subscription.daysUntilExpiry != null
                      ? `${subscription.daysUntilExpiry} días`
                      : "N/A"}
                </p>
              </div>
            )}
            {subscription.current_period_start && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Inicio del período
                </label>
                <p className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(subscription.current_period_start)}
                </p>
              </div>
            )}
            {subscription.current_period_end && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Fin del período
                </label>
                <p className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(subscription.current_period_end)}
                </p>
              </div>
            )}
            {subscription.cancel_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Cancelación programada
                </label>
                <p className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(subscription.cancel_at)}
                </p>
              </div>
            )}
            {subscription.canceled_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Fecha de cancelación
                </label>
                <p className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(subscription.canceled_at)}
                </p>
              </div>
            )}
            {subscription.trial_ends_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Fin del período de prueba
                </label>
                <p className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(subscription.trial_ends_at)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(subscription.gateway_subscription_id ||
        subscription.gateway_customer_id) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <DollarSign className="h-5 w-5" />
              Información de Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscription.gateway_subscription_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    ID de Suscripción Stripe
                  </label>
                  <p className="text-sm font-mono text-gray-600">
                    {subscription.gateway_subscription_id}
                  </p>
                </div>
              )}
              {subscription.gateway_customer_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    ID de Cliente
                  </label>
                  <p className="text-sm font-mono text-gray-600">
                    {subscription.gateway_customer_id}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {subscription.organization && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Building2 className="h-5 w-5" />
              Organización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  {subscription.organization.name}
                </p>
                <p className="text-sm text-gray-500">
                  Slug: {subscription.organization.slug}
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge>{subscription.organization.subscription_tier}</Badge>
                  <Badge
                    variant={
                      subscription.organization.status === "active"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {subscription.organization.status}
                  </Badge>
                </div>
              </div>
              <Link
                href={`/admin/saas-management/organizations/${subscription.organization.id}`}
              >
                <Button size="sm" variant="outline">
                  Ver organización
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Clock className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Fecha de creación
              </label>
              <p className="text-lg">{formatDate(subscription.created_at)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Última actualización
              </label>
              <p className="text-lg">{formatDate(subscription.updated_at)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                ID de la Suscripción
              </label>
              <p className="text-sm font-mono text-gray-600">
                {subscription.id}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

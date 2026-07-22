"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

import {
  getStatusBadge,
  getTierBadge,
  SubscriptionActionMenu,
} from "./SubscriptionStatusBadge";

interface Subscription {
  id: string;
  organization_id: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at?: string;
  canceled_at?: string;
  gateway_subscription_id?: string;
  gateway_customer_id?: string;
  created_at: string;
  daysUntilExpiry?: number | null;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
    subscription_tier: string;
    status: string;
  };
}

interface SubscriptionsTableProps {
  subscriptions: Subscription[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewDetails: (id: string) => void;
  onCancelClick: (id: string) => void;
  onReactivate: (id: string) => void;
  onDeleteClick: (id: string) => void;
}

export function SubscriptionsTable({
  subscriptions,
  loading,
  error,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  onViewDetails,
  onCancelClick,
  onReactivate,
  onDeleteClick,
}: SubscriptionsTableProps) {
  return (
    <Card className="admin-card">
      <CardHeader>
        <CardTitle>Suscripciones ({totalCount})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No se encontraron suscripciones
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organización</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Días restantes</TableHead>
                    <TableHead>Stripe ID</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow
                      className={
                        sub.isExpiringSoon || sub.isExpired
                          ? "bg-yellow-50"
                          : ""
                      }
                      key={sub.id}
                    >
                      <TableCell>
                        {sub.organization ? (
                          <div>
                            <div className="font-medium">
                              {sub.organization.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {sub.organization.slug}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">
                            Sin organización
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sub.organization
                          ? getTierBadge(sub.organization.subscription_tier)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(
                          sub.status,
                          sub.isExpiringSoon,
                          sub.isExpired,
                        )}
                      </TableCell>
                      <TableCell>
                        {sub.current_period_start && sub.current_period_end ? (
                          <div className="text-sm">
                            <div>{formatDate(sub.current_period_start)}</div>
                            <div className="text-gray-500">
                              hasta {formatDate(sub.current_period_end)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sub.daysUntilExpiry !== null ? (
                          <div
                            className={
                              sub.isExpiringSoon || sub.isExpired
                                ? "font-semibold text-yellow-600"
                                : ""
                            }
                          >
                            {sub.daysUntilExpiry != null &&
                            sub.daysUntilExpiry > 0
                              ? `${sub.daysUntilExpiry} días`
                              : sub.daysUntilExpiry != null &&
                                  sub.daysUntilExpiry === 0
                                ? "Hoy"
                                : sub.daysUntilExpiry != null
                                  ? `Vencida hace ${Math.abs(sub.daysUntilExpiry)} días`
                                  : "N/A"}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sub.gateway_subscription_id ? (
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {sub.gateway_subscription_id.substring(0, 20)}...
                          </code>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <SubscriptionActionMenu
                          status={sub.status}
                          onCancel={
                            sub.status !== "cancelled"
                              ? () => onCancelClick(sub.id)
                              : undefined
                          }
                          onDelete={() => onDeleteClick(sub.id)}
                          onReactivate={
                            sub.status === "cancelled"
                              ? () => onReactivate(sub.id)
                              : undefined
                          }
                          onView={() => onViewDetails(sub.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={currentPage === 1}
                    size="sm"
                    variant="outline"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    disabled={currentPage === totalPages}
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onPageChange(Math.min(totalPages, currentPage + 1))
                    }
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

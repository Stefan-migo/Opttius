"use client";

import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatusHistory } from "@/hooks/useWorkOrder";

interface WorkOrderHistoryTabProps {
  statusHistory: StatusHistory[];
  currentStatus: string;
  getStatusLabel: (status: string) => string;
}

export function WorkOrderHistoryTab({
  statusHistory,
  currentStatus,
  getStatusLabel,
}: WorkOrderHistoryTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Estados</CardTitle>
      </CardHeader>
      <CardContent>
        {statusHistory.length === 0 ? (
          <div className="text-center py-8 text-admin-text-tertiary">
            No hay historial de cambios de estado
          </div>
        ) : (
          <div className="space-y-4">
            {statusHistory.map((entry, index) => {
              const isCurrentStatus =
                index === 0 && entry.to_status === currentStatus;

              return (
                <div
                  className={`flex items-start space-x-4 pb-4 border-b last:border-0 ${
                    isCurrentStatus
                      ? "bg-green-50 p-4 rounded-lg border-green-200"
                      : "bg-gray-50 p-3 rounded-lg border-gray-200"
                  }`}
                  key={entry.id}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={
                          isCurrentStatus
                            ? "bg-gray-200 border-gray-300 text-gray-600"
                            : "bg-gray-100 border-gray-200 text-gray-500"
                        }
                        variant="outline"
                      >
                        {getStatusLabel(entry.from_status || "Inicial")}
                      </Badge>
                      <ArrowRight
                        className={`h-4 w-4 ${isCurrentStatus ? "text-green-600" : "text-gray-400"}`}
                      />
                      <Badge
                        className={
                          isCurrentStatus
                            ? "bg-green-500 text-white border-green-600 font-semibold"
                            : "bg-gray-300 text-gray-600 border-gray-400"
                        }
                      >
                        {getStatusLabel(entry.to_status)}
                        {isCurrentStatus && (
                          <span className="ml-2 text-xs bg-green-600 px-1.5 py-0.5 rounded">
                            ACTUAL
                          </span>
                        )}
                      </Badge>
                    </div>
                    <p
                      className={`text-sm mt-2 ${isCurrentStatus ? "text-green-700 font-medium" : "text-gray-500"}`}
                    >
                      {new Date(entry.changed_at).toLocaleString("es-CL", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {entry.changed_by_user && (
                      <p
                        className={`text-sm mt-1 ${isCurrentStatus ? "text-green-600" : "text-gray-500"}`}
                      >
                        Por: {entry.changed_by_user.first_name}{" "}
                        {entry.changed_by_user.last_name}
                      </p>
                    )}
                    {entry.notes && (
                      <p
                        className={`text-sm mt-2 ${isCurrentStatus ? "text-green-800" : "text-gray-600"}`}
                      >
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

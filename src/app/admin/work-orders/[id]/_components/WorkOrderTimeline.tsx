"use client";

import { CheckCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkOrder } from "@/hooks/useWorkOrder";
import { formatDate } from "@/lib/utils";

interface WorkOrderTimelineProps {
  workOrder: WorkOrder;
  setDeliveryDialogOpen: (open: boolean) => void;
  setShowStatusDialog: (show: boolean) => void;
  setNewStatus: (status: string) => void;
  setStatusDialogOpenedFromTimeline: (from: boolean) => void;
}

export function WorkOrderTimeline({
  workOrder,
  setDeliveryDialogOpen,
  setShowStatusDialog,
  setNewStatus,
  setStatusDialogOpenedFromTimeline,
}: WorkOrderTimelineProps) {
  const steps = [
    {
      status: "quote",
      label: "Presupuesto",
      date:
        workOrder.status === "quote"
          ? workOrder.work_order_date || workOrder.created_at
          : null,
    },
    {
      status: "ordered",
      label: "Ordenado",
      date:
        workOrder.ordered_at ||
        (workOrder.status === "ordered"
          ? workOrder.work_order_date || workOrder.created_at
          : null),
    },
    {
      status: "sent_to_lab",
      label: "Enviado al Lab",
      date: workOrder.sent_to_lab_at,
    },
    {
      status: "received_from_lab",
      label: "Recibido del Lab",
      date: workOrder.received_from_lab_at,
    },
    {
      status: "mounted",
      label: "Montado",
      date: workOrder.mounted_at,
    },
    {
      status: "quality_check",
      label: "Control Calidad",
      date: workOrder.quality_checked_at,
    },
    {
      status: "ready_for_pickup",
      label: "Listo para Retiro",
      date: workOrder.ready_at,
    },
    {
      status: "delivered",
      label: "Entregado",
      date: workOrder.delivered_at,
    },
  ];

  const currentStatusIndex = steps.findIndex(
    (s) => s.status === workOrder.status,
  );

  const handleStepClick = (step: (typeof steps)[0]) => {
    if (step.status === "delivered") {
      setDeliveryDialogOpen(true);
    } else {
      setNewStatus(step.status);
      setStatusDialogOpenedFromTimeline(true);
      setShowStatusDialog(true);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flujo de Trabajo</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile: Vertical timeline */}
        <div className="flex flex-col md:hidden">
          {steps.map((step, idx) => {
            const isCompleted =
              currentStatusIndex !== -1 && idx < currentStatusIndex;
            const isCurrent = workOrder.status === step.status;
            const isFuture =
              currentStatusIndex !== -1 && idx > currentStatusIndex;
            const lineActive =
              currentStatusIndex !== -1 && currentStatusIndex > idx;

            return (
              <div
                className="relative flex items-start gap-3 pb-5 last:pb-0"
                key={step.status}
              >
                {idx < steps.length - 1 && (
                  <div
                    className={`absolute left-[11px] top-8 bottom-0 w-0.5 ${
                      lineActive ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                )}
                <div
                  className={`relative z-10 flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center border-2 cursor-pointer transition-transform active:scale-95 ${
                    isCurrent
                      ? "bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/50"
                      : isCompleted
                        ? "bg-gray-300 border-gray-400 text-gray-600"
                        : "bg-gray-200 border-gray-300 text-gray-400"
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleStepClick(step)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleStepClick(step);
                    }
                  }}
                >
                  {isCurrent ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span className="absolute -top-0.5 -right-0.5 bg-green-600 text-white text-[10px] font-bold px-1 py-0.5 rounded-full border-2 border-white">
                        ACTUAL
                      </span>
                    </>
                  ) : isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-current" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p
                    className={`text-sm font-medium ${
                      isCurrent
                        ? "text-green-600"
                        : isCompleted || isFuture
                          ? "text-gray-600"
                          : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      step.date
                        ? isCurrent
                          ? "text-green-600"
                          : "text-gray-500"
                        : "text-gray-400"
                    }`}
                  >
                    {step.date
                      ? formatDate(step.date, {
                          format: "medium",
                          locale: "es-CL",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Horizontal timeline */}
        <div className="hidden md:flex items-center justify-between overflow-x-auto pb-4">
          {steps.map((step, idx) => {
            const isCompleted =
              currentStatusIndex !== -1 && idx < currentStatusIndex;
            const isCurrent = workOrder.status === step.status;
            const isFuture =
              currentStatusIndex !== -1 && idx > currentStatusIndex;

            return (
              <div
                className="flex items-center flex-shrink-0"
                key={step.status}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-2 relative cursor-pointer transition-transform hover:scale-105 ${
                      isCurrent
                        ? "bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/50"
                        : isCompleted
                          ? "bg-gray-300 border-gray-400 text-gray-600"
                          : "bg-gray-200 border-gray-300 text-gray-400"
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleStepClick(step)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleStepClick(step);
                      }
                    }}
                  >
                    {isCurrent ? (
                      <>
                        <CheckCircle className="h-7 w-7" />
                        <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                          ACTUAL
                        </span>
                      </>
                    ) : isCompleted ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-current" />
                    )}
                  </div>
                  <p
                    className={`text-xs mt-2 text-center max-w-[80px] ${
                      isCurrent
                        ? "font-bold text-green-600"
                        : isCompleted || isFuture
                          ? "font-medium text-gray-500"
                          : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p
                    className={`text-xs mt-1 min-h-[16px] ${
                      step.date
                        ? isCurrent
                          ? "text-green-600 font-medium"
                          : "text-gray-500"
                        : "text-transparent"
                    }`}
                  >
                    {step.date
                      ? formatDate(step.date, {
                          format: "medium",
                          locale: "es-CL",
                        })
                      : "\u00A0"}
                  </p>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`w-16 h-0.5 mx-2 ${
                      isCurrent ||
                      (isCompleted && idx < currentStatusIndex)
                        ? "bg-green-500"
                        : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

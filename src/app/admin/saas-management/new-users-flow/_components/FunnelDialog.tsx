"use client";

import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DemoRequest, FunnelStage } from "./types";
import { STAGE_COLORS, STAGE_LABELS } from "./constants";

interface FunnelForm {
  meeting_url: string;
  meeting_scheduled_at: string;
  notes: string;
  offer_type: string;
  lost_reason: string;
}

interface FunnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRequest: DemoRequest | null;
  funnelForm: FunnelForm;
  onFormChange: (field: keyof FunnelForm, value: string) => void;
  onFunnelUpdate: (
    id: string,
    stage: FunnelStage,
    extra?: Record<string, unknown>,
  ) => void;
  onDeleteClick: (r: DemoRequest) => void;
  actioning: string | null;
}

export function FunnelDialog({
  open,
  onOpenChange,
  selectedRequest,
  funnelForm,
  onFormChange,
  onFunnelUpdate,
  onDeleteClick,
  actioning,
}: FunnelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle del lead</DialogTitle>
        </DialogHeader>
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-white/50">{selectedRequest.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Nombre / Óptica</p>
              <p className="text-white/50">
                {selectedRequest.full_name || "—"} /{" "}
                {selectedRequest.optica_name || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Etapa actual</p>
              <Badge
                className={
                  STAGE_COLORS[selectedRequest.funnel_stage || "pending"] || ""
                }
                variant="secondary"
              >
                {STAGE_LABELS[selectedRequest.funnel_stage || "pending"]}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium">URL de reunión</p>
              <input
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="https://meet.google.com/..."
                type="url"
                value={funnelForm.meeting_url}
                onChange={(e) =>
                  onFormChange("meeting_url", e.target.value)
                }
              />
            </div>
            <div>
              <p className="text-sm font-medium">Notas</p>
              <textarea
                className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px]"
                placeholder="Notas del lead..."
                value={funnelForm.notes}
                onChange={(e) => onFormChange("notes", e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-4">
              {["approved", "demo_expiring", "demo_expired"].includes(
                selectedRequest.funnel_stage || "",
              ) && (
                <Button
                  disabled={actioning === selectedRequest.id}
                  size="sm"
                  onClick={() => {
                    const url =
                      funnelForm.meeting_url?.trim() ||
                      (typeof window !== "undefined"
                        ? `${window.location.origin}/contacto`
                        : "https://www.opttius.cl/contacto");
                    onFunnelUpdate(
                      selectedRequest.id,
                      "meeting_scheduled",
                      {
                        meeting_url: url,
                        meeting_scheduled_at:
                          funnelForm.meeting_scheduled_at ||
                          new Date().toISOString(),
                      },
                    );
                  }}
                >
                  Agendar reunión
                </Button>
              )}
              {selectedRequest.funnel_stage === "meeting_scheduled" && (
                <Button
                  disabled={actioning === selectedRequest.id}
                  size="sm"
                  onClick={() =>
                    onFunnelUpdate(selectedRequest.id, "post_meeting", {
                      notes: funnelForm.notes || undefined,
                    })
                  }
                >
                  Reunión completada
                </Button>
              )}
              {selectedRequest.funnel_stage === "post_meeting" && (
                <Button
                  disabled={actioning === selectedRequest.id}
                  size="sm"
                  onClick={() =>
                    onFunnelUpdate(selectedRequest.id, "negotiation", {
                      notes: funnelForm.notes || undefined,
                    })
                  }
                >
                  Enviar oferta
                </Button>
              )}
              {selectedRequest.funnel_stage === "negotiation" && (
                <Button
                  disabled={actioning === selectedRequest.id}
                  size="sm"
                  onClick={() =>
                    onFunnelUpdate(selectedRequest.id, "migration", {
                      notes: funnelForm.notes || undefined,
                    })
                  }
                >
                  Iniciar migración
                </Button>
              )}
              {selectedRequest.funnel_stage === "migration" && (
                <Button
                  disabled={actioning === selectedRequest.id}
                  size="sm"
                  variant="default"
                  onClick={() =>
                    onFunnelUpdate(selectedRequest.id, "converted", {
                      notes: funnelForm.notes || undefined,
                    })
                  }
                >
                  Marcar convertido
                </Button>
              )}
              {[
                "demo_expired",
                "meeting_scheduled",
                "post_meeting",
                "negotiation",
              ].includes(selectedRequest.funnel_stage || "") && (
                <Button
                  disabled={actioning === selectedRequest.id}
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    const reason = prompt("Motivo de pérdida:");
                    if (reason !== null)
                      onFunnelUpdate(selectedRequest.id, "lost", {
                        lost_reason: reason || "Sin especificar",
                        notes: funnelForm.notes || undefined,
                      });
                  }}
                >
                  Marcar perdido
                </Button>
              )}
              <Button
                className="ml-auto"
                disabled={actioning === selectedRequest.id}
                size="sm"
                variant="destructive"
                onClick={() => {
                  onOpenChange(false);
                  onDeleteClick(selectedRequest);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar solicitud
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import type { FunnelStage } from "./types";

export const STAGE_LABELS: Record<FunnelStage, string> = {
  pending: "Pendiente",
  approved: "Demo activa",
  demo_expiring: "Por vencer",
  demo_expired: "Expirada",
  meeting_scheduled: "Reunión",
  post_meeting: "Post-reunión",
  negotiation: "Negociación",
  migration: "Migración",
  converted: "Convertido",
  rejected: "Rechazado",
  lost: "Perdido",
};

export const STAGE_COLORS: Record<FunnelStage, string> = {
  pending: "bg-amber-500",
  approved: "bg-emerald-500",
  demo_expiring: "bg-orange-500",
  demo_expired: "bg-slate-500",
  meeting_scheduled: "bg-blue-500",
  post_meeting: "bg-indigo-500",
  negotiation: "bg-violet-500",
  migration: "bg-cyan-500",
  converted: "bg-green-500",
  rejected: "bg-red-500",
  lost: "bg-gray-500",
};

export const PRIORITY_COLORS: Record<string, string> = {
  hot: "bg-red-500",
  warm: "bg-amber-500",
  cold: "bg-blue-500",
  at_risk: "bg-gray-500",
};

export const KANBAN_COLUMNS: { stage: FunnelStage; label: string }[] = [
  { stage: "pending", label: "Pendiente" },
  { stage: "approved", label: "Demo Activa" },
  { stage: "demo_expiring", label: "Por Vencer" },
  { stage: "demo_expired", label: "Expirada" },
  { stage: "meeting_scheduled", label: "Reunión" },
  { stage: "post_meeting", label: "Post-reunión" },
  { stage: "negotiation", label: "Negociación" },
  { stage: "migration", label: "Migración" },
];

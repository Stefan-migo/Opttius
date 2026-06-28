export const STAGE_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Demo activa",
  demo_expiring: "Por vencer",
  demo_expired: "Expirada",
  meeting_scheduled: "Reunión agendada",
  post_meeting: "Post-reunión",
  negotiation: "Negociación",
  migration: "Migración",
  converted: "Convertido",
  rejected: "Rechazada",
  lost: "Perdido",
};

export const STAGE_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  approved: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  demo_expiring: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  demo_expired: "bg-slate-500/20 text-slate-700 dark:text-slate-400",
  meeting_scheduled: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  post_meeting: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
  negotiation: "bg-violet-500/20 text-violet-700 dark:text-violet-400",
  migration: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
  converted: "bg-green-600/20 text-green-700 dark:text-green-400",
  rejected: "bg-red-500/20 text-red-700 dark:text-red-400",
  lost: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
};

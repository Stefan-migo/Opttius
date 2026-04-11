"use client";

import { cn } from "@/lib/utils";
import { Clock, Mail, Phone, Star, Video } from "lucide-react";

interface Activity {
  id: string;
  activity_type: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by_user?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

interface LeadActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  email_sent: Mail,
  email_opened: Mail,
  email_clicked: Mail,
  demo_login: Star,
  demo_accessed: Star,
  meeting_scheduled: Video,
  meeting_completed: Video,
  call_logged: Phone,
  outbound_call: Phone,
  note_added: Clock,
  stage_changed: Clock,
  score_updated: Star,
  manual_email_sent: Mail,
};

const ACTIVITY_COLORS: Record<string, string> = {
  email_sent: "text-blue-400 bg-blue-500/20",
  email_opened: "text-green-400 bg-green-500/20",
  email_clicked: "text-purple-400 bg-purple-500/20",
  demo_login: "text-amber-400 bg-amber-500/20",
  demo_accessed: "text-amber-400 bg-amber-500/20",
  meeting_scheduled: "text-cyan-400 bg-cyan-500/20",
  meeting_completed: "text-emerald-400 bg-emerald-500/20",
  call_logged: "text-orange-400 bg-orange-500/20",
  outbound_call: "text-orange-400 bg-orange-500/20",
  note_added: "text-slate-400 bg-slate-500/20",
  stage_changed: "text-indigo-400 bg-indigo-500/20",
  score_updated: "text-amber-400 bg-amber-500/20",
  manual_email_sent: "text-blue-400 bg-blue-500/20",
};

const ACTIVITY_LABELS: Record<string, string> = {
  email_sent: "Email enviado",
  email_opened: "Email abierto",
  email_clicked: "Link clickeado",
  demo_login: "Login en demo",
  demo_accessed: "Acceso a demo",
  meeting_scheduled: "Reunión agendada",
  meeting_completed: "Reunión completada",
  call_logged: "Llamada registrada",
  outbound_call: "Llamada saliente",
  note_added: "Nota agregada",
  stage_changed: "Cambio de etapa",
  score_updated: "Score actualizado",
  manual_email_sent: "Email manual enviado",
  lead_created: "Lead creado",
  first_contact: "Primer contacto",
};

function formatActivityDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Ahora mismo";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;

  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function ActivityItem({ activity }: { activity: Activity }) {
  const Icon = ACTIVITY_ICONS[activity.activity_type] || Clock;
  const colorClass =
    ACTIVITY_COLORS[activity.activity_type] || "text-slate-400 bg-slate-500/20";
  const label =
    ACTIVITY_LABELS[activity.activity_type] || activity.activity_type;

  return (
    <div className="flex gap-3 py-3">
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          colorClass,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{label}</span>
          {activity.created_by_user && (
            <span className="text-xs text-white/40">
              por{" "}
              {activity.created_by_user.full_name ||
                activity.created_by_user.email}
            </span>
          )}
        </div>
        {activity.description && (
          <p className="text-sm text-white/60 mt-0.5">{activity.description}</p>
        )}
        <p className="text-xs text-white/30 mt-1">
          {formatActivityDate(activity.created_at)}
        </p>
      </div>
    </div>
  );
}

export function LeadActivityTimeline({
  activities,
  loading,
}: LeadActivityTimelineProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white/50">Cargando actividades...</div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="h-8 w-8 text-white/20 mb-2" />
        <p className="text-white/50 text-sm">Sin actividades registradas</p>
        <p className="text-white/30 text-xs mt-1">
          Las actividades aparecerán aquí automáticamente
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0 divide-y divide-white/10">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

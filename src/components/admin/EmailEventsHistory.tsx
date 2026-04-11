"use client";

import { Mail, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EmailEvent {
  id: string;
  email_id: string;
  event_type: string;
  recipient: string | null;
  subject: string | null;
  created_at: string;
}

const EVENT_LABELS: Record<string, string> = {
  "email.sent": "Enviado",
  "email.delivered": "Entregado",
  "email.delivery_delayed": "Retrasado",
  "email.complained": "Reclamado",
  "email.bounced": "Rebotado",
  "email.opened": "Abierto",
  "email.clicked": "Clic",
};

function getEventBadgeVariant(
  type: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (type === "email.bounced" || type === "email.complained")
    return "destructive";
  if (type === "email.opened" || type === "email.clicked") return "default";
  return "secondary";
}

export function EmailEventsHistory() {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState("all");

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventFilter !== "all") params.set("event_type", eventFilter);
      const res = await fetch(
        `/api/admin/saas-management/email-events?${params}`,
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [eventFilter]);

  if (loading && events.length === 0) {
    return (
      <Card className="admin-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          Cargando historial...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="admin-card">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold">Historial de eventos</h3>
          <div className="flex gap-2">
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(EVENT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={loading}
              size="icon"
              title="Actualizar"
              variant="outline"
              onClick={fetchEvents}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
        {events.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay eventos registrados.</p>
            <p className="text-sm mt-2">
              Configura el webhook de Resend en{" "}
              <code className="bg-muted px-1 rounded">
                /api/webhooks/resend
              </code>{" "}
              para recibir eventos de envío, apertura y clics.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Asunto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(e.created_at).toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEventBadgeVariant(e.event_type)}>
                        {EVENT_LABELS[e.event_type] || e.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {e.recipient || "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {e.subject || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

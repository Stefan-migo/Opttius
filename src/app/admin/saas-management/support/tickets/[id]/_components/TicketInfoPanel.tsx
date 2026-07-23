import { Calendar, Clock, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface TicketInfo {
  created_at: string;
  first_response_at?: string | null;
  response_time_minutes?: number | null;
  assigned_to_user?: { id: string; email: string; role: string } | null;
}

interface TicketInfoPanelProps {
  ticket: TicketInfo;
}

export function TicketInfoPanel({ ticket }: TicketInfoPanelProps) {
  return (
    <div className="space-y-6">
      <Card className="rounded-xl border border-border">
        <CardHeader>
          <CardTitle className="text-lg">Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <Label className="text-xs text-gray-500">Creado</Label>
              <p className="text-sm font-medium">
                {new Date(ticket.created_at).toLocaleString("es-CL")}
              </p>
            </div>
          </div>

          {ticket.first_response_at && (
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <Label className="text-xs text-gray-500">Primera Respuesta</Label>
                <p className="text-sm font-medium">
                  {new Date(ticket.first_response_at).toLocaleString("es-CL")}
                </p>
                {ticket.response_time_minutes && (
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.floor(ticket.response_time_minutes / 60)}h{" "}
                    {ticket.response_time_minutes % 60}m
                  </p>
                )}
              </div>
            </div>
          )}

          {ticket.assigned_to_user && (
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <Label className="text-xs text-gray-500">Asignado a</Label>
                <p className="text-sm font-medium">
                  {ticket.assigned_to_user.email}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

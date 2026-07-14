import { MessageSquare, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TicketMessage {
  id: string;
  message: string;
  sender_name: string;
  is_from_customer: boolean;
  is_internal: boolean;
  created_at: string;
}

interface TicketMessagesListProps {
  messages: TicketMessage[];
}

export function TicketMessagesList({ messages }: TicketMessagesListProps) {
  return (
    <Card className="rounded-xl border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversación ({messages.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No hay mensajes aún</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                className={`p-4 rounded-lg border ${
                  msg.is_internal
                    ? "bg-yellow-50 border-yellow-200"
                    : msg.is_from_customer
                      ? "bg-blue-50 border-blue-200"
                      : "bg-gray-50 border-gray-200"
                }`}
                key={msg.id}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-sm">{msg.sender_name}</span>
                    {msg.is_internal && (
                      <Badge className="text-xs" variant="outline">Interno</Badge>
                    )}
                    {msg.is_from_customer && !msg.is_internal && (
                      <Badge className="text-xs" variant="outline">Cliente</Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.created_at).toLocaleString("es-CL")}
                  </span>
                </div>
                <p className="text-gray-900 whitespace-pre-wrap">{msg.message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

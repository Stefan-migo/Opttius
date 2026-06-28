"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  Send,
  User,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOpticalInternalSupportMessageSchema } from "@/lib/api/validation/zod-schemas";

interface TicketMessage {
  id: string;
  message: string;
  sender_name: string;
  sender_email: string;
  sender_role: string | null;
  is_internal: boolean;
  created_at: string;
  message_type: string;
  sender?: {
    id: string;
    email: string;
    role: string;
  } | null;
}

interface TicketMessagesProps {
  messages: TicketMessage[];
  ticketStatus: string;
  onMessageSent: () => void;
}

export default function TicketMessages({
  messages,
  ticketStatus,
  onMessageSent,
}: TicketMessagesProps) {
  const params = useParams();
  const ticketId = params.id as string;
  const [sendingMessage, setSendingMessage] = useState(false);

  const {
    register: registerMessage,
    handleSubmit: handleSubmitMessage,
    formState: { errors: messageErrors },
    reset: resetMessage,
  } = useForm<unknown>({
    resolver: zodResolver(createOpticalInternalSupportMessageSchema),
    defaultValues: {
      is_internal: true,
      message_type: "message",
      attachments: [],
    },
  });

  const onSubmitMessage: SubmitHandler<unknown> = async (data) => {
    setSendingMessage(true);
    try {
      const response = await fetch(
        `/api/admin/optical-support/tickets/${ticketId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Error al enviar mensaje");
      }

      toast.success("Mensaje enviado exitosamente");
      resetMessage();
      onMessageSent();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al enviar mensaje",
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const isClosed = ticketStatus === "resolved" || ticketStatus === "closed";

  return (
    <>
      <Card className="rounded-xl border border-border">
        <CardHeader className="p-4 sm:p-6 pb-0">
          <CardTitle className="flex items-center gap-2 font-display text-epoch-primary text-base sm:text-lg">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-epoch-accent shrink-0" />
            Conversación ({messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-4">
          {messages.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-epoch-primary/70">
              <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-400" />
              <p className="text-sm sm:text-base">No hay mensajes aún</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {messages.map((msg) => (
                <div
                  className="p-3 sm:p-4 rounded-xl border bg-white border-epoch-primary/20 text-epoch-primary"
                  key={msg.id}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-epoch-primary/70 shrink-0" />
                      <span className="font-medium text-xs sm:text-sm text-epoch-primary">
                        {msg.sender_name}
                      </span>
                      {msg.message_type === "status_change" && (
                        <Badge
                          className="text-[10px] sm:text-xs px-1.5 py-0"
                          variant="outline"
                        >
                          Cambio de Estado
                        </Badge>
                      )}
                      {msg.message_type === "assignment" && (
                        <Badge
                          className="text-[10px] sm:text-xs px-1.5 py-0"
                          variant="outline"
                        >
                          Asignación
                        </Badge>
                      )}
                      {msg.message_type === "resolution" && (
                        <Badge
                          className="text-[10px] sm:text-xs px-1.5 py-0"
                          variant="outline"
                        >
                          Resolución
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-xs text-epoch-primary/70 shrink-0">
                      {new Date(msg.created_at).toLocaleString("es-CL")}
                    </span>
                  </div>
                  <p className="text-epoch-primary whitespace-pre-wrap text-xs sm:text-sm">
                    {msg.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!isClosed && (
        <Card className="rounded-xl border border-border">
          <CardHeader className="p-4 sm:p-6 pb-0">
            <CardTitle className="font-display text-epoch-primary text-base sm:text-lg">
              Agregar Mensaje
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Agrega información adicional o notas sobre la resolución del
              problema
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-4">
            <form
              className="space-y-4"
              onSubmit={handleSubmitMessage(onSubmitMessage)}
            >
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm" htmlFor="message">
                  Mensaje <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="message"
                  {...registerMessage("message")}
                  className={`rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 bg-white text-epoch-primary placeholder:text-epoch-primary/50 text-sm sm:text-base min-h-[120px] ${messageErrors.message ? "border-red-500" : ""}`}
                  placeholder="Escribe tu mensaje aquí..."
                  rows={5}
                />
                {messageErrors.message && (
                  <p className="text-xs sm:text-sm text-red-500">
                    {String(messageErrors.message.message)}
                  </p>
                )}
              </div>

              <Button
                className="w-full rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase min-h-[44px]"
                disabled={sendingMessage}
                type="submit"
              >
                {sendingMessage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Mensaje
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isClosed && (
        <Alert className="py-3 sm:py-4">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <AlertDescription className="text-xs sm:text-sm">
            Este ticket está{" "}
            {ticketStatus === "resolved" ? "resuelto" : "cerrado"}. Si
            necesitas agregar más información, puedes crear un nuevo
            ticket.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}

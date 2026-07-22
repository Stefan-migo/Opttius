"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { MessageForm, Ticket, TicketMessage } from "./supportTicketTypes";
import { messageSchema } from "./supportTicketTypes";

export function useSupportTicket(ticketNumber: string) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
  });

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketNumber}`);
      if (!res.ok) throw new Error("Ticket no encontrado");
      const data = await res.json();
      setTicket(data.ticket);
    } catch {
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketNumber]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketNumber}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // silently fail
    }
  }, [ticketNumber]);

  useEffect(() => {
    fetchTicket();
    fetchMessages();
  }, [fetchTicket, fetchMessages]);

  const onSubmit = useCallback(
    async (data: MessageForm) => {
      setSending(true);
      try {
        const res = await fetch(
          `/api/support/tickets/${ticketNumber}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al enviar mensaje");
        }
        toast.success("Mensaje enviado correctamente");
        reset();
        fetchMessages();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Error al enviar mensaje",
        );
      } finally {
        setSending(false);
      }
    },
    [ticketNumber, reset, fetchMessages],
  );

  return {
    ticket,
    messages,
    loading,
    sending,
    register,
    errors,
    handleSubmit,
    onSubmit,
  };
}

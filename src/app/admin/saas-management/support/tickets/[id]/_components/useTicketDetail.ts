"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createSaasSupportMessageSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger } from '@/lib/logger';

import type { Template, Ticket, TicketMessage } from "./types";

export function useTicketDetail() {
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [newResolution, setNewResolution] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(createSaasSupportMessageSchema),
    defaultValues: {
      is_internal: false,
      message_type: "message",
    },
  });

  const fetchTicket = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/support/tickets/${ticketId}`,
      );
      if (!response.ok) throw new Error("Error al cargar el ticket");
      const data = await response.json();
      setTicket(data.ticket);
      setNewStatus(data.ticket.status);
      setNewPriority(data.ticket.priority);
    } catch {
      toast.error("Error al cargar el ticket");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/support/tickets/${ticketId}/messages`,
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      appLogger.error("Error fetching messages:", err);
    }
  }, [ticketId]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/support/templates?is_active=true`,
      );
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      appLogger.error("Error fetching templates:", err);
    }
  }, []);

  useEffect(() => {
    fetchTicket();
    fetchMessages();
    fetchTemplates();
  }, [fetchTicket, fetchMessages, fetchTemplates]);

  const onSubmitMessage: SubmitHandler<unknown> = useCallback(
    async (data) => {
      setSendingMessage(true);
      try {
        const response = await fetch(
          `/api/admin/saas-management/support/tickets/${ticketId}/messages`,
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
        reset();
        fetchMessages();
        fetchTicket();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Error al enviar mensaje",
        );
      } finally {
        setSendingMessage(false);
      }
    },
    [ticketId, reset, fetchMessages, fetchTicket],
  );

  const handleUpdateStatus = useCallback(async () => {
    setUpdatingTicket(true);
    try {
      const updates: Record<string, unknown> = {
        status: newStatus,
        priority: newPriority,
      };
      if (newStatus === "resolved" || newStatus === "closed") {
        updates.resolution = newResolution || null;
      }
      const response = await fetch(
        `/api/admin/saas-management/support/tickets/${ticketId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Error al actualizar ticket");
      }
      toast.success("Ticket actualizado exitosamente");
      setShowStatusDialog(false);
      fetchTicket();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al actualizar ticket",
      );
    } finally {
      setUpdatingTicket(false);
    }
  }, [ticketId, newStatus, newPriority, newResolution, fetchTicket]);

  const handleUseTemplate = useCallback(
    (template: Template) => {
      setValue("message", template.content);
      setShowTemplateDialog(false);
    },
    [setValue],
  );

  const copyTicketNumber = useCallback(() => {
    if (ticket?.ticket_number) {
      navigator.clipboard.writeText(ticket.ticket_number);
      toast.success("Número de ticket copiado");
    }
  }, [ticket]);

  return {
    ticketId,
    ticket,
    messages,
    templates,
    loading,
    sendingMessage,
    updatingTicket,
    showAssignDialog,
    showStatusDialog,
    showTemplateDialog,
    newStatus,
    newPriority,
    newResolution,
    register,
    errors,
    handleSubmit,
    setShowAssignDialog,
    setShowStatusDialog,
    setShowTemplateDialog,
    setNewStatus,
    setNewPriority,
    setNewResolution,
    onSubmitMessage,
    handleUpdateStatus,
    handleUseTemplate,
    copyTicketNumber,
  };
}

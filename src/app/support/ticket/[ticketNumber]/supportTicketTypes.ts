import { z } from "zod";

export const messageSchema = z.object({
  message: z.string().min(1, "El mensaje es requerido").max(5000).trim(),
  requester_email: z.string().email("Email inválido"),
  requester_name: z.string().min(1, "El nombre es requerido").optional(),
});

export type MessageForm = z.infer<typeof messageSchema>;

export interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
  requester_email: string;
  requester_name?: string;
  resolution?: string;
  assigned_to?: string;
}

export interface TicketMessage {
  id: string;
  message: string;
  sender_name: string;
  sender_email: string;
  is_from_customer: boolean;
  is_internal: boolean;
  created_at: string;
}

export const statusLabels: Record<string, string> = {
  open: "Abierto",
  assigned: "Asignado",
  in_progress: "En Progreso",
  waiting_customer: "Esperando Respuesta",
  resolved: "Resuelto",
  closed: "Cerrado",
};

export const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  assigned: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-purple-100 text-purple-800",
  waiting_customer: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

export const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

export const categoryLabels: Record<string, string> = {
  technical: "Técnico",
  billing: "Facturación",
  general: "General",
  account: "Cuenta",
  other: "Otro",
};

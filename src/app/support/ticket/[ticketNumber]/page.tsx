"use client";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  MessageSquare,
  Send,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  categoryLabels,
  priorityColors,
  statusColors,
  statusLabels,
} from "./supportTicketTypes";
import { useSupportTicket } from "./useSupportTicket";

export default function SupportTicketPage() {
  const params = useParams();
  const router = useRouter();
  const ticketNumber = params.ticketNumber as string;

  const {
    ticket,
    messages,
    loading,
    sending,
    register,
    errors,
    handleSubmit,
    onSubmit,
  } = useSupportTicket(ticketNumber);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  Ticket no encontrado
                </h2>
                <Button asChild>
                  <Link href="/support">Volver al Soporte</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            size="icon"
            variant="outline"
            onClick={() => router.push("/support")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Ticket #{ticket.ticket_number}
            </h1>
            <p className="text-gray-600 mt-1">{ticket.subject}</p>
          </div>
          <Badge className={statusColors[ticket.status]}>
            {statusLabels[ticket.status]}
          </Badge>
          <Badge className={priorityColors[ticket.priority]}>
            {ticket.priority}
          </Badge>
        </div>

        {/* Ticket Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Detalles del Ticket
            </CardTitle>
            <CardDescription>
              Creado el{" "}
              {new Date(ticket.created_at).toLocaleDateString("es-CL", {
                dateStyle: "long",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría</Label>
                <p className="mt-1">
                  {categoryLabels[ticket.category] || ticket.category}
                </p>
              </div>
              <div>
                <Label>Estado</Label>
                <p className="mt-1">{statusLabels[ticket.status]}</p>
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <p className="mt-1 text-gray-700 whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>
            {ticket.resolution && (
              <div className="p-4 bg-green-50 rounded-lg">
                <Label className="text-green-800">Resolución</Label>
                <p className="mt-1 text-green-700 whitespace-pre-wrap">
                  {ticket.resolution}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversación ({messages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No hay mensajes aún
              </p>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    className={`p-4 rounded-lg ${
                      msg.is_from_customer
                        ? "bg-blue-50 ml-8"
                        : "bg-gray-50 mr-8"
                    }`}
                    key={msg.id}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-sm">
                        {msg.sender_name || msg.sender_email}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(msg.created_at).toLocaleDateString("es-CL")}
                        <Clock className="h-3 w-3 ml-1" />
                        {new Date(msg.created_at).toLocaleTimeString("es-CL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {msg.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reply Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5" />
              Responder
            </CardTitle>
            <CardDescription>
              Tu respuesta será enviada al equipo de soporte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requester_name">Nombre</Label>
                  <Input
                    id="requester_name"
                    placeholder="Tu nombre"
                    {...register("requester_name")}
                  />
                </div>
                <div>
                  <Label htmlFor="requester_email">Email *</Label>
                  <Input
                    id="requester_email"
                    placeholder="tu@email.com"
                    {...register("requester_email")}
                  />
                  {errors.requester_email && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.requester_email.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="message">Mensaje *</Label>
                <Textarea
                  className="min-h-[120px]"
                  id="message"
                  placeholder="Escribe tu mensaje..."
                  {...register("message")}
                />
                {errors.message && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.message.message}
                  </p>
                )}
              </div>

              <Button disabled={sending} type="submit">
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Mensaje
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Alert className="bg-blue-50 border-blue-200" variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ¿No encuentras solución? Llámanos al{" "}
            <strong>+56 2 1234 5678</strong> o escríbenos a{" "}
            <strong>soporte@opttius.com</strong>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

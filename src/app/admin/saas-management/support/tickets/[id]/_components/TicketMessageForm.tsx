import { FileText, Loader2, Send } from "lucide-react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { FieldErrors,UseFormRegister } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TicketMessageFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  errors: FieldErrors;
  sendingMessage: boolean;
  onSubmit: React.FormEventHandler;
  onUseTemplate: () => void;
}

export function TicketMessageForm({
  register,
  errors,
  sendingMessage,
  onSubmit,
  onUseTemplate,
}: TicketMessageFormProps) {
  return (
    <Card className="rounded-xl border border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Responder</CardTitle>
          <Button size="sm" variant="outline" onClick={onUseTemplate}>
            <FileText className="h-4 w-4 mr-2" />
            Usar Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex items-center gap-2">
            <input
              id="is_internal"
              type="checkbox"
              {...register("is_internal")}
              className="rounded"
            />
            <Label className="text-sm" htmlFor="is_internal">
              Mensaje interno (no visible para el cliente)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">
              Mensaje <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              {...register("message")}
              className={errors.message ? "border-red-500" : ""}
              placeholder="Escribe tu respuesta aquí..."
              rows={6}
            />
            {errors.message && (
              <p className="text-sm text-red-500">
                {String(errors.message.message)}
              </p>
            )}
          </div>

          <Button className="w-full" disabled={sendingMessage} type="submit">
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
  );
}

"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmailTemplate {
  id: string;
  name: string;
}

interface Props {
  template: EmailTemplate | null;
  open: boolean;
  testing: string | null;
  onOpenChange: (open: boolean) => void;
  onSend: (templateId: string, email: string) => void;
}

export function EmailTemplateTestDialog({
  template,
  open,
  testing,
  onOpenChange,
  onSend,
}: Props) {
  const [testEmail, setTestEmail] = useState("");

  const handleSend = () => {
    if (template && testEmail) {
      onSend(template.id, testEmail);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Email de Prueba
          </DialogTitle>
          <DialogDescription>
            Envía un email de prueba de la plantilla &quot;
            {template?.name}&quot; a una dirección de correo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Email de destino *</Label>
            <Input
              required
              id="test-email"
              placeholder="ejemplo@email.com"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              El email se enviará con variables de ejemplo reemplazadas.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={testing === template?.id}
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setTestEmail("");
            }}
          >
            Cancelar
          </Button>
          <Button
            disabled={!testEmail || testing === template?.id}
            onClick={handleSend}
          >
            {testing === template?.id ? (
              <>
                <Send className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Prueba
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

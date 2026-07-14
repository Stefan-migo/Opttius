"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
}

interface Props {
  template: EmailTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailTemplatePreviewDialog({
  template,
  open,
  onOpenChange,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>Vista previa de la plantilla</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Asunto:</Label>
            <p className="font-medium">{template.subject}</p>
          </div>
          <div>
            <Label>Contenido:</Label>
            <div
              className="border rounded-lg p-4 bg-admin-bg-primary"
              dangerouslySetInnerHTML={{ __html: template.content }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Template {
  id: string;
  name: string;
  subject?: string | null;
  content: string;
  category: string | null;
}

interface TicketTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  onSelect: (template: Template) => void;
  categoryLabels: Record<string, string>;
}

export function TicketTemplateDialog({
  open,
  onOpenChange,
  templates,
  onSelect,
  categoryLabels,
}: TicketTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Seleccionar Template</DialogTitle>
          <DialogDescription>
            Elige un template para usar en tu respuesta
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-96 overflow-y-auto py-4">
          {templates.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No hay templates disponibles
            </p>
          ) : (
            templates.map((template) => (
              <div
                className="p-3 border rounded-lg hover:bg-epoch-primary/5 cursor-pointer transition-colors"
                key={template.id}
                onClick={() => onSelect(template)}
              >
                <div className="font-medium">{template.name}</div>
                {template.category && (
                  <Badge className="mt-1" variant="outline">
                    {categoryLabels[template.category] || template.category}
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

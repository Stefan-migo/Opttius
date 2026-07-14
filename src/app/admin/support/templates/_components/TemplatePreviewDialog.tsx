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

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  content: string;
  variables: Record<string, string>;
}

function renderTemplateWithVariables(text: string, variables: Record<string, string>) {
  let rendered = text;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    rendered = rendered.replace(regex, value);
  });
  return rendered;
}

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  subject,
  content,
  variables,
}: TemplatePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vista Previa de la Plantilla</DialogTitle>
          <DialogDescription>
            Así se verá la plantilla con datos de ejemplo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {subject && (
            <div>
              <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
                Asunto:
              </label>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">
                  {renderTemplateWithVariables(subject, variables)}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
              Contenido:
            </label>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="whitespace-pre-wrap">
                {renderTemplateWithVariables(content, variables)}
              </div>
            </div>
          </div>

          {Object.keys(variables).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
                Variables utilizadas:
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(variables).map(([key, value]) => (
                  <Badge className="text-xs" key={key} variant="outline">
                    {key}: {value}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

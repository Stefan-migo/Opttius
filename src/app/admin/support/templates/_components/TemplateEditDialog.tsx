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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Category {
  id: string;
  name: string;
}

interface TemplateForm {
  name: string;
  subject: string;
  content: string;
  category_id: string;
  variables: string[];
}

interface TemplateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: unknown;
  saving: boolean;
  form: TemplateForm;
  categories: Category[];
  onFormChange: (field: keyof TemplateForm, value: string) => void;
  onSave: () => void;
}

export function TemplateEditDialog({
  open,
  onOpenChange,
  editingTemplate,
  saving,
  form,
  categories,
  onFormChange,
  onSave,
}: TemplateEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? "Editar Plantilla" : "Crear Nueva Plantilla"}
          </DialogTitle>
          <DialogDescription>
            Las plantillas te permiten responder rápidamente con mensajes predefinidos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
                Nombre de la Plantilla <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ej: Respuesta entrega tardía"
                value={form.name}
                onChange={(e) => onFormChange("name", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
                Categoría
              </label>
              <Select
                value={form.category_id}
                onValueChange={(value) => onFormChange("category_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
              Asunto del Email
            </label>
            <Input
              placeholder='Ej: Actualización sobre tu pedido {{order_number}}'
              value={form.subject}
              onChange={(e) => onFormChange("subject", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
              Contenido de la Plantilla <span className="text-red-500">*</span>
            </label>
            <Textarea
              className="min-h-[200px]"
              placeholder="Hola {{customer_name}},&#10;&#10;Gracias por contactarnos sobre tu pedido {{order_number}}.&#10;&#10;[Continúa escribiendo tu mensaje...]"
              rows={10}
              value={form.content}
              onChange={(e) => onFormChange("content", e.target.value)}
            />
            <p className="text-xs text-admin-text-tertiary mt-2">
              Usa variables con doble llaves, ej: {`{{customer_name}}, {{order_number}}, {{product_name}}`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button disabled={saving} variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={saving} onClick={onSave}>
            {saving ? "Guardando..." : editingTemplate ? "Actualizar" : "Crear Plantilla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

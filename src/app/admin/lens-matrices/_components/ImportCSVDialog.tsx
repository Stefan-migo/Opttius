"use client";

import { toast } from "sonner";

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function ImportCSVDialog({ open, onOpenChange, onImportComplete }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Matrices desde CSV</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV con las matrices de precios siguiendo el
            formato especificado abajo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold">
              El formato debe incluir las siguientes columnas:
            </p>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="font-semibold text-sm mb-2 text-blue-900">
                Columnas Requeridas:
              </p>
              <div className="space-y-1 text-xs font-mono text-blue-800">
                <div className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>
                    <code className="bg-blue-100 px-1 rounded">
                      family_name
                    </code>{" "}
                    - Nombre de la familia de lentes
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>
                    <code className="bg-blue-100 px-1 rounded">
                      sphere_min
                    </code>{" "}
                    - Esfera mínima (ej: -10.00)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>
                    <code className="bg-blue-100 px-1 rounded">
                      sphere_max
                    </code>{" "}
                    - Esfera máxima (ej: 6.00)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>
                    <code className="bg-blue-100 px-1 rounded">
                      cylinder_min
                    </code>{" "}
                    - Cilindro mínimo (ej: -4.00)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>
                    <code className="bg-blue-100 px-1 rounded">
                      cylinder_max
                    </code>{" "}
                    - Cilindro máximo (ej: 4.00)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>
                    <code className="bg-blue-100 px-1 rounded">price</code> o{" "}
                    <code className="bg-blue-100 px-1 rounded">
                      base_price
                    </code>{" "}
                    - Precio de venta
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>
                    <code className="bg-blue-100 px-1 rounded">cost</code> -
                    Costo de compra
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>
                    <code className="bg-blue-100 px-1 rounded">
                      sourcing_type
                    </code>{" "}
                    - Tipo:{" "}
                    <code className="bg-blue-100 px-1 rounded">stock</code> o{" "}
                    <code className="bg-blue-100 px-1 rounded">surfaced</code>
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <p className="font-semibold text-sm mb-2 text-purple-900">
                Columnas para Presbicia (Adición):
              </p>
              <div className="space-y-1 text-xs font-mono text-purple-800">
                <div className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>
                    <code className="bg-purple-100 px-1 rounded">
                      addition_min
                    </code>{" "}
                    - Adición mínima (default: 0.00)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>
                    <code className="bg-purple-100 px-1 rounded">
                      addition_max
                    </code>{" "}
                    - Adición máxima (default: 4.00)
                  </span>
                </div>
              </div>
              <p className="text-xs text-purple-700 mt-2">
                <strong>Importante:</strong> Estos campos son necesarios para
                calcular precios de lentes progresivos, bifocales y trifocales
                que requieren adición para cerca.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <p className="font-semibold text-sm mb-2 text-amber-900">
                Columnas Opcionales:
              </p>
              <div className="space-y-1 text-xs font-mono text-amber-800">
                <div className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>
                    <code className="bg-amber-100 px-1 rounded">
                      is_active
                    </code>{" "}
                    - Activa (default: true)
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
              <p className="font-semibold text-xs mb-2 text-gray-700">
                📝 Notas importantes sobre Adición:
              </p>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>
                  <strong>Lentes Monofocales (single_vision):</strong> Usar{" "}
                  <code className="bg-gray-200 px-1 rounded">
                    addition_min = 0.00
                  </code>{" "}
                  y{" "}
                  <code className="bg-gray-200 px-1 rounded">
                    addition_max = 0.00
                  </code>
                </li>
                <li>
                  <strong>Lentes Progresivos/Bifocales/Trifocales:</strong>{" "}
                  Usar{" "}
                  <code className="bg-gray-200 px-1 rounded">
                    addition_min = 0.00
                  </code>{" "}
                  y{" "}
                  <code className="bg-gray-200 px-1 rounded">
                    addition_max = 4.00
                  </code>{" "}
                  (rango completo)
                </li>
                <li>
                  <strong>Rango de Adición:</strong> Valores válidos entre
                  0.00 y 4.00 dioptrías
                </li>
                <li>
                  Si no se especifican, se usarán los valores por defecto
                  (0.00 y 4.00)
                </li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <p className="font-semibold text-xs mb-2 text-green-800">
                📄 Ejemplo de formato CSV:
              </p>
              <pre className="text-xs font-mono text-green-700 bg-green-100 p-2 rounded overflow-x-auto">
                {`family_name,sphere_min,sphere_max,cylinder_min,cylinder_max,price,cost,sourcing_type,addition_min,addition_max
Varilux Comfort,-10.00,6.00,-4.00,4.00,120000,80000,surfaced,0.00,4.00
Poly Blue Single,-10.00,6.00,-4.00,4.00,80000,50000,stock,0.00,0.00`}
              </pre>
            </div>
          </div>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const fileInput = formData.get("file") as File;

            if (!fileInput) {
              toast.error("Por favor selecciona un archivo CSV");
              return;
            }

            try {
              const uploadFormData = new FormData();
              uploadFormData.append("file", fileInput);

              const response = await fetch(
                "/api/admin/lens-matrices/import",
                {
                  method: "POST",
                  body: uploadFormData,
                },
              );

              const result = await response.json();

              if (!response.ok) {
                throw new Error(result.error || "Error al importar");
              }

              toast.success(
                `Importación completada: ${result.success} exitosas, ${result.errors} errores`,
              );

              if (result.errors > 0 && result.details?.errors) {
                console.error(
                  "Errores de importación:",
                  result.details.errors,
                );
                const errorMessages = result.details.errors
                  .slice(0, 5)
                  .map((err: unknown) => `Fila ${err.row}: ${err.error}`)
                  .join("\n");
                toast.error(
                  `Algunos errores:\n${errorMessages}${
                    result.details.errors.length > 5
                      ? `\n... y ${result.details.errors.length - 5} más`
                      : ""
                  }`,
                  { duration: 10000 },
                );
              }

              onOpenChange(false);
              onImportComplete();
            } catch (error: unknown) {
              toast.error(
                (error as { message?: string }).message || "Error al importar CSV",
              );
            }
          }}
        >
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="file">Archivo CSV</Label>
              <Input
                required
                accept=".csv"
                className="mt-2"
                id="file"
                name="file"
                type="file"
              />
              <p className="text-sm text-muted-foreground mt-2">
                El archivo debe tener encabezados en la primera fila
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Importar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Pencil, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type PrescriptionDisplayData,
  PrescriptionFullDisplay,
} from "@/components/admin/PrescriptionFullDisplay";
import { formatDate } from "@/lib/utils";

const CreatePrescriptionForm = dynamic(
  () => import("@/components/admin/CreatePrescriptionForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-text-primary" />
      </div>
    ),
    ssr: false,
  },
);

interface PrescriptionWithRelations {
  id: string;
  customer_id: string;
  prescription_date: string;
  expiration_date?: string | null;
  prescription_number?: string | null;
  issued_by?: string | null;
  issued_by_license?: string | null;
  od_sphere?: number | null;
  od_cylinder?: number | null;
  od_axis?: number | null;
  od_add?: number | null;
  od_pd?: number | null;
  od_near_pd?: number | null;
  os_sphere?: number | null;
  os_cylinder?: number | null;
  os_axis?: number | null;
  os_add?: number | null;
  os_pd?: number | null;
  os_near_pd?: number | null;
  frame_pd?: number | null;
  height_segmentation?: number | null;
  prescription_type?: string | null;
  lens_type?: string | null;
  lens_material?: string | null;
  prism_od?: string | null;
  prism_os?: string | null;
  tint_od?: string | null;
  tint_os?: string | null;
  coatings?: string[] | null;
  notes?: string | null;
  observations?: string | null;
  recommendations?: string | null;
  is_active?: boolean | null;
  is_current?: boolean | null;
  customer?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    rut?: string | null;
    email?: string | null;
  } | null;
  work_orders_count?: number;
}

interface PrescriptionDialogsProps {
  viewPrescription: PrescriptionWithRelations | null;
  editPrescription: PrescriptionWithRelations | null;
  deletePrescription: PrescriptionWithRelations | null;
  deleting: boolean;
  onViewPrescriptionChange: (p: PrescriptionWithRelations | null) => void;
  onEditPrescriptionChange: (p: PrescriptionWithRelations | null) => void;
  onDeletePrescriptionChange: (p: PrescriptionWithRelations | null) => void;
  onEditFromView: () => void;
  onDelete: () => Promise<void>;
  onFetchPrescriptions: () => void;
}

export function PrescriptionDialogs({
  viewPrescription,
  editPrescription,
  deletePrescription,
  deleting,
  onViewPrescriptionChange,
  onEditPrescriptionChange,
  onDeletePrescriptionChange,
  onEditFromView,
  onDelete,
  onFetchPrescriptions,
}: PrescriptionDialogsProps) {
  return (
    <>
      {/* Ver receta */}
      <Dialog
        open={!!viewPrescription}
        onOpenChange={(open) => !open && onViewPrescriptionChange(null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receta</DialogTitle>
            <DialogDescription>
              {viewPrescription?.customer &&
                `${viewPrescription.customer.first_name || ""} ${viewPrescription.customer.last_name || ""}`.trim()}
              {viewPrescription?.prescription_number &&
                ` · ${viewPrescription.prescription_number}`}
            </DialogDescription>
          </DialogHeader>
          {viewPrescription && (
            <PrescriptionFullDisplay
              prescription={viewPrescription as PrescriptionDisplayData}
              showCard={false}
              subtitle={
                <span className="text-sm text-admin-text-tertiary">
                  {formatDate(viewPrescription.prescription_date)}
                  {viewPrescription.issued_by &&
                    ` · ${viewPrescription.issued_by}`}
                </span>
              }
            />
          )}
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
              variant="outline"
              onClick={() => onViewPrescriptionChange(null)}
            >
              Cerrar
            </Button>
            {viewPrescription && (
              <Button
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
                onClick={onEditFromView}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Modificar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modificar receta */}
      <Dialog
        open={!!editPrescription}
        onOpenChange={(open) => !open && onEditPrescriptionChange(null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modificar receta</DialogTitle>
            <DialogDescription>
              {editPrescription?.customer &&
                `${editPrescription.customer.first_name || ""} ${editPrescription.customer.last_name || ""}`.trim()}
            </DialogDescription>
          </DialogHeader>
          {editPrescription && (
            <CreatePrescriptionForm
              customerId={editPrescription.customer_id}
              initialData={editPrescription}
              onCancel={() => onEditPrescriptionChange(null)}
              onSuccess={() => {
                onEditPrescriptionChange(null);
                onFetchPrescriptions();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Eliminar receta */}
      <Dialog
        open={!!deletePrescription}
        onOpenChange={(open) =>
          !open && !deleting && onDeletePrescriptionChange(null)
        }
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar receta</DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar esta receta?
              {deletePrescription?.customer && (
                <span className="block mt-2 font-medium">
                  {deletePrescription.customer.first_name || ""}{" "}
                  {deletePrescription.customer.last_name || ""} ·{" "}
                  {formatDate(deletePrescription.prescription_date)}
                </span>
              )}
              <span className="block mt-2 text-destructive text-sm">
                Esta acción no se puede deshacer.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
              disabled={deleting}
              variant="outline"
              onClick={() => onDeletePrescriptionChange(null)}
            >
              Cancelar
            </Button>
            <Button
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
              disabled={deleting}
              variant="destructive"
              onClick={onDelete}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

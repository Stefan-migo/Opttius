"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DemoRequest } from "./types";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestToDelete: DemoRequest | null;
  onDeleteConfirm: () => void;
  onCancel: () => void;
  actioning: string | null;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  requestToDelete,
  onDeleteConfirm,
  onCancel,
  actioning,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar solicitud</DialogTitle>
        </DialogHeader>
        {requestToDelete && (
          <div className="space-y-4">
            <p className="text-sm text-white/50">
              ¿Estás seguro de eliminar la solicitud de{" "}
              <strong>
                {requestToDelete.full_name || requestToDelete.email}
              </strong>
              ? Se eliminará toda la información asociada
              {requestToDelete.organization_id &&
                ", incluyendo la organización demo y sus datos"}
              .
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button
                disabled={actioning === requestToDelete.id}
                variant="destructive"
                onClick={onDeleteConfirm}
              >
                {actioning === requestToDelete.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Eliminar"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

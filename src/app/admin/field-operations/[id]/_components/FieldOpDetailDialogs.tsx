"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

import AddCustomerForm from "@/components/admin/AddCustomerForm";
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

const CreateQuoteForm = dynamic(
  () => import("@/components/admin/CreateQuoteForm"),
  {
    loading: () => (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-admin-text-tertiary" />
      </div>
    ),
    ssr: false,
  },
);

const CreatePrescriptionForm = dynamic(
  () => import("@/components/admin/CreatePrescriptionForm"),
  {
    loading: () => (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-admin-text-tertiary" />
      </div>
    ),
    ssr: false,
  },
);

interface DeleteDialogProps {
  open: boolean;
  loading: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}

function ConfirmDeleteDialog({
  open,
  loading,
  title,
  description,
  onCancel,
  onConfirm,
  confirmLabel = "Eliminar",
}: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={loading} variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button disabled={loading} variant="destructive" onClick={onConfirm}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {confirmLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  fieldOperationId: string;
  onSuccess: () => void;
}

function AddCustomerDialog({
  open,
  onOpenChange,
  branchId,
  fieldOperationId,
  onSuccess,
}: AddCustomerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo cliente del operativo</DialogTitle>
          <DialogDescription>
            El cliente quedará vinculado a este operativo en terreno.
          </DialogDescription>
        </DialogHeader>
        <AddCustomerForm
          branchId={branchId}
          fieldOperationId={fieldOperationId}
          onCancel={() => onOpenChange(false)}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}

interface CreateQuoteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  fieldOperationId: string;
  initialCustomerId?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

function CreateQuoteDialog({
  open,
  onOpenChange,
  branchId,
  fieldOperationId,
  initialCustomerId,
  onCancel,
  onSuccess,
}: CreateQuoteDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) onCancel();
      }}
    >
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo presupuesto</DialogTitle>
          <DialogDescription>
            {initialCustomerId
              ? "Presupuesto para el cliente seleccionado."
              : "Solo se mostrarán clientes vinculados a este operativo."}
          </DialogDescription>
        </DialogHeader>
        <CreateQuoteForm
          initialBranchId={branchId}
          initialCustomerId={initialCustomerId}
          initialFieldOperationId={fieldOperationId}
          onCancel={onCancel}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}

interface OpenCashDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  amount: string;
  onAmountChange: (v: string) => void;
  onConfirm: () => void;
  loading: boolean;
}

function OpenCashDialog({
  open,
  onOpenChange,
  amount,
  onAmountChange,
  onConfirm,
  loading,
}: OpenCashDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) onAmountChange("");
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir caja del operativo</DialogTitle>
          <DialogDescription>
            Ingrese el monto inicial de efectivo para abrir la caja.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label
              className="text-sm font-medium text-admin-text-primary"
              htmlFor="opening-cash"
            >
              Monto inicial
            </label>
            <Input
              className="mt-1"
              id="opening-cash"
              min={0}
              placeholder="0"
              step={0.01}
              type="number"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={loading}
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onAmountChange("");
            }}
          >
            Cancelar
          </Button>
          <Button disabled={loading} onClick={onConfirm}>
            {loading ? "Abriendo…" : "Abrir caja"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreatePrescriptionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}

function CreatePrescriptionDialog({
  open,
  onOpenChange,
  customerId,
  onCancel,
  onSuccess,
}: CreatePrescriptionDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) onCancel();
      }}
    >
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva receta</DialogTitle>
          <DialogDescription>
            Crear receta para el cliente del operativo.
          </DialogDescription>
        </DialogHeader>
        {customerId && (
          <CreatePrescriptionForm
            customerId={customerId}
            onCancel={onCancel}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export {
  AddCustomerDialog,
  ConfirmDeleteDialog,
  CreatePrescriptionDialog,
  CreateQuoteDialog,
  OpenCashDialog,
};

"use client";

import { ArrowLeft, CheckCircle, DollarSign, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

interface ActionsSectionProps {
  isOperativoMode: boolean;
  fieldOperationIdFromUrl: string | null;
  effectiveBranchId: string | null;
  isSuperAdmin: boolean;
  closing: boolean;
  closingEnabled: boolean;
  handleCloseCashRegister: () => Promise<void>;
  setShowCloseDialog: (v: boolean) => void;
}

export function CashRegisterActionsSection(props: ActionsSectionProps) {
  const {
    isOperativoMode,
    fieldOperationIdFromUrl,
    effectiveBranchId,
    isSuperAdmin,
    closing,
    closingEnabled,
    handleCloseCashRegister,
    setShowCloseDialog,
  } = props;

  return (
    <>
      {/* Header Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={
            isOperativoMode && fieldOperationIdFromUrl
              ? `/admin/pos?field_operation_id=${fieldOperationIdFromUrl}`
              : "/admin/pos"
          }
        >
          <Button className="shrink-0" size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al POS
          </Button>
        </Link>
        <Button
          className="shrink-0"
          disabled={!effectiveBranchId && !isSuperAdmin}
          onClick={() => setShowCloseDialog(true)}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Cerrar Caja
        </Button>
      </div>

      {/* Close Dialog Footer */}
      <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto order-2 sm:order-1">
          {isOperativoMode && fieldOperationIdFromUrl && (
            <Link
              className="inline-flex"
              href={`/admin/field-operations/${fieldOperationIdFromUrl}`}
            >
              <Button
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al operativo
              </Button>
            </Link>
          )}
          <Button
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
            variant="outline"
            onClick={() => setShowCloseDialog(false)}
          >
            Cancelar
          </Button>
        </div>
        <Button
          className="w-full sm:w-auto min-h-[44px] sm:min-h-0 order-1 sm:order-2"
          disabled={closing || !closingEnabled}
          onClick={handleCloseCashRegister}
        >
          {closing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Cerrando...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Cerrar Caja
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

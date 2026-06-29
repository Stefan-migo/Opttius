"use client";

import { formatDate } from "@/lib/utils";

interface FieldOperation {
  id: string;
  name: string;
  scheduled_date: string;
  location: string | null;
  branch_id: string;
  status: string;
  created_at: string;
}

interface FieldOpSummarySectionProps {
  operation: FieldOperation;
  statusLabel: string;
}

export default function FieldOpSummarySection({
  operation,
  statusLabel,
}: FieldOpSummarySectionProps) {
  return (
    <div className="rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-admin-border-primary/20">
        <h3 className="text-admin-text-primary font-semibold">
          Información del operativo
        </h3>
      </div>
      <div className="p-4 sm:p-6 pt-0 space-y-2 text-admin-text-primary">
        <p>
          <strong>Nombre:</strong> {operation.name}
        </p>
        <p>
          <strong>Fecha:</strong> {formatDate(operation.scheduled_date)}
        </p>
        <p>
          <strong>Ubicación:</strong> {operation.location || "—"}
        </p>
        <p>
          <strong>Estado:</strong> {statusLabel}
        </p>
      </div>
    </div>
  );
}

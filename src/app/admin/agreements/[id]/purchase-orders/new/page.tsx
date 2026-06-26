"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agreementService } from "@/lib/api/services/agreementService";
import { handleApiError } from "@/lib/api/services/errorService";
import { success } from "@/lib/api/services/notificationService";

export default function NewPurchaseOrderPage() {
  const params = useParams();
  const router = useRouter();
  const agreementId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreementName, setAgreementName] = useState("");

  const [ocNumber, setOcNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [maxAmount, setMaxAmount] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    agreementService
      .getAgreement(agreementId)
      .then((a) => setAgreementName(a.name))
      .catch(() => {});
  }, [agreementId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await agreementService.createPurchaseOrder(agreementId, {
        oc_number: ocNumber,
        issued_at: issuedAt || undefined,
        valid_until: validUntil || undefined,
        max_amount: maxAmount !== "" ? maxAmount : undefined,
        notes: notes || undefined,
      });

      success("Orden de compra registrada");
      router.push(`/admin/agreements/${agreementId}`);
    } catch (err) {
      const errorObj = handleApiError(err, "Registrar OC");
      setError(errorObj?.message || "Error al registrar orden de compra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/agreements/${agreementId}`}>
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-admin-text-primary">
            Registrar orden de compra
          </h1>
          <p className="text-sm text-admin-text-tertiary">
            {agreementName || "Convenio"}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Datos de la OC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ocNumber">Número de OC *</Label>
              <Input
                required
                id="ocNumber"
                placeholder="OC-2025-001234"
                value={ocNumber}
                onChange={(e) => setOcNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="issuedAt">Fecha emisión</Label>
                <Input
                  id="issuedAt"
                  type="date"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="validUntil">Vigencia hasta</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="maxAmount">Monto máximo (opcional)</Label>
              <Input
                id="maxAmount"
                min={0}
                placeholder="Sin límite"
                type="number"
                value={maxAmount}
                onChange={(e) =>
                  setMaxAmount(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </div>
            <div>
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button disabled={loading} type="submit">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Registrar
              </Button>
              <Link href={`/admin/agreements/${agreementId}`}>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranch } from "@/hooks/useBranch";
import { agreementService } from "@/lib/api/services/agreementService";
import { handleApiError } from "@/lib/services/errorService";
import { success } from "@/lib/services/notificationService";
import { formatRUT, formatRUTAsYouType } from "@/lib/utils/rut";

export default function NewAgreementPage() {
  const router = useRouter();
  const { currentBranchId } = useBranch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [agreementType, setAgreementType] = useState<
    "empresa" | "sindicato" | "mutual"
  >("empresa");
  const [institutionName, setInstitutionName] = useState("");
  const [institutionRut, setInstitutionRut] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [representativeEmail, setRepresentativeEmail] = useState("");
  const [representativePhone, setRepresentativePhone] = useState("");
  const [validFrom, setValidFrom] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [validUntil, setValidUntil] = useState("");
  const [copagoPercent, setCopagoPercent] = useState(20);
  const [discountPercent, setDiscountPercent] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const agreement = await agreementService.createAgreement({
        name,
        agreement_type: agreementType,
        institution_name: institutionName,
        institution_rut: institutionRut,
        representative_name: representativeName || undefined,
        representative_email: representativeEmail || undefined,
        representative_phone: representativePhone || undefined,
        valid_from: validFrom,
        valid_until: validUntil || undefined,
        branch_id: currentBranchId || undefined,
        billing_rules: {
          copago_percent: copagoPercent,
          institutional_percent: 100 - copagoPercent,
          require_oc: true,
        },
        discount_percent: discountPercent !== "" ? discountPercent : undefined,
        notes: notes || undefined,
      });

      success("Convenio creado correctamente");
      router.push(`/admin/agreements/${agreement.id}`);
    } catch (err) {
      const errorObj = handleApiError(err, "Crear convenio");
      setError(errorObj?.message || "Error al crear convenio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/agreements">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-admin-text-primary">
            Nuevo convenio
          </h1>
          <p className="text-sm text-admin-text-tertiary">
            Crea un convenio con una empresa o institución
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
            <CardTitle>Datos del convenio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Nombre del convenio</Label>
                <Input
                  required
                  id="name"
                  minLength={2}
                  placeholder="Ej: Minera X - Sucursal Centro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="agreementType">Tipo</Label>
                <Select
                  value={agreementType}
                  onValueChange={(v: "empresa" | "sindicato" | "mutual") =>
                    setAgreementType(v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empresa">Empresa</SelectItem>
                    <SelectItem value="sindicato">Sindicato</SelectItem>
                    <SelectItem value="mutual">Mutual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="institutionName">
                  Razón social institucional
                </Label>
                <Input
                  required
                  id="institutionName"
                  minLength={2}
                  placeholder="Ej: Minera Escondida Ltda."
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="institutionRut">RUT institucional</Label>
                <Input
                  required
                  id="institutionRut"
                  placeholder="12.345.678-9"
                  value={institutionRut}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val) {
                      const formatted = formatRUT(val);
                      if (formatted) setInstitutionRut(formatted);
                    }
                  }}
                  onChange={(e) =>
                    setInstitutionRut(formatRUTAsYouType(e.target.value))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="representativeName">Nombre del contacto</Label>
                <Input
                  id="representativeName"
                  placeholder="RR.HH."
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="representativeEmail">Email</Label>
                <Input
                  id="representativeEmail"
                  type="email"
                  value={representativeEmail}
                  onChange={(e) => setRepresentativeEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="representativePhone">Teléfono</Label>
                <Input
                  id="representativePhone"
                  value={representativePhone}
                  onChange={(e) => setRepresentativePhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="validFrom">Vigencia desde</Label>
                <Input
                  required
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="copagoPercent">% Copago (trabajador)</Label>
                <Input
                  id="copagoPercent"
                  max={100}
                  min={0}
                  type="number"
                  value={copagoPercent}
                  onChange={(e) => setCopagoPercent(Number(e.target.value))}
                />
                <p className="text-xs text-admin-text-tertiary mt-1">
                  Porcentaje que paga el trabajador en el POS
                </p>
              </div>
              <div>
                <Label htmlFor="discountPercent">% Descuento (opcional)</Label>
                <Input
                  id="discountPercent"
                  max={100}
                  min={0}
                  type="number"
                  value={discountPercent}
                  onChange={(e) =>
                    setDiscountPercent(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                placeholder="Notas internas"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button disabled={loading} type="submit">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Crear convenio
              </Button>
              <Link href="/admin/agreements">
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

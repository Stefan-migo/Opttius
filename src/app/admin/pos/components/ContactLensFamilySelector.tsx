"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContactLensFamily } from "@/lib/api/services/contactLensFamilyService";

interface Props {
  families: ContactLensFamily[];
  selectedFamilyId: string;
  loadingFamilies: boolean;
  selectedFamily: ContactLensFamily | null;
  onSelect: (familyId: string) => void;
}

export function ContactLensFamilySelector({
  families,
  selectedFamilyId,
  loadingFamilies,
  selectedFamily,
  onSelect,
}: Props) {
  return (
    <>
      <div>
        <Label>Marca y Familia</Label>
        <Select
          value={selectedFamilyId}
          onValueChange={onSelect}
          disabled={loadingFamilies}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                loadingFamilies ? "Cargando..." : "Selecciona una familia"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {families.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No hay familias disponibles
              </div>
            ) : (
              families.map((family) => (
                <SelectItem key={family.id} value={family.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{family.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {family.brand || "Sin marca"} • {family.modality}
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedFamily && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{selectedFamily.modality}</Badge>
            <Badge variant="outline">{selectedFamily.use_type}</Badge>
            <Badge variant="outline">{selectedFamily.packaging}</Badge>
          </div>
          {selectedFamily.description && (
            <p className="text-sm text-muted-foreground">
              {selectedFamily.description}
            </p>
          )}
        </div>
      )}
    </>
  );
}

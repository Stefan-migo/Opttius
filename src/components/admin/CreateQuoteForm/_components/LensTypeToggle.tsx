"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function LensTypeToggle({ lensType, onChange }: { lensType: "optical" | "contact"; onChange: (v: "optical" | "contact") => void }) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
      <Label className="font-medium">Tipo de Lente:</Label>
      <div className="flex gap-2">
        <Button size="sm" type="button" variant={lensType === "optical" ? "default" : "outline"} onClick={() => onChange("optical")}>Lentes Ópticos</Button>
        <Button size="sm" type="button" variant={lensType === "contact" ? "default" : "outline"} onClick={() => onChange("contact")}>Lentes de Contacto</Button>
      </div>
    </div>
  );
}

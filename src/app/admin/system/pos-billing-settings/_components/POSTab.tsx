"use client";

import { Loader2, Save, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";

import SettingsSection from "./SettingsSection";

interface POSSettings {
  min_deposit_percent: number;
  min_deposit_amount: number | null;
}

interface POSTabProps {
  posSettings: POSSettings;
  setPosSettings: React.Dispatch<React.SetStateAction<POSSettings>>;
  handleSavePOS: () => Promise<void>;
  saving: boolean;
}

export default function POSTab({
  posSettings,
  setPosSettings,
  handleSavePOS,
  saving,
}: POSTabProps) {
  return (
    <TabsContent className="space-y-4 sm:space-y-6" value="pos">
      <SettingsSection
        title={
          <>
            <Settings className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            Configuración de Depósito Mínimo
          </>
        }
        description="Configura el depósito mínimo requerido para procesar trabajos. El sistema usará el mayor valor entre el porcentaje y el monto fijo."
      >
        <div className="space-y-2">
          <Label htmlFor="min_deposit_percent">
            Porcentaje Mínimo de Depósito (%)
          </Label>
          <Input
            id="min_deposit_percent"
            max="100"
            min="0"
            placeholder="50.00"
            step="0.01"
            type="number"
            value={posSettings.min_deposit_percent}
            onChange={(e) =>
              setPosSettings({
                ...posSettings,
                min_deposit_percent: parseFloat(e.target.value) || 0,
              })
            }
          />
          <p className="text-xs sm:text-sm text-epoch-primary/80">
            Porcentaje del total de la orden que se requiere como depósito
            mínimo.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="min_deposit_amount">
            Monto Mínimo Fijo de Depósito (Opcional)
          </Label>
          <Input
            id="min_deposit_amount"
            min="0"
            placeholder="Dejar vacío para usar solo porcentaje"
            step="0.01"
            type="number"
            value={posSettings.min_deposit_amount || ""}
            onChange={(e) =>
              setPosSettings({
                ...posSettings,
                min_deposit_amount: e.target.value
                  ? parseFloat(e.target.value)
                  : null,
              })
            }
          />
          <p className="text-xs sm:text-sm text-epoch-primary/80">
            Monto fijo mínimo de depósito. Si se establece, el sistema usará el
            mayor valor entre el porcentaje calculado y este monto fijo.
          </p>
        </div>

        <div className="pt-4 border-t">
          <Button disabled={saving} onClick={handleSavePOS}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Configuración POS
              </>
            )}
          </Button>
        </div>
      </SettingsSection>
    </TabsContent>
  );
}

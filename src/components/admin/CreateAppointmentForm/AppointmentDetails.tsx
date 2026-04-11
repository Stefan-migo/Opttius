import { AlertCircle, Package, RefreshCw } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { AppointmentType } from "./types/appointment.types";

interface AppointmentDetailsProps {
  appointmentType: string;
  status: string;
  reason: string;
  notes: string;
  followUpRequired: boolean;
  followUpDate: string;
  appointmentTypes: AppointmentType[];
  onTypeChange: (type: string) => void;
  onStatusChange: (status: string) => void;
  onReasonChange: (reason: string) => void;
  onNotesChange: (notes: string) => void;
  onFollowUpToggle: (required: boolean) => void;
  onFollowUpDateChange: (date: string) => void;
}

export default function AppointmentDetails({
  appointmentType,
  status,
  reason,
  notes,
  followUpRequired,
  followUpDate,
  appointmentTypes,
  onTypeChange,
  onStatusChange,
  onReasonChange,
  onNotesChange,
  onFollowUpToggle,
  onFollowUpDateChange,
}: AppointmentDetailsProps) {
  return (
    <>
      {/* Appointment Type & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none bg-admin-bg-tertiary/20 shadow-premium-sm rounded-2xl overflow-hidden border border-admin-border-primary/30">
          <CardHeader className="pb-4 border-b border-admin-border-primary/10">
            <CardTitle className="text-sm font-bold text-admin-text-primary flex items-center gap-2">
              <Package className="h-4 w-4 text-admin-accent-primary" />
              Tipo de Servicio
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <Select value={appointmentType} onValueChange={onTypeChange}>
              <SelectTrigger className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-admin-border-primary shadow-premium-lg">
                {appointmentTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem
                      className="font-bold"
                      key={type.value}
                      value={type.value}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 opacity-60" />
                        <span className="uppercase text-[11px] tracking-tight">
                          {type.label}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="border-none bg-admin-bg-tertiary/20 shadow-premium-sm rounded-2xl overflow-hidden border border-admin-border-primary/30">
          <CardHeader className="pb-4 border-b border-admin-border-primary/10">
            <CardTitle className="text-sm font-bold text-admin-text-primary flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-admin-info" />
              Estado Inicial
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-admin-border-primary shadow-premium-lg">
                <SelectItem
                  className="font-bold text-[11px] uppercase tracking-tight"
                  value="scheduled"
                >
                  Programada
                </SelectItem>
                <SelectItem
                  className="font-bold text-[11px] uppercase tracking-tight"
                  value="confirmed"
                >
                  Confirmada
                </SelectItem>
                <SelectItem
                  className="font-bold text-[11px] uppercase tracking-tight"
                  value="completed"
                >
                  Completada
                </SelectItem>
                <SelectItem
                  className="font-bold text-[11px] uppercase tracking-tight text-red-600"
                  value="cancelled"
                >
                  Cancelada
                </SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Notes & Reasoning */}
      <Card className="border-none bg-admin-bg-tertiary/20 shadow-premium-sm rounded-2xl overflow-hidden border border-admin-border-primary/30">
        <CardHeader className="pb-4 border-b border-admin-border-primary/10">
          <CardTitle className="text-sm font-bold text-admin-text-primary flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-admin-accent-primary" />
            Detalles Clínicos & Notas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
              Motivo de la Cita
            </Label>
            <Input
              className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all"
              placeholder="Describa brevemente el motivo..."
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
              Observaciones Internas
            </Label>
            <Textarea
              className="rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all resize-none p-4"
              placeholder="Información relevante para el profesional..."
              rows={3}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/40 rounded-xl border border-admin-border-primary/20">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-admin-text-primary">
                Requiere Seguimiento
              </Label>
              <p className="text-[10px] font-medium text-admin-text-tertiary uppercase">
                Recordatorio automático de control
              </p>
            </div>
            <Switch
              checked={followUpRequired}
              className="data-[state=checked]:bg-admin-accent-primary"
              onCheckedChange={onFollowUpToggle}
            />
          </div>

          {followUpRequired && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
                Cita Proyectada
              </Label>
              <Input
                className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all"
                type="date"
                value={followUpDate}
                onChange={(e) => onFollowUpDateChange(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

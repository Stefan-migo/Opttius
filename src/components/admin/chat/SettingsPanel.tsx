"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, RotateCcw, Sparkles } from "lucide-react";
import { type ChatConfig } from "@/hooks/useChatConfig";
import { SYSTEM_PROMPTS } from "@/lib/ai/agent/config";

interface SettingsPanelProps {
  config: ChatConfig;
  onConfigChange: (config: ChatConfig) => void;
  onClose: () => void;
}

export function SettingsPanel({
  config,
  onConfigChange,
  onClose,
}: SettingsPanelProps) {
  const updateConfig = (updates: Partial<ChatConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-300">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Personalidad del Agente
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5 text-slate-500" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          <section className="space-y-4">
            <div className="space-y-1.5 px-1">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Identidad y Comportamiento
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Define cómo quieres que el asistente se presente y actúe con los
                usuarios de tu óptica.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-primary">
                  System Prompt Personalizado
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateConfig({
                      systemPrompt: SYSTEM_PROMPTS.default,
                      systemPromptPreset: "default",
                    })
                  }
                  className="h-7 px-2.5 text-[10px] font-bold text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
                >
                  <RotateCcw className="w-3 h-3 mr-1.5" />
                  RESETEAR
                </Button>
              </div>

              <div className="relative group">
                <Textarea
                  value={config.systemPrompt}
                  onChange={(e) =>
                    updateConfig({
                      systemPrompt: e.target.value,
                      systemPromptPreset: "custom",
                    })
                  }
                  rows={20}
                  className="min-h-[400px] font-mono text-[13px] leading-relaxed p-4 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:border-primary/50 focus:ring-primary/10 transition-all resize-none shadow-inner"
                  placeholder="Define aquí la personalidad especializada de tu asistente..."
                />
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                <p className="text-[11px] text-amber-700 dark:text-amber-400/80 leading-relaxed font-medium">
                  <strong>TIP:</strong> Incluye detalles específicos sobre tus
                  procesos de ventas o atención al cliente para que el agente
                  sea más efectivo.
                </p>
              </div>
            </div>
          </section>

          <Separator className="bg-slate-100 dark:bg-slate-800" />

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 px-1">
              Configuración de Motor
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Modelo Inteligente
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-tight">
                  Auto-Optimizado
                </span>
              </div>
              <div className="mt-3 text-[11px] text-slate-400 font-medium">
                El sistema utiliza automáticamente el modelo más capaz según tu
                plan para garantizar respuestas precisas y rápidas.
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

import { useCallback, useState } from "react";

import { SYSTEM_PROMPTS } from "@/lib/ai/agent/config";
import type { LLMProvider } from "@/lib/ai/types";

export interface ChatConfig {
  provider: LLMProvider | undefined;
  model: string;
  temperature: number;
  maxTokens: number;
  maxSteps: number;
  enableToolCalling: boolean;
  enabledTools: string[];
  systemPrompt: string;
  systemPromptPreset: keyof typeof SYSTEM_PROMPTS | "custom";
  requireConfirmation: boolean;
}

const DEFAULT_CONFIG: ChatConfig = {
  provider: undefined,
  model: "",
  temperature: 0.7,
  maxTokens: 2000,
  maxSteps: 5,
  enableToolCalling: true,
  enabledTools: [],
  systemPrompt: SYSTEM_PROMPTS.default,
  systemPromptPreset: "default",
  requireConfirmation: true,
};

/**
 * Hook para gestionar la configuración del chat AI
 *
 * Proporciona estado y funciones para configurar el comportamiento del chat,
 * incluyendo proveedor, modelo, temperatura, herramientas, y prompts.
 *
 * @param initialConfig - Configuración inicial (opcional, se mergea con defaults)
 * @returns Objeto con:
 * - `config`: Configuración actual
 * - `updateConfig()`: Función para actualizar la configuración
 * - `resetConfig()`: Función para resetear a valores por defecto
 * - `setSystemPromptPreset()`: Función para cambiar el preset de prompt
 *
 * @example
 * ```typescript
 * function ChatSettings() {
 *   const { config, updateConfig, resetConfig } = useChatConfig({
 *     temperature: 0.9,
 *     maxTokens: 4000
 *   })
 *
 *   return (
 *     <div>
 *       <input
 *         type="range"
 *         value={config.temperature}
 *         onChange={(e) => updateConfig({ temperature: Number(e.target.value) })}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
export function useChatConfig(initialConfig?: Partial<ChatConfig>) {
  // Use useMemo to create initial state only once
  const initialState = useState(() => ({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  }))[0];

  const [config, setConfig] = useState<ChatConfig>(initialState);

  const updateConfig = useCallback((updates: Partial<ChatConfig>) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates };

      if (
        updates.systemPromptPreset &&
        updates.systemPromptPreset !== "custom"
      ) {
        newConfig.systemPrompt = SYSTEM_PROMPTS[updates.systemPromptPreset];
      }

      return newConfig;
    });
  }, []);

  const setProvider = useCallback((provider: LLMProvider | undefined) => {
    setConfig((prev) => ({ ...prev, provider }));
  }, []);

  const setModel = useCallback((model: string) => {
    setConfig((prev) => ({ ...prev, model }));
  }, []);

  const setTemperature = useCallback((temperature: number) => {
    setConfig((prev) => ({
      ...prev,
      temperature: Math.max(0, Math.min(2, temperature)),
    }));
  }, []);

  const setMaxTokens = useCallback((maxTokens: number) => {
    setConfig((prev) => ({
      ...prev,
      maxTokens: Math.max(100, Math.min(32000, maxTokens)),
    }));
  }, []);

  const setMaxSteps = useCallback((maxSteps: number) => {
    setConfig((prev) => ({
      ...prev,
      maxSteps: Math.max(1, Math.min(10, maxSteps)),
    }));
  }, []);

  const setEnableToolCalling = useCallback((enable: boolean) => {
    setConfig((prev) => ({ ...prev, enableToolCalling: enable }));
  }, []);

  const toggleTool = useCallback((toolName: string) => {
    setConfig((prev) => {
      const enabledTools = prev.enabledTools.includes(toolName)
        ? prev.enabledTools.filter((t) => t !== toolName)
        : [...prev.enabledTools, toolName];
      return { ...prev, enabledTools };
    });
  }, []);

  const setEnabledTools = useCallback((tools: string[]) => {
    setConfig((prev) => ({ ...prev, enabledTools: tools }));
  }, []);

  const setSystemPrompt = useCallback((prompt: string) => {
    setConfig((prev) => ({
      ...prev,
      systemPrompt: prompt,
      systemPromptPreset: "custom",
    }));
  }, []);

  const setSystemPromptPreset = useCallback(
    (preset: keyof typeof SYSTEM_PROMPTS | "custom") => {
      setConfig((prev) => ({
        ...prev,
        systemPromptPreset: preset,
        systemPrompt:
          preset === "custom" ? prev.systemPrompt : SYSTEM_PROMPTS[preset],
      }));
    },
    [],
  );

  const setRequireConfirmation = useCallback((require: boolean) => {
    setConfig((prev) => ({ ...prev, requireConfirmation: require }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  const getConfigForAPI = useCallback(() => {
    // Build a clean config object, filtering out undefined/null values
    const apiConfig: {
      temperature?: number;
      maxTokens?: number;
      maxSteps?: number;
      enableToolCalling?: boolean;
      enabledTools?: string[];
      systemPrompt?: string;
      requireConfirmation?: boolean;
      provider?: string;
      model?: string;
    } = {};

    // Only include valid values
    if (typeof config.temperature === "number" && !isNaN(config.temperature)) {
      apiConfig.temperature = config.temperature;
    }
    if (
      typeof config.maxTokens === "number" &&
      !isNaN(config.maxTokens) &&
      config.maxTokens > 0
    ) {
      apiConfig.maxTokens = config.maxTokens;
    }
    if (
      typeof config.maxSteps === "number" &&
      !isNaN(config.maxSteps) &&
      config.maxSteps > 0
    ) {
      apiConfig.maxSteps = config.maxSteps;
    }
    if (typeof config.enableToolCalling === "boolean") {
      apiConfig.enableToolCalling = config.enableToolCalling;
    }
    if (Array.isArray(config.enabledTools)) {
      apiConfig.enabledTools = config.enabledTools.filter(
        (t) => typeof t === "string",
      );
    }
    if (typeof config.systemPrompt === "string" && config.systemPrompt.trim()) {
      apiConfig.systemPrompt = config.systemPrompt;
    }
    if (typeof config.requireConfirmation === "boolean") {
      apiConfig.requireConfirmation = config.requireConfirmation;
    }

    // Only include provider and model if they have values
    if (config.provider && typeof config.provider === "string") {
      apiConfig.provider = config.provider;
    }
    if (
      config.model &&
      typeof config.model === "string" &&
      config.model.trim()
    ) {
      apiConfig.model = config.model;
    }

    // Return empty object if nothing valid, or the cleaned config
    return Object.keys(apiConfig).length > 0 ? apiConfig : null;
  }, [config]);

  return {
    config,
    updateConfig,
    setProvider,
    setModel,
    setTemperature,
    setMaxTokens,
    setMaxSteps,
    setEnableToolCalling,
    toggleTool,
    setEnabledTools,
    setSystemPrompt,
    setSystemPromptPreset,
    setRequireConfirmation,
    resetConfig,
    getConfigForAPI,
  };
}

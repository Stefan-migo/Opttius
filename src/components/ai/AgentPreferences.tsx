"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type BubblePosition = "floating" | "docked";
export type AgentTone = "professional" | "casual" | "concise";

export interface AgentPreferences {
  auto_mode: boolean;
  bubble_position: BubblePosition;
  agent_tone: AgentTone;
}

const DEFAULTS: AgentPreferences = {
  auto_mode: false,
  bubble_position: "floating",
  agent_tone: "professional",
};

// ─── Storage helpers ────────────────────────────────────────────────────────

function storageKey(userId: string): string {
  return `agent:preferences:${userId}`;
}

function loadPreferences(userId: string): AgentPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AgentPreferences>) };
  } catch {
    return DEFAULTS;
  }
}

function savePreferences(userId: string, prefs: AgentPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  } catch {
    // localStorage full or unavailable — skip
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAgentPreferences(userId: string) {
  const [prefs, setPrefs] = useState<AgentPreferences>(() =>
    loadPreferences(userId),
  );

  useEffect(() => {
    savePreferences(userId, prefs);
  }, [userId, prefs]);

  const update = useCallback(
    <K extends keyof AgentPreferences>(key: K, value: AgentPreferences[K]) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const reset = useCallback(() => {
    setPrefs(DEFAULTS);
  }, []);

  return { prefs, update, reset };
}

// ─── Component ──────────────────────────────────────────────────────────────

interface AgentPreferencesProps {
  userId: string;
  prefs: AgentPreferences;
  onUpdate: <K extends keyof AgentPreferences>(
    key: K,
    value: AgentPreferences[K],
  ) => void;
  onClose: () => void;
  onReset: () => void;
}

/**
 * Agent preferences panel — rendered inside BubblePanel or as a modal.
 * Persists to localStorage scoped by userId.
 */
export function AgentPreferencesPanel({
  prefs,
  onUpdate,
  onClose,
  onReset,
}: AgentPreferencesProps) {
  return (
    <div className="flex flex-col gap-4 p-4 text-sm">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800">Preferencias del Agente</h4>
        <button
          type="button"
          aria-label="Cerrar preferencias"
          className="rounded p-1 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Auto-mode toggle */}
      <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
        <div>
          <div className="font-medium text-gray-700">Modo automático</div>
          <div className="text-xs text-gray-500">
            Notificaciones proactivas de stock bajo, citas y OT vencidas
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.auto_mode}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            prefs.auto_mode ? "bg-epoch-primary" : "bg-gray-300"
          }`}
          onClick={() => onUpdate("auto_mode", !prefs.auto_mode)}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              prefs.auto_mode ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </label>

      {/* Bubble position */}
      <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
        <div>
          <div className="font-medium text-gray-700">
            Posición de la burbuja
          </div>
          <div className="text-xs text-gray-500">
            Flotante o panel fijo lateral
          </div>
        </div>
        <select
          value={prefs.bubble_position}
          onChange={(e) =>
            onUpdate("bubble_position", e.target.value as BubblePosition)
          }
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-epoch-accent"
        >
          <option value="floating">Flotante</option>
          <option value="docked">Fijo</option>
        </select>
      </label>

      {/* Agent tone */}
      <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
        <div>
          <div className="font-medium text-gray-700">Tono del agente</div>
          <div className="text-xs text-gray-500">
            Cómo se comunica el asistente
          </div>
        </div>
        <select
          value={prefs.agent_tone}
          onChange={(e) => onUpdate("agent_tone", e.target.value as AgentTone)}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-epoch-accent"
        >
          <option value="professional">Profesional</option>
          <option value="casual">Casual</option>
          <option value="concise">Conciso</option>
        </select>
      </label>

      {/* Reset */}
      <button
        type="button"
        className="self-start rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        onClick={onReset}
      >
        Restablecer valores predeterminados
      </button>
    </div>
  );
}

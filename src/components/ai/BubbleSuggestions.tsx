"use client";

interface Suggestion {
  label: string;
  onClick: () => void;
}

interface BubbleSuggestionsProps {
  suggestions: Suggestion[];
}

/**
 * Contextual suggestion chips shown in repose state.
 * Each chip triggers a pre-defined action or query.
 */
export function BubbleSuggestions({ suggestions }: BubbleSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          className="rounded-full border border-epoch-accent/30 bg-epoch-accent/5 px-3 py-1 text-xs font-medium text-epoch-primary transition-colors hover:bg-epoch-accent/15"
          onClick={s.onClick}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

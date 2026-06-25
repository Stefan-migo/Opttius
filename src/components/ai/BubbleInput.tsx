"use client";

import { useRef } from "react";

interface BubbleInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Auto-resizing textarea with a send button.
 * Disabled when `value` is empty or `disabled` is true.
 */
export function BubbleInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Escribe un mensaje...",
}: BubbleInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSend();
    }
  };

  // Auto-resize: reset height then set to scrollHeight (capped at ~4 lines)
  const handleChange = (val: string) => {
    onChange(val);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`;
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-gray-100 p-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="max-h-24 min-h-[36px] flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-epoch-accent focus:bg-white focus:ring-1 focus:ring-epoch-accent disabled:opacity-50"
      />
      <button
        type="button"
        aria-label="Enviar mensaje"
        disabled={!value.trim() || disabled}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-epoch-accent text-epoch-surface transition-colors hover:bg-epoch-accent/90 disabled:opacity-40"
        onClick={onSend}
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
            d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
          />
        </svg>
      </button>
    </div>
  );
}

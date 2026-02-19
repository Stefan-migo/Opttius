"use client";

import { useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Scan } from "lucide-react";

interface POSBarcodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onScan: (barcode: string) => void;
  onSearch?: (term: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * POS Barcode Input - Detects barcode scanner input.
 * USB barcode scanners typically send characters + Enter in rapid succession (< 100ms).
 * When detected, prioritizes barcode lookup over general search.
 */
export function POSBarcodeInput({
  value,
  onChange,
  onScan,
  onSearch,
  onKeyDown: onKeyDownProp,
  placeholder = "Escanear código o buscar producto...",
  className,
  autoFocus = true,
  inputRef: inputRefProp,
}: POSBarcodeInputProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = inputRefProp || internalRef;
  const lastKeyTimeRef = useRef<number>(0);
  const bufferRef = useRef<string>("");

  const restoreFocus = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      if (e.key === "Enter") {
        e.preventDefault();

        // If we received Enter within 100ms of previous key, treat as barcode scan
        const isLikelyScan =
          timeSinceLastKey < 100 && bufferRef.current.length > 0;

        if (isLikelyScan && bufferRef.current.trim()) {
          const barcode = bufferRef.current.trim();
          onScan(barcode);
          bufferRef.current = "";
          onChange("");
          restoreFocus();
        } else if (value.trim()) {
          // Normal Enter - trigger search
          onSearch?.(value.trim());
          restoreFocus();
        }
        lastKeyTimeRef.current = now;
        return;
      }

      // Delegate other keys (ArrowDown, ArrowUp, Escape) to parent
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Escape") {
        onKeyDownProp?.(e);
        return;
      }

      // Track rapid character input (scanner sends chars very fast)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        lastKeyTimeRef.current = now;
        bufferRef.current = value + e.key;
      }
    },
    [value, onChange, onScan, onSearch, onKeyDownProp, restoreFocus],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      bufferRef.current = newValue;
    },
    [onChange],
  );

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className={`relative ${className || ""}`}>
      <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        ref={inputRef as React.Ref<HTMLInputElement>}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pl-10"
        autoComplete="off"
        autoFocus={autoFocus}
      />
    </div>
  );
}

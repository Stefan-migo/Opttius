"use client";

import { Scan } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";

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
  /** Restore focus after successful scan/search (default: true) */
  restoreFocusOnSuccess?: boolean;
  /** Scan detection window in ms - chars+Enter within this = barcode (default: 150) */
  scanWindowMs?: number;
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
  restoreFocusOnSuccess = true,
  scanWindowMs = 150,
}: POSBarcodeInputProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = inputRefProp || internalRef;
  const lastKeyTimeRef = useRef<number>(0);
  const bufferRef = useRef<string>("");

  const restoreFocus = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [inputRef]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      if (e.key === "Enter") {
        e.preventDefault();

        // If we received Enter within scanWindowMs of previous key, treat as barcode scan
        const isLikelyScan =
          timeSinceLastKey < scanWindowMs && bufferRef.current.length > 0;

        if (isLikelyScan && bufferRef.current.trim()) {
          const barcode = bufferRef.current.trim();
          onScan(barcode);
          bufferRef.current = "";
          onChange("");
          if (restoreFocusOnSuccess) restoreFocus();
        } else if (value.trim()) {
          const term = value.trim();
          // Prioritize barcode lookup for long numeric strings (EAN-13, etc.)
          const isLongNumeric = /^\d{12,}$/.test(term);
          if (isLongNumeric) {
            onScan(term);
            bufferRef.current = "";
            onChange("");
          } else {
            onSearch?.(term);
          }
          if (restoreFocusOnSuccess) restoreFocus();
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
    [
      value,
      onChange,
      onScan,
      onSearch,
      onKeyDownProp,
      restoreFocus,
      restoreFocusOnSuccess,
      scanWindowMs,
    ],
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
        autoComplete="off"
        autoFocus={autoFocus}
        className="pl-10"
        placeholder={placeholder}
        ref={inputRef as React.Ref<HTMLInputElement>}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

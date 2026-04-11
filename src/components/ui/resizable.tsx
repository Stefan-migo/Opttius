"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  onWidthChange?: (width: number) => void;
}

export function ResizablePanel({
  children,
  defaultWidth = 256,
  minWidth = 200,
  maxWidth = 600,
  className,
  onWidthChange,
}: ResizablePanelProps) {
  const [width, setWidth] = React.useState(defaultWidth);
  const [isResizing, setIsResizing] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const onWidthChangeRef = React.useRef(onWidthChange);
  const isResizingRef = React.useRef(false);

  // Keep ref updated without causing re-renders
  React.useEffect(() => {
    onWidthChangeRef.current = onWidthChange;
  }, [onWidthChange]);

  React.useEffect(() => {
    isResizingRef.current = isResizing;
  }, [isResizing]);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current || !isResizingRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
        onWidthChangeRef.current?.(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseup", handleMouseUp, { passive: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  return (
    <div
      className={cn("relative", className)}
      ref={panelRef}
      style={{ width: `${width}px`, flexShrink: 0 }}
    >
      {children}
      <div
        className={cn(
          "absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-admin-accent-primary transition-colors z-10",
          isResizing && "bg-admin-accent-primary",
        )}
        style={{ userSelect: "none" }}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}

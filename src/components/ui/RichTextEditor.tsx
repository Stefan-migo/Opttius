"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bold,
  Italic,
  Underline,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "",
  rows = 4,
  className = "",
}: RichTextEditorProps) {
  const [isRichMode, setIsRichMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (!selectedText) {
      // If no text is selected, just insert the format tags
      const newValue =
        value.substring(0, start) + format + format + value.substring(end);
      onChange(newValue);

      // Set cursor position between the tags
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + format.length,
          start + format.length,
        );
      }, 0);
    } else {
      // If text is selected, wrap it with the format tags
      const newValue =
        value.substring(0, start) +
        format +
        selectedText +
        format +
        value.substring(end);
      onChange(newValue);

      // Set cursor position after the formatted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + format.length, end + format.length);
      }, 0);
    }
  };

  const formatButtons = [
    { icon: Bold, format: "**", tooltip: "Negrita" },
    { icon: Italic, format: "*", tooltip: "Cursiva" },
    { icon: Underline, format: "__", tooltip: "Subrayado" },
  ];

  const alignmentButtons = [
    { icon: AlignLeft, format: "left", tooltip: "Alineación izquierda" },
    { icon: AlignCenter, format: "center", tooltip: "Centrado" },
    { icon: AlignRight, format: "right", tooltip: "Alineación derecha" },
  ];

  const applyAlignment = (alignment: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (selectedText) {
      const newValue =
        value.substring(0, start) +
        `<div style="text-align: ${alignment}">${selectedText}</div>` +
        value.substring(end);
      onChange(newValue);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 rounded-md">
        <Button
          type="button"
          variant={isRichMode ? "default" : "outline"}
          size="sm"
          onClick={() => setIsRichMode(!isRichMode)}
          className="mr-2"
        >
          <Type className="h-4 w-4 mr-1" />
          {isRichMode ? "Modo Simple" : "Formato"}
        </Button>

        {isRichMode && (
          <>
            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              {formatButtons.map((button, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyFormat(button.format)}
                  title={button.tooltip}
                >
                  <button.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              {alignmentButtons.map((button, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyAlignment(button.format)}
                  title={button.tooltip}
                >
                  <button.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Text Area */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="min-h-[100px]"
      />

      {isRichMode && (
        <div className="text-xs text-gray-500">
          <p>
            <strong>Formato:</strong> **negrita**, *cursiva*, __subrayado__
          </p>
          <p>
            <strong>HTML:</strong> También puedes usar etiquetas HTML básicas
            como &lt;strong&gt;, &lt;em&gt;, &lt;u&gt;
          </p>
        </div>
      )}
    </div>
  );
}

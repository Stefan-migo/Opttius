"use client";

import { Code, Eye, FileText, Sparkles } from "lucide-react";
import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getVariablesForEditor } from "@/lib/email/ai-template-variables";

interface Props {
  formType: string;
  subject: string;
  content: string;
  showPreview: boolean;
  onSubjectChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onTogglePreview: () => void;
  onTemplateApply: (templateKey: string) => void;
  onAiAssist: () => void;
  getPreviewSubject: () => string;
  getPreviewHtml: () => string;
}

const EMAIL_TEMPLATES_KEYS: Record<string, { name: string; icon: typeof FileText }> = {
  simple: { name: "Plantilla Simple", icon: FileText },
  modern: { name: "Plantilla Moderna", icon: Sparkles },
  minimal: { name: "Plantilla Minimalista", icon: Code },
};

export function EmailTemplateEditorContent({
  formType,
  subject,
  content,
  showPreview,
  onSubjectChange,
  onContentChange,
  onTogglePreview,
  onTemplateApply,
  onAiAssist,
  getPreviewSubject,
  getPreviewHtml,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + `{{${variable}}}` + after;
      onContentChange(newText);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + variable.length + 4,
          start + variable.length + 4,
        );
      }, 0);
    }
  };

  return (
    <>
      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject">Asunto *</Label>
        <Input
          required
          id="subject"
          placeholder="Ej: Confirmación de tu pedido {{order_number}}"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Puedes usar variables como {"{{customer_name}}"}, {"{{order_number}}"}, etc.
        </p>
      </div>

      {/* Content Editor */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Contenido HTML del Email *</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={onTogglePreview}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? "Ocultar" : "Mostrar"} Vista Previa
            </Button>
          </div>
        </div>

        <div className={`grid gap-4 ${showPreview ? "grid-cols-2" : "grid-cols-1"}`}>
          <div className="space-y-2">
            <div className="border rounded-lg p-2 bg-muted/50">
              <div className="flex gap-2 mb-2 flex-wrap">
                <Select onValueChange={onTemplateApply}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Aplicar plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EMAIL_TEMPLATES_KEYS).map(([key, t]) => {
                      const Icon = t.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {t.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button
                  className="gap-2"
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={onAiAssist}
                >
                  <Sparkles className="h-4 w-4" />
                  Asistir con IA
                </Button>
              </div>
              <Textarea
                required
                className="font-mono text-sm"
                id="content"
                placeholder="<html><body>...</body></html>"
                ref={textareaRef}
                rows={20}
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
              />
            </div>

            {/* Variables Panel */}
            <div className="border rounded-lg p-3 bg-muted/30">
              <Label className="text-sm font-semibold mb-2 block">
                Variables Disponibles
              </Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {getVariablesForEditor(formType).map((varItem) => (
                  <Badge
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    key={varItem.key}
                    title={varItem.description}
                    variant="outline"
                    onClick={() => insertVariable(varItem.key)}
                  >
                    {varItem.label}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Haz clic en una variable para insertarla en el contenido HTML
              </p>
            </div>
          </div>

          {/* Preview Section */}
          {showPreview && (
            <div className="space-y-2">
              <Label>Vista Previa en Tiempo Real</Label>
              <div className="border rounded-lg p-4 bg-white max-h-[600px] overflow-y-auto">
                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm font-semibold text-muted-foreground mb-1">
                    Asunto:
                  </p>
                  <p className="text-base font-medium">{getPreviewSubject()}</p>
                </div>
                <div
                  className="email-preview [&_img]:max-w-full [&_img]:h-auto [&_table]:w-full [&_table]:border-collapse [&_a]:text-[#8B4513] [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                  style={{
                    fontFamily: "Arial, sans-serif",
                    lineHeight: "1.6",
                    maxWidth: "100%",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOC_CONTENT } from "./docContent";

interface DocSectionContentProps {
  section: string;
}

export function DocSectionContent({ section }: DocSectionContentProps) {
  const content = DOC_CONTENT[section as keyof typeof DOC_CONTENT];

  if (!content) {
    return (
      <Card className="rounded-none">
        <CardContent className="py-12 text-center">
          <p className="text-admin-text-tertiary">
            Documentación en preparación para esta sección.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-admin-border-primary/20 bg-admin-border-primary/5 rounded-none shadow-none">
      <CardHeader className="pb-4 border-b border-admin-border-primary/10">
        <CardTitle className="text-2xl font-display font-bold text-admin-text-primary uppercase tracking-tight">
          {content.title}
        </CardTitle>
        <p className="text-[11px] font-serif italic text-admin-text-tertiary uppercase tracking-widest mt-1">
          {content.subtitle}
        </p>
      </CardHeader>
      <CardContent className="p-8 prose prose-sm max-w-none prose-headings:font-display prose-headings:uppercase prose-headings:tracking-wide prose-p:text-admin-text-secondary prose-li:text-admin-text-secondary prose-strong:text-admin-text-primary">
        <div className="space-y-6">{content.body}</div>
      </CardContent>
    </Card>
  );
}

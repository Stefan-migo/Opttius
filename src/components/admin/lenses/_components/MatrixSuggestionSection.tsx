"use client";

import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CONTACT_LENS_DEFAULT_MATRICES } from "@/lib/lens-matrices/constants";
import { CONTACT_LENS_MATRIX_SUGGESTION_DESCRIPTION, CONTACT_LENS_MATRIX_SUGGESTION_ROWS, CONTACT_LENS_MATRIX_SUGGESTION_TITLE } from "@/lib/lens-matrices/suggestion-text";

interface MatrixSuggestionSectionProps {
  open: boolean;
  onToggle: () => void;
  onApplyTemplate: () => void;
}

export function MatrixSuggestionSection({ open, onToggle, onApplyTemplate }: MatrixSuggestionSectionProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors" type="button" onClick={onToggle}>
        <span className="font-medium text-sm text-gray-700">{CONTACT_LENS_MATRIX_SUGGESTION_TITLE}</span>
        {open ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
      </button>
      {open && (
        <div className="p-4 pt-0 space-y-4 border-t">
          <p className="text-sm text-gray-600">{CONTACT_LENS_MATRIX_SUGGESTION_DESCRIPTION}</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Rango</TableHead></TableRow></TableHeader>
              <TableBody>{CONTACT_LENS_MATRIX_SUGGESTION_ROWS.map((row) => <TableRow key={row.name}><TableCell className="font-medium">{row.name}</TableCell><TableCell className="text-gray-600">{row.range}</TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
          <Button size="sm" type="button" variant="outline" onClick={onApplyTemplate}>Crear Rango base + Fallback</Button>
        </div>
      )}
    </div>
  );
}

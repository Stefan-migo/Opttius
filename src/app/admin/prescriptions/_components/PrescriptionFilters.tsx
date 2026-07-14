"use client";

import { RefreshCw, Search } from "lucide-react";
import type { SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PrescriptionFiltersProps {
  searchTerm: string;
  rutFilter: string;
  dateFrom: string;
  dateTo: string;
  issuedBy: string;
  onSearchTermChange: (value: SetStateAction<string>) => void;
  onRutFilterChange: (value: SetStateAction<string>) => void;
  onDateFromChange: (value: SetStateAction<string>) => void;
  onDateToChange: (value: SetStateAction<string>) => void;
  onIssuedByChange: (value: SetStateAction<string>) => void;
  onSearch: () => void;
}

export function PrescriptionFilters({
  searchTerm,
  rutFilter,
  dateFrom,
  dateTo,
  issuedBy,
  onSearchTermChange,
  onRutFilterChange,
  onDateFromChange,
  onDateToChange,
  onIssuedByChange,
  onSearch,
}: PrescriptionFiltersProps) {
  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
      <CardContent className="p-4 sm:p-5 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="lg:col-span-2">
            <Label className="text-[10px] sm:text-xs mb-1 block">
              Buscar
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-admin-text-tertiary" />
              <Input
                className="pl-10 min-h-[44px] sm:min-h-0 h-11 sm:h-10 text-base sm:text-sm"
                placeholder="Nombre, RUT o email..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-[10px] sm:text-xs mb-1 block">RUT</Label>
            <Input
              className="min-h-[44px] sm:min-h-0 h-11 sm:h-10"
              placeholder="12.345.678-9"
              value={rutFilter}
              onChange={(e) => onRutFilterChange(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[10px] sm:text-xs mb-1 block">
              Profesional
            </Label>
            <Input
              className="min-h-[44px] sm:min-h-0 h-11 sm:h-10"
              placeholder="Oftalmólogo..."
              value={issuedBy}
              onChange={(e) => onIssuedByChange(e.target.value)}
            />
          </div>
          <div className="flex gap-2 items-end">
            <Button
              className="flex-1 min-h-[44px] sm:min-h-0 h-11 sm:h-10"
              onClick={onSearch}
            >
              <RefreshCw className="h-4 w-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
          <div>
            <Label className="text-[10px] sm:text-xs mb-1 block">
              Fecha desde
            </Label>
            <Input
              className="min-h-[44px] sm:min-h-0 h-11 sm:h-10"
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[10px] sm:text-xs mb-1 block">
              Fecha hasta
            </Label>
            <Input
              className="min-h-[44px] sm:min-h-0 h-11 sm:h-10"
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

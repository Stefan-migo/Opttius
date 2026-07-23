"use client";

import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductListingSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-admin-border-primary/20 bg-white">
        {[...Array(4)].map((_, i) => (
          <div className="p-8 border-r border-admin-border-primary/10" key={i}>
            <Skeleton className="h-3 w-24 mb-3 opacity-50" />
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-2 w-20 opacity-30" />
          </div>
        ))}
      </div>
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <Skeleton className="h-12 flex-1 max-w-md" />
        <div className="flex gap-2"><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-10" /><Skeleton className="h-10 w-10" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card className="border border-admin-border-primary/10 rounded-xl shadow-none bg-white" key={i}>
            <div className="aspect-square bg-admin-bg-tertiary/20 relative overflow-hidden"><Skeleton className="absolute inset-0" /></div>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2 opacity-50" /></div>
              <div className="flex justify-between items-center pt-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-8 w-8 rounded-full" /></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ProductListingErrorState({
  error, onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card><CardContent className="p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error al cargar productos</h3>
          <p className="text-gray-600 mb-4">{error instanceof Error ? error.message : "Error desconocido"}</p>
          <button className="px-4 py-2 bg-epoch-primary text-white rounded-xl hover:bg-epoch-surface transition-all font-display font-bold text-[10px] tracking-widest uppercase" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      </CardContent></Card>
    </div>
  );
}

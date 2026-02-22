"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DocSectionContent } from "@/components/admin/docs/DocSectionContent";

const VALID_SECTIONS = [
  "dashboard",
  "pos",
  "trabajos",
  "presupuestos",
  "citas",
  "productos",
  "clientes",
  "analiticas",
] as const;

export default function DocSectionPage() {
  const params = useParams();
  const section = params.section as string;

  if (
    !section ||
    !VALID_SECTIONS.includes(section as (typeof VALID_SECTIONS)[number])
  ) {
    return (
      <div className="space-y-6">
        <Link href="/admin/docs">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Documentación
          </Button>
        </Link>
        <Card className="rounded-none">
          <CardContent className="py-12 text-center">
            <p className="text-admin-text-tertiary">Sección no encontrada</p>
            <Button asChild className="mt-4">
              <Link href="/admin/docs">Ir al índice</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/docs">
        <Button variant="ghost" size="sm" className="gap-2 rounded-none">
          <ArrowLeft className="h-4 w-4" />
          Volver a Documentación
        </Button>
      </Link>
      <DocSectionContent section={section} />
    </div>
  );
}

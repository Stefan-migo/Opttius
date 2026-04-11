import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { LensFamilyEditor } from "@/components/admin/lenses/LensFamilyEditor";

interface PageProps {
  params: {
    id: string;
  };
}

export default function LensFamilyDetailPage({ params }: PageProps) {
  return (
    <div className="container mx-auto py-6">
      <Link
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        href="/admin/products?tab=lens-families"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Productos
      </Link>
      <LensFamilyEditor familyId={params.id} />
    </div>
  );
}

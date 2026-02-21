import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LensFamilyWizard } from "@/components/admin/lenses/LensFamilyWizard";

export default function NewLensFamilyPage() {
  return (
    <div className="container mx-auto py-6">
      <Link
        href="/admin/products?tab=lens-families"
        className="inline-flex items-center gap-2 text-sm text-admin-text-tertiary hover:text-epoch-primary transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Productos
      </Link>
      <h1 className="text-3xl font-bold mb-6">Nueva Familia de Lentes</h1>
      <LensFamilyWizard />
    </div>
  );
}

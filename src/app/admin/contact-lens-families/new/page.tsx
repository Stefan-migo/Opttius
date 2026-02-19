import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContactLensFamilyWizard } from "@/components/admin/lenses/ContactLensFamilyWizard";

export default function NewContactLensFamilyPage() {
  return (
    <div className="container mx-auto py-6">
      <Link
        href="/admin/products?tab=contact-lens-families"
        className="inline-flex items-center gap-2 text-sm text-tierra-media hover:text-azul-profundo transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Productos
      </Link>
      <h1 className="text-3xl font-bold mb-6">
        Nueva Familia de Lentes de Contacto
      </h1>
      <ContactLensFamilyWizard />
    </div>
  );
}

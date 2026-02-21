import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContactLensFamilyWizard } from "@/components/admin/lenses/ContactLensFamilyWizard";

interface PageProps {
  params: {
    id: string;
  };
}

export default function EditContactLensFamilyPage({ params }: PageProps) {
  return (
    <div className="container mx-auto py-6">
      <Link
        href="/admin/products?tab=contact-lens-families"
        className="inline-flex items-center gap-2 text-sm text-admin-text-tertiary hover:text-epoch-primary transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Productos
      </Link>
      <h1 className="text-3xl font-bold mb-6">
        Editar Familia de Lentes de Contacto
      </h1>
      <ContactLensFamilyWizard familyId={params.id} />
    </div>
  );
}

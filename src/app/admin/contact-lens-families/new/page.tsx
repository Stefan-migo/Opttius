import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContactLensFamilyWizard } from "@/components/admin/lenses/ContactLensFamilyWizard";

export default function NewContactLensFamilyPage() {
  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 max-w-4xl">
      <div className="flex flex-col gap-4 sm:gap-6 mb-6">
        <Link
          href="/admin/products?tab=contact-lens-families"
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-admin-text-tertiary hover:text-epoch-primary transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Productos
        </Link>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-admin-text-primary">
          Nueva Familia de Lentes de Contacto
        </h1>
      </div>
      <ContactLensFamilyWizard />
    </div>
  );
}

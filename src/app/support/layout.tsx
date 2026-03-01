import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Soporte",
  description:
    "Soporte técnico de Opttius. Reporta incidencias, solicita ayuda o consulta sobre el sistema de gestión para ópticas.",
  robots: { index: true, follow: true },
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

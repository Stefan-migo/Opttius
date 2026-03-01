import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description:
    "Accede a Opttius - Sistema de gestión para ópticas. Centraliza recetas, inventario, laboratorio y ventas.",
  robots: { index: true, follow: true },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description:
    "Regístrate en Opttius - Sistema de gestión para ópticas. Solicita tu demo o crea tu cuenta.",
  robots: { index: true, follow: true },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { QueryProvider } from "@/lib/react-query/QueryProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { TelemetryProvider } from "@/components/providers/telemetry-provider";
import { createClient } from "@/utils/supabase/server";
import { LandingStructuredData } from "@/components/landing/LandingStructuredData";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl";
const isProduction = process.env.NODE_ENV === "production";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default:
      "Opttius - Sistema de Gestión Óptica | Automatiza. Controla. Crece.",
    template: "%s | Opttius",
  },
  description:
    "Sistema de gestión para ópticas. Centraliza recetas, inventario, flujos de laboratorio y ventas. Creado por tecnólogo médico. 100% nativo para ópticas.",
  keywords: [
    "software óptica",
    "gestión óptica",
    "inventario óptica",
    "sistema óptica",
    "recetas oftálmicas",
    "laboratorio óptico",
    "POS óptica",
  ],
  authors: [{ name: "Opttius", url: baseUrl }],
  creator: "Opttius",
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "/",
    siteName: "Opttius",
    title: "Opttius - Sistema de Gestión Óptica",
    description:
      "Automatiza. Controla. Crece. Software 100% nativo para ópticas.",
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "Opttius" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Opttius - Sistema de Gestión Óptica",
    description:
      "Automatiza. Controla. Crece. Software 100% nativo para ópticas.",
  },
  robots: isProduction
    ? {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true },
      }
    : { index: false, follow: false },
  alternates: { canonical: "/" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Obtener usuario en servidor (cookies ya validadas por middleware)
  // Evita redirect erróneo cuando cliente aún no tiene sesión (nueva pestaña/refresh)
  const supabase = await createClient();
  const {
    data: { user: serverUser },
  } = await supabase.auth.getUser();

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${cormorantGaramond.variable} font-sans antialiased`}
      >
        <LandingStructuredData />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <ErrorBoundary>
            <QueryProvider>
              <AuthProvider initialUser={serverUser ?? undefined}>
                <TelemetryProvider>
                  <BranchProvider>{children}</BranchProvider>
                  <Toaster />
                </TelemetryProvider>
              </AuthProvider>
            </QueryProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}

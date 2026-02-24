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

export const metadata: Metadata = {
  title: {
    default: "Opttius - Sistema de Gestión Óptica",
    template: "%s | Opttius",
  },
  description:
    "Opttius - Sistema de gestión para ópticas y laboratorios ópticos",
  robots: {
    index: false,
    follow: false,
  },
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${cormorantGaramond.variable} font-sans antialiased`}
      >
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

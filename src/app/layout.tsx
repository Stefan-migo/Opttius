import type { Metadata } from "next";
import { Inter, Cinzel, Playfair_Display, Lato } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { QueryProvider } from "@/lib/react-query/QueryProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { TelemetryProvider } from "@/components/providers/telemetry-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-lato",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${cinzel.variable} ${playfair.variable} ${lato.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <ErrorBoundary>
            <QueryProvider>
              <AuthProvider>
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

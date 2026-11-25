import type { Metadata } from "next";
import { Montserrat, Jost } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import NombresVisibles from "@/components/NombresVisibles";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "900"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Manufactura",
  description: "Sistema de Control de Piso - Manufactura",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${montserrat.variable} ${jost.variable} antialiased`}>
        {children}
        <Toaster position="top-right" richColors />
        {/* Nombres que se muestran distinto en pantalla (Carolina Escobar → Estiven Londoño); no cambia los registros */}
        <NombresVisibles />
      </body>
    </html>
  );
}
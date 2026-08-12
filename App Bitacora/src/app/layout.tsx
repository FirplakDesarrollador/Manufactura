import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import FirplakLogo from "@/components/FirplakLogo";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "App Bitácora | Firplak",
  description: "Sistema de gestión de bitácoras para supervisores",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={outfit.className}>
        <header className="header">
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <FirplakLogo height={35} color="white" />
            <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <Link href="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                Inicio
              </Link>
              <Link href="/bitacora" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                Bitácora
              </Link>
              <Link href="/admin" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                Crear/Modificar bitacora
              </Link>
              <Link href="/indicadores" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                Indicadores
              </Link>
              <Link href="/admin-general" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                Administrador
              </Link>
            </nav>
          </div>
        </header>
        <main style={{ padding: '40px 0' }}>
          {children}
        </main>
        <footer style={{ textAlign: 'center', padding: '40px 0', color: '#999', fontSize: '0.8rem' }}>
          <p>Desarrollado para Firplak S.A. &copy; {new Date().getFullYear()}</p>
        </footer>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./opt-sistemica.css";

export const metadata: Metadata = {
  title: "OPT Sistémica - Firplak",
  description: "Gestión Integral OPT Firplak",
};

export default function OptSistemicaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="opt-sistemica-wrapper min-h-screen bg-gray-50">
      {children}
    </div>
  );
}

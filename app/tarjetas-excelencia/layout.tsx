import type { Metadata } from "next";
import Header from "@/components/opt-sistemica/Header";
import ChatBot from "@/components/tarjetas-excelencia/ChatBot";

export const metadata: Metadata = {
  title: "Tarjetas de Excelencia Operacional - FIRPLAK",
  description: "Manual digital operativo del sistema de producción, buenas prácticas y estándares.",
};

export default function TarjetasExcelenciaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-20">
      <Header 
        title="Tarjetas de Excelencia"
        subtitle="Módulo Operativo"
      />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <ChatBot />
    </div>
  );
}

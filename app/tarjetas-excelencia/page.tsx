"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import * as Icons from "lucide-react";
import { categorias, tarjetas } from "@/lib/tarjetas-excelencia/data";

// Helper to render dynamic icons safely
const IconComponent = ({ name, size = 24, className = "" }: { name: string; size?: number; className?: string }) => {
  const Icon = (Icons as any)[name] || Icons.HelpCircle;
  return <Icon size={size} className={className} />;
};

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategorias = categorias.filter(cat =>
    cat.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20">

      {/* Hero / Search Section */}
      <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#1b3346]">
          Buenas Prácticas y Estándares
        </h2>
        <p className="text-gray-500 max-w-lg">
          Consulta rápida para supervisores, líderes y personal de producción.
        </p>

        <div className="w-full max-w-xl relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-gray-400 group-focus-within:text-[#0284c7] transition-colors" size={20} />
          </div>
          <input
            type="text"
            placeholder="Buscar por categoría, proceso o palabra clave..."
            className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 outline-none transition-all shadow-sm text-gray-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </section>

      {/* Grid of Categories */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#1b3346] flex items-center gap-2">
            <Icons.Library size={24} className="text-[#0284c7]" />
            Categorías
          </h3>
        </div>

        {filteredCategorias.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No se encontraron categorías para tu búsqueda.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredCategorias.map((cat, i) => (
              <Link
                href={`/tarjetas-excelencia/categorias/${cat.id}`}
                key={cat.id}
                className="group relative bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-[#0284c7]/30 transition-all duration-300 overflow-hidden"
              >
                {/* Decorative Accent */}
                <div className="absolute top-0 left-0 w-1 h-full bg-[#0284c7] opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start justify-between">
                  <div className="bg-blue-50 text-[#0284c7] p-3 rounded-xl group-hover:scale-110 group-hover:bg-[#0284c7] group-hover:text-white transition-all duration-300">
                    <IconComponent name={cat.icon} />
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-[#0284c7] transform group-hover:translate-x-1 transition-all" />
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold text-lg text-gray-900 mb-1 group-hover:text-[#1b3346] transition-colors">
                    {cat.nombre}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {tarjetas.filter(t => t.categoria_id === cat.id).length} tarjetas
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, FileText, ArrowRight, Library, Search } from "lucide-react";
import * as Icons from "lucide-react";
import { categorias, tarjetas } from "@/lib/tarjetas-excelencia/data";

// Helper to render dynamic icons safely
const IconComponent = ({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) => {
  const Icon = (Icons as any)[name] || Icons.HelpCircle;
  return <Icon size={size} className={className} />;
};

export default function TarjetasExcelenciaPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Process categories and their cards based on the search query
  const filteredCategoriesAndCards = categorias.map((cat) => {
    const cards = tarjetas.filter(
      (t) =>
        t.categoria_id === cat.id &&
        (t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cat.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return {
      ...cat,
      cards,
    };
  }).filter(cat => cat.cards.length > 0);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20 max-w-[1200px] mx-auto w-full">
      
      {/* Top Search Bar */}
      <div className="w-full max-w-2xl mx-auto relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="text-[#324354] opacity-75 group-focus-within:text-[#0284c7] transition-colors" size={20} />
        </div>
        <input
          type="text"
          placeholder="Buscar por categoría, tarjeta, proceso o palabra clave..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 outline-none transition-all shadow-sm text-gray-700 font-medium placeholder-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Main Vertical Feed */}
      <div className="space-y-12">
        {filteredCategoriesAndCards.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4 max-w-2xl mx-auto">
            <BookOpen className="text-slate-300" size={64} />
            <h3 className="text-xl font-bold text-[#324354]">No se encontraron resultados</h3>
            <p className="text-slate-500 text-sm max-w-md">
              Intenta con otra palabra clave o limpia el buscador para ver todas las tarjetas operativas de excelencia.
            </p>
          </div>
        ) : (
          filteredCategoriesAndCards.map((cat) => (
            <div key={cat.id} className="space-y-6">
              
              {/* Category Section Header */}
              <div className="flex items-center gap-3 border-b border-slate-200/60 pb-3">
                <div className="p-2.5 bg-blue-50 text-[#0284c7] rounded-xl">
                  <IconComponent name={cat.icon} size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#324354] tracking-tight">
                    {cat.nombre}
                  </h2>
                  <p className="text-[10px] font-bold text-[#7B8E90] uppercase tracking-wider mt-0.5">
                    {cat.cards.length} {cat.cards.length === 1 ? 'Tarjeta Operativa' : 'Tarjetas Operativas'}
                  </p>
                </div>
              </div>

              {/* Grid of Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cat.cards.map((tarjeta) => (
                  <Link
                    key={tarjeta.id}
                    href={`/tarjetas-excelencia/tarjetas/${tarjeta.id}`}
                    className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                  >
                    {/* Decorative Accent */}
                    <div className="h-2 bg-[#0284c7] group-hover:bg-[#324354] transition-colors" />

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-base font-bold text-[#324354] group-hover:text-[#0284c7] transition-colors line-clamp-2 leading-snug">
                            {tarjeta.titulo}
                          </h3>
                          <FileText className="text-slate-400 shrink-0" size={20} />
                        </div>

                        <p className="text-slate-600 text-xs leading-relaxed line-clamp-3 mb-4">
                          {tarjeta.descripcion}
                        </p>
                      </div>

                      <div className="flex items-center text-xs font-semibold text-[#0284c7] group-hover:text-[#324354] transition-colors pt-2 border-t border-slate-100">
                        Ver detalle completo
                        <ArrowRight className="ml-1.5 w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}

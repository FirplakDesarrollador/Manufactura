"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, AlertCircle, FileText } from "lucide-react";
import { categorias, tarjetas } from "@/lib/tarjetas-excelencia/data";
import { notFound } from "next/navigation";

export default function CategoriaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const categoriaId = parseInt(id);
    const categoria = categorias.find(c => c.id === categoriaId);
    const categoryCards = tarjetas.filter(t => t.categoria_id === categoriaId);

    if (!categoria) {
        return notFound();
    }

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-20">

            {/* Header con Back */}
            <div className="flex items-center gap-4">
                <Link
                    href="/tarjetas-excelencia"
                    className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors border border-gray-100 text-gray-600"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-[#1b3346] tracking-tight">{categoria.nombre}</h2>
                    <p className="text-sm text-gray-500">{categoryCards.length} tarjetas operativas</p>
                </div>
            </div>

            {/* Lista de Tarjetas */}
            {categoryCards.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
                    <BookOpen className="text-gray-300" size={48} />
                    <p className="text-gray-500">Próximamente estaremos agregando contenido a esta categoría.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryCards.map((tarjeta) => (
                        <Link
                            key={tarjeta.id}
                            href={`/tarjetas-excelencia/tarjetas/${tarjeta.id}`}
                            className="group bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                        >
                            {/* Tarjeta Cabeza Estilizada */}
                            <div className="h-2 bg-[#0284c7] group-hover:bg-[#1b3346] transition-colors" />

                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="text-lg font-bold text-[#1b3346] group-hover:text-[#0284c7] transition-colors line-clamp-2">
                                        {tarjeta.titulo}
                                    </h3>
                                    <FileText className="text-gray-400 shrink-0" size={24} />
                                </div>

                                <p className="text-gray-600 text-sm line-clamp-3 mb-6 flex-1">
                                    {tarjeta.descripcion}
                                </p>

                                <div className="flex items-center text-sm font-semibold text-[#0284c7] group-hover:text-[#1b3346] transition-colors pb-1">
                                    Ver detalle completo
                                    <ArrowLeft className="ml-2 w-4 h-4 rotate-180 transform group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

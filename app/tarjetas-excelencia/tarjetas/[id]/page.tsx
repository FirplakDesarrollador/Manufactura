"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, Lightbulb, Star, Info } from "lucide-react";
import { categorias, tarjetas } from "@/lib/tarjetas-excelencia/data";
import { notFound } from "next/navigation";

export default function TarjetaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const tarjetaId = parseInt(id);
    const tarjeta = tarjetas.find(t => t.id === tarjetaId);

    if (!tarjeta) {
        return notFound();
    }

    const categoria = categorias.find(c => c.id === tarjeta.categoria_id);

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-5 duration-500">

            {/* Navegacion y Contexto */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Link
                        href={`/tarjetas-excelencia/categorias/${tarjeta.categoria_id}`}
                        className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors text-gray-500"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <span className="text-sm font-medium px-3 py-1 bg-blue-50 text-[#0284c7] rounded-full border border-blue-100">
                        {categoria?.nombre}
                    </span>
                </div>
            </div>

            {/* Titulo Header */}
            <div className="bg-white rounded-t-3xl rounded-b-xl border border-[#1b3346]/20 shadow-md p-8 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-4 bg-[#1b3346]" />

                <h1 className="text-3xl md:text-4xl font-extrabold text-[#1b3346] tracking-tight mt-2 mb-4">
                    {tarjeta.titulo}
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed border-l-4 border-[#0284c7] pl-4">
                    {tarjeta.descripcion}
                </p>
            </div>

            {/* Contenido Modular */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Columna Principal - Pasos */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
                        <h2 className="text-xl font-bold text-[#1b3346] mb-6 flex items-center gap-2 border-b pb-4">
                            <CheckCircle2 className="text-[#0284c7]" size={24} />
                            Pasos para la Ejecución
                        </h2>

                        <div className="space-y-8">
                            {tarjeta.pasos.map((paso, idx) => (
                                <div key={idx} className="relative pl-6 sm:pl-8 border-l-2 border-dashed border-gray-200">
                                    <span className="absolute -left-[17px] top-0 bg-white border-2 border-[#0284c7] text-[#0284c7] font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm">
                                        {idx + 1}
                                    </span>

                                    <h3 className="font-bold text-lg text-[#1b3346] mb-3 leading-none pt-1">
                                        {paso.titulo}
                                    </h3>

                                    <ul className="space-y-3">
                                        {paso.items.map((item, itemIdx) => {
                                            const isNota = item.startsWith("Nota:");
                                            return (
                                                <li
                                                    key={itemIdx}
                                                    className={`flex items-start gap-3 rounded-lg ${isNota ? 'bg-blue-50 p-3 text-[#0284c7] border border-blue-100 mt-4' : 'text-gray-700'}`}
                                                >
                                                    {!isNota && <div className="mt-1.5 w-2 h-2 rounded-full bg-gray-300 shrink-0" />}
                                                    <span className={isNota ? 'font-medium' : ''}>{item}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Columna Lateral - Tips y Detalles */}
                <div className="space-y-6">

                    {/* Puntos Clave */}
                    <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-6">
                        <h3 className="font-bold text-[#1b3346] mb-4 flex items-center gap-2">
                            <Star className="text-yellow-500 fill-yellow-500" size={20} />
                            Puntos Clave
                        </h3>
                        <ul className="space-y-3">
                            {tarjeta.puntos_clave.map((pt, i) => (
                                <li key={i} className="flex gap-2 text-sm text-gray-700">
                                    <div className="text-[#0284c7] font-bold shrink-0">•</div>
                                    {pt}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Errores Comunes */}
                    <div className="bg-red-50/50 rounded-2xl border border-red-100 p-6">
                        <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-red-500" size={20} />
                            Errores Comunes
                        </h3>
                        <ul className="space-y-3">
                            {tarjeta.errores_comunes.map((err, i) => (
                                <li key={i} className="flex gap-2 text-sm text-red-700">
                                    <div className="text-red-500 font-bold shrink-0">✗</div>
                                    {err}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Buenas Prácticas */}
                    <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-6">
                        <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
                            <Lightbulb className="text-emerald-500" size={20} />
                            Buenas Prácticas
                        </h3>
                        <ul className="space-y-3">
                            {tarjeta.buenas_practicas.map((bp, i) => (
                                <li key={i} className="flex gap-2 text-sm text-emerald-700">
                                    <div className="text-emerald-500 font-bold shrink-0">✓</div>
                                    {bp}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Ejemplo Práctico */}
                    {tarjeta.ejemplo && (
                        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 shadow-sm">
                            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <Info className="text-gray-400" size={20} />
                                Ejemplo en Planta
                            </h3>
                            <p className="text-sm text-gray-600 italic">
                                "{tarjeta.ejemplo}"
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

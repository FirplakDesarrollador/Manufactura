"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, SlidersHorizontal } from "lucide-react";

export default function IndicadoresProductividadPage() {
    const [viewMode, setViewMode] = useState<"bi" | "manual">("bi");

    // States for manual indicators
    const [nivelServicio, setNivelServicio] = useState<number>(72.4);
    const [productividadPct, setProductividadPct] = useState<number>(82.5);
    const [productividadPz, setProductividadPz] = useState<number>(467);
    const [productividadKg, setProductividadKg] = useState<number>(4951);
    const [calidad, setCalidad] = useState<number>(80.9);
    const [presentismo, setPresentismo] = useState<number>(98.6);
    const [accidentes, setAccidentes] = useState<number>(1);

    // Editing states for custom formatting
    const [editingCard, setEditingCard] = useState<string | null>(null);

    // Color logic thresholds matching the dashboard styling
    const getCardColor = (type: string, value: number) => {
        switch (type) {
            case "nivelServicio":
                return value >= 90 ? "bg-[#59a96a]" : value >= 80 ? "bg-[#deb841]" : "bg-[#d14747]";
            case "productividadPct":
                return value >= 90 ? "bg-[#59a96a]" : value >= 80 ? "bg-[#deb841]" : "bg-[#d14747]";
            case "productividadPz":
                return value >= 630 ? "bg-[#59a96a]" : value >= 550 ? "bg-[#deb841]" : "bg-[#d14747]";
            case "productividadKg":
                return value >= 6300 ? "bg-[#59a96a]" : value >= 5500 ? "bg-[#deb841]" : "bg-[#d14747]";
            case "calidad":
                return value >= 90 ? "bg-[#59a96a]" : value >= 85 ? "bg-[#deb841]" : "bg-[#d14747]";
            case "presentismo":
                return value >= 100 ? "bg-[#59a96a]" : value >= 95 ? "bg-[#deb841]" : "bg-[#d14747]";
            case "accidentes":
                return value === 0 ? "bg-[#59a96a]" : "bg-[#d14747]";
            default:
                return "bg-slate-100";
        }
    };

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col justify-between font-sans text-[#000000]">
            {/* Header */}
            <header className="w-full bg-[#324354] text-white shadow-md p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/home">
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 text-white font-bold text-sm transition">
                            <ArrowLeft size={18} />
                            <span>Volver al Home</span>
                        </button>
                    </Link>
                    <h1 className="font-display font-light text-lg md:text-xl uppercase tracking-widest text-center">
                        Tablero de Control
                    </h1>
                    <div className="flex flex-col items-end">
                        <div className="font-bold text-xl tracking-wider leading-none">FIRPLAK</div>
                        <div className="text-[9px] opacity-70 uppercase tracking-widest">inspiring homes</div>
                    </div>
                </div>
            </header>

            {/* Sub-Header Actions */}
            <div className="w-full bg-white border-b border-[#e2ded5] py-3 px-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-4">
                    <button
                        onClick={() => setViewMode("bi")}
                        className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition duration-200 ${
                            viewMode === "bi"
                                ? "bg-[#324354] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <LayoutGrid size={18} />
                        <span>Tablero BI</span>
                    </button>
                    <button
                        onClick={() => setViewMode("manual")}
                        className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition duration-200 ${
                            viewMode === "manual"
                                ? "bg-[#324354] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <SlidersHorizontal size={18} />
                        <span>Tablero Manual</span>
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 pb-20">
                {viewMode === "bi" ? (
                    <div className="w-full h-[650px] bg-white rounded-3xl shadow-sm border border-[#e2ded5] overflow-hidden">
                        <iframe
                            title="Tablero BI Productividad"
                            width="100%"
                            height="100%"
                            src="https://app.powerbi.com/view?r=eyJrIjoiN2MxNmUwZTUtYTY0MC00MmFjLWI2ZjctMDYzNDJlODU4MTk0IiwidCI6ImZhMWRlMDRmLTQ3ODAtNGQ4My1hOTQyLTkzYzdhZThkZWU5ZCIsImMiOjR9"
                            frameBorder="0"
                            allowFullScreen={true}
                            className="w-full h-full border-none"
                        ></iframe>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* Title & Instructions */}
                        <div className="text-center max-w-2xl mx-auto space-y-2">
                            <h2 className="text-2xl font-extrabold text-[#324354]">Resumen Manual de Productividad</h2>
                            <p className="text-sm text-slate-500 font-medium">
                                Haz clic sobre cualquier número para editar el valor manualmente. Los colores de las tarjetas se actualizarán de forma automática según las metas establecidas.
                            </p>
                        </div>

                        {/* Top Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Card 1: Nivel de Servicio */}
                            <div className="flex flex-col space-y-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-tight text-center uppercase">
                                    META NIVEL DE SERVICIO = 90%
                                </span>
                                <div className={`flex-1 min-h-[160px] flex flex-col justify-between p-6 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor("nivelServicio", nivelServicio)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingCard === "nivelServicio" ? (
                                            <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={nivelServicio}
                                                    onChange={(e) => setNivelServicio(parseFloat(e.target.value) || 0)}
                                                    onBlur={() => setEditingCard(null)}
                                                    autoFocus
                                                    className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-5xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-32 py-1"
                                                />
                                                <span className="text-4xl font-extrabold text-slate-950">%</span>
                                            </div>
                                        ) : (
                                            <span 
                                                onClick={() => setEditingCard("nivelServicio")}
                                                className="cursor-pointer hover:bg-black/5 px-4 py-2 rounded-xl text-5xl font-black text-center tracking-tight transition"
                                            >
                                                {nivelServicio.toFixed(1)} %
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Nivel Servicio (%)
                                    </span>
                                </div>
                            </div>

                            {/* Card 2: Productividad % */}
                            <div className="flex flex-col space-y-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-tight text-center uppercase">
                                    META PROD. (%) = 90%
                                </span>
                                <div className={`flex-1 min-h-[160px] flex flex-col justify-between p-6 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor("productividadPct", productividadPct)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingCard === "productividadPct" ? (
                                            <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={productividadPct}
                                                    onChange={(e) => setProductividadPct(parseFloat(e.target.value) || 0)}
                                                    onBlur={() => setEditingCard(null)}
                                                    autoFocus
                                                    className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-5xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-32 py-1"
                                                />
                                                <span className="text-4xl font-extrabold text-slate-950">%</span>
                                            </div>
                                        ) : (
                                            <span 
                                                onClick={() => setEditingCard("productividadPct")}
                                                className="cursor-pointer hover:bg-black/5 px-4 py-2 rounded-xl text-5xl font-black text-center tracking-tight transition"
                                            >
                                                {productividadPct.toFixed(1)} %
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Productividad (%)
                                    </span>
                                </div>
                            </div>

                            {/* Card 3: Productividad PZ */}
                            <div className="flex flex-col space-y-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-tight text-center uppercase">
                                    META PROD. (PZ) = 630
                                </span>
                                <div className={`flex-1 min-h-[160px] flex flex-col justify-between p-6 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor("productividadPz", productividadPz)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingCard === "productividadPz" ? (
                                            <input
                                                type="number"
                                                value={productividadPz}
                                                onChange={(e) => setProductividadPz(parseInt(e.target.value) || 0)}
                                                onBlur={() => setEditingCard(null)}
                                                autoFocus
                                                className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-5xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-36 py-1"
                                            />
                                        ) : (
                                            <span 
                                                onClick={() => setEditingCard("productividadPz")}
                                                className="cursor-pointer hover:bg-black/5 px-4 py-2 rounded-xl text-5xl font-black text-center tracking-tight transition"
                                            >
                                                {productividadPz.toLocaleString("es-CO")}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Productividad (PZ)
                                    </span>
                                </div>
                            </div>

                            {/* Card 4: Productividad KG */}
                            <div className="flex flex-col space-y-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-tight text-center uppercase">
                                    META PROD. (KG) = 6300
                                </span>
                                <div className={`flex-1 min-h-[160px] flex flex-col justify-between p-6 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor("productividadKg", productividadKg)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingCard === "productividadKg" ? (
                                            <input
                                                type="number"
                                                value={productividadKg}
                                                onChange={(e) => setProductividadKg(parseInt(e.target.value) || 0)}
                                                onBlur={() => setEditingCard(null)}
                                                autoFocus
                                                className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-5xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-36 py-1"
                                            />
                                        ) : (
                                            <span 
                                                onClick={() => setEditingCard("productividadKg")}
                                                className="cursor-pointer hover:bg-black/5 px-4 py-2 rounded-xl text-5xl font-black text-center tracking-tight transition"
                                            >
                                                {productividadKg.toLocaleString("es-CO")}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Productividad (KG)
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            {/* Card 5: Calidad */}
                            <div className="flex flex-col space-y-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-tight text-center uppercase">
                                    META CALIDAD = 90%
                                </span>
                                <div className={`flex-1 min-h-[160px] flex flex-col justify-between p-6 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor("calidad", calidad)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingCard === "calidad" ? (
                                            <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={calidad}
                                                    onChange={(e) => setCalidad(parseFloat(e.target.value) || 0)}
                                                    onBlur={() => setEditingCard(null)}
                                                    autoFocus
                                                    className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-5xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-32 py-1"
                                                />
                                                <span className="text-4xl font-extrabold text-slate-950">%</span>
                                            </div>
                                        ) : (
                                            <span 
                                                onClick={() => setEditingCard("calidad")}
                                                className="cursor-pointer hover:bg-black/5 px-4 py-2 rounded-xl text-5xl font-black text-center tracking-tight transition"
                                            >
                                                {calidad.toFixed(1)} %
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Calidad
                                    </span>
                                </div>
                            </div>

                            {/* Card 6: Presentismo */}
                            <div className="flex flex-col space-y-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-tight text-center uppercase">
                                    META PRESENTISMO = 100%
                                </span>
                                <div className={`flex-1 min-h-[160px] flex flex-col justify-between p-6 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor("presentismo", presentismo)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingCard === "presentismo" ? (
                                            <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={presentismo}
                                                    onChange={(e) => setPresentismo(parseFloat(e.target.value) || 0)}
                                                    onBlur={() => setEditingCard(null)}
                                                    autoFocus
                                                    className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-5xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-32 py-1"
                                                />
                                                <span className="text-4xl font-extrabold text-slate-950">%</span>
                                            </div>
                                        ) : (
                                            <span 
                                                onClick={() => setEditingCard("presentismo")}
                                                className="cursor-pointer hover:bg-black/5 px-4 py-2 rounded-xl text-5xl font-black text-center tracking-tight transition"
                                            >
                                                {presentismo.toFixed(1)} %
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Presentismo
                                    </span>
                                </div>
                            </div>

                            {/* Card 7: Seguridad (Accidentes) */}
                            <div className="flex flex-col space-y-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-tight text-center uppercase">
                                    META SEGURIDAD = 0
                                </span>
                                <div className={`flex-1 min-h-[160px] flex flex-col justify-between p-6 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor("accidentes", accidentes)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingCard === "accidentes" ? (
                                            <input
                                                type="number"
                                                value={accidentes}
                                                onChange={(e) => setAccidentes(parseInt(e.target.value) || 0)}
                                                onBlur={() => setEditingCard(null)}
                                                autoFocus
                                                className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-5xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-32 py-1"
                                            />
                                        ) : (
                                            <span 
                                                onClick={() => setEditingCard("accidentes")}
                                                className="cursor-pointer hover:bg-black/5 px-4 py-2 rounded-xl text-5xl font-black text-center tracking-tight transition"
                                            >
                                                {accidentes}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Accidentes
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-gray-400 text-sm border-t border-[#e2ded5] bg-white">
                &copy; {new Date().getFullYear()} Firplak. Todos los derechos reservados.
            </footer>
        </div>
    );
}

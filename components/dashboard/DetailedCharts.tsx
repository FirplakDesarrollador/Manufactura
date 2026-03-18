'use client'

import React from 'react'
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts'
import { PinturaColor, VaciadoTamano, ProgramacionColor, ProgramacionTamano } from "@/lib/supabase/queries/dashboard"
import { Palette, Maximize, Target, LucideIcon } from "lucide-react";

const TableHeader = ({ title, icon: Icon }: { title: string, icon: LucideIcon }) => (
    <div className="flex items-center gap-2 mb-4">
        <h3 className="text-[#00a3e0] text-sm font-bold uppercase tracking-widest">{title}</h3>
        <Icon size={16} className="text-[#00a3e0]" />
    </div>
)

interface DetailedChartsProps {
    pinturaColor: PinturaColor | null
    vaciadoTamano: VaciadoTamano | null
    progColor: ProgramacionColor[]
    progTamano: ProgramacionTamano[]
    loading: boolean
}

const COLORS = ['#00a3e0', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1']

export function DetailedCharts({ pinturaColor, vaciadoTamano, progColor, progTamano, loading }: DetailedChartsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-8">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse h-64 bg-white rounded-xl border border-gray-100 shadow-sm" />
                ))}
            </div>
        )
    }


    // Map Pintura Colors from the data
    const colorsList = [
        { name: 'Blanco', total: 'total_pintura', l1: 'blanca_l1', l2: 'blanca_l2', l3: 'blanca_l3', display: 'Blanco' },
        { name: 'Natural', total: 'natural', l1: 'natural_l1', l2: 'natural_l2', l3: 'natural_l3', display: 'Natural' },
        { name: 'Marfil', total: 'marfil', l1: 'marfil_l1', l2: 'marfil_l2', l3: 'marfil_l3', display: 'Marfil' },
        { name: 'Gris Bruma', total: 'gris_bruma', l1: 'gris_bruma_l1', l2: 'gris_bruma_l2', l3: 'gris_bruma_l3', display: 'Gris Bruma' },
        { name: 'Gris', total: 'gris', l1: 'gris_l1', l2: 'gris_l2', l3: 'gris_l3', display: 'Gris' },
        { name: 'Gris Sombra', total: 'gris_sombra', l1: 'gris_sombra_l1', l2: 'gris_sombra_l2', l3: 'gris_sombra_l3', display: 'Gris Sombra' },
        { name: 'Gris Niebla', total: 'gris_niebla', l1: 'gris_niebla_l1', l2: 'gris_niebla_l2', l3: 'gris_niebla_l3', display: 'Gris Niebla' },
        { name: 'Granito Champaña', total: 'granito_champana', l1: 'granito_champana_l1', l2: 'granito_champana_l2', l3: 'granito_champana_l3', display: 'Granito Champaña' },
        { name: 'Granito Gris', total: 'granito_gris', l1: 'granito_gris_l1', l2: 'granito_gris_l2', l3: 'granito_gris_l3', display: 'Granito Gris' },
        { name: 'Granito Negro', total: 'granito_negro', l1: 'granito_negro_l1', l2: 'granito_negro_l2', l3: 'granito_negro_l3', display: 'Granito Negro' },
        { name: 'Granito Perla', total: 'granito_perla', l1: 'granito_perla_l1', l2: 'granito_perla_l2', l3: 'granito_perla_l3', display: 'Granito Perla' },
        { name: 'Granito Blanco', total: 'granito_blanco', l1: 'granito_blanco_l1', l2: 'granito_blanco_l2', l3: 'granito_blanco_l3', display: 'Granito Blanco' },
        { name: 'Granito Marfil', total: 'granito_marfil', l1: 'granito_marfil_l1', l2: 'granito_marfil_l2', l3: 'granito_marfil_l3', display: 'Granito Marfil' },
        { name: 'Negro', total: 'negras', l1: 'negra_l1', l2: 'negra_l2', l3: 'negra_l3', display: 'Negro' },
    ]

    const sizesList = [
        { name: 'Pequeñas', total: 'pequenas', l1: 'pequenas_l1', l2: 'pequenas_l2', l3: 'pequenas_l3', display: 'Pequeñas' },
        { name: 'Medianas', total: 'medianas', l1: 'medianas_l1', l2: 'medianas_l2', l3: 'medianas_l3', display: 'Medianas' },
        { name: 'Grandes', total: 'grandes', l1: 'grandes_l1', l2: 'grandes_l2', l3: 'grandes_l3', display: 'Grandes' },
    ]

    return (
        <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Column 1: Color Breakdown Table */}
                <div className="flex flex-col">
                    <TableHeader title="Piezas pintadas hoy por colores" icon={Palette} />
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#00a3e0] text-white uppercase text-[10px] font-black tracking-widest">
                                <tr>
                                    <th className="px-4 py-3">Color</th>
                                    <th className="px-4 py-3 text-center">Total</th>
                                    <th className="px-4 py-3 text-center">Linea 1</th>
                                    <th className="px-4 py-3 text-center">Linea 2</th>
                                    <th className="px-4 py-3 text-center">Linea 3</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {colorsList.map((c, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-2 font-bold text-gray-900 border-r border-gray-100">{c.display}</td>
                                        <td className="px-4 py-2 text-center text-gray-700 font-medium">{pinturaColor?.[c.total] || 0}</td>
                                        <td className="px-4 py-2 text-center text-gray-500">{pinturaColor?.[c.l1] || 0}</td>
                                        <td className="px-4 py-2 text-center text-gray-500">{pinturaColor?.[c.l2] || 0}</td>
                                        <td className="px-4 py-2 text-center text-gray-500">{pinturaColor?.[c.l3] || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Size Breakdown Table directly below */}
                    <div className="mt-8">
                        <TableHeader title="Piezas vaciados hoy por tamaño" icon={Maximize} />
                        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#00a3e0] text-white uppercase text-[10px] font-black tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3">Tamaño</th>
                                        <th className="px-4 py-3 text-center">Total</th>
                                        <th className="px-4 py-3 text-center">Linea 1</th>
                                        <th className="px-4 py-3 text-center">Linea 2</th>
                                        <th className="px-4 py-3 text-center">Linea 3</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {sizesList.map((s, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2 font-bold text-gray-900 border-r border-gray-100">{s.display}</td>
                                            <td className="px-4 py-2 text-center text-gray-700 font-medium">{vaciadoTamano?.[s.total] || 0}</td>
                                            <td className="px-4 py-2 text-center text-gray-500">{vaciadoTamano?.[s.l1] || 0}</td>
                                            <td className="px-4 py-2 text-center text-gray-500">{vaciadoTamano?.[s.l2] || 0}</td>
                                            <td className="px-4 py-2 text-center text-gray-500">{vaciadoTamano?.[s.l3] || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Column 2: Programmed Charts/Tables */}
                <div className="flex flex-col gap-8">
                    {/* Programmed Size PIE */}
                    <div>
                        <TableHeader title="Piezas programadas por tamaño" icon={Target} />
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={progTamano.map(t => ({ name: t.tamano, value: t.total_programado_por_tamano }))}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={0}
                                        outerRadius={80}
                                        paddingAngle={0}
                                        dataKey="value"
                                        label={({ value }) => `${value}`}
                                    >
                                        {progTamano.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }} />
                                    <Legend align="left" verticalAlign="top" layout="vertical" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Programmed Color Table */}
                    <div>
                        <TableHeader title="Piezas programadas por color" icon={Palette} />
                        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#00a3e0] text-white uppercase text-[10px] font-black tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3">Color</th>
                                        <th className="px-4 py-3 text-center">Programado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                                    {progColor.slice(0, 10).map((c, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2 font-bold text-gray-900 border-r border-gray-100 uppercase text-[11px]">{c.color}</td>
                                            <td className="px-4 py-2 text-center text-gray-700 font-medium">{c.total_programado_por_color}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

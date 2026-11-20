'use client'

import React from 'react'
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList, ReferenceLine, LineChart, Line, ComposedChart, Legend
} from 'recharts'
import { COLOR_FAMILIA, FAMILIAS, NOMBRE_FAMILIA, type Familia } from '@/lib/productividad/calculo'

// Gráficas de Productividad (estilo FIRPLAK: valor encima, meta verde punteada, semáforo, ejes 11 px)

export const COLOR_META = '#3b8f50'
export const NAVY = '#324354'
export const SAGE = '#7B8E90'
export const semaforo = (v: number | null | undefined, meta: number) =>
    v == null ? '#cbd5e1' : v >= meta ? '#59a96a' : v >= meta - 0.1 ? '#deb841' : '#d14747'
export const pct = (v: number | null | undefined, dec = 1) => (v == null ? '—' : `${(v * 100).toLocaleString('es-CO', { maximumFractionDigits: dec, minimumFractionDigits: dec })} %`)
export const numero = (v: number | null | undefined, dec = 0) => (v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: dec, minimumFractionDigits: dec }))

const EJE = { fontSize: 11, fill: SAGE }
const tooltipCaja = 'bg-white border border-slate-200 rounded-xl shadow-md p-2.5 text-[11px] min-w-[150px]'

export function Recuadro({ titulo, children, alto = 300, derecha }: { titulo: string; children: React.ReactNode; alto?: number; derecha?: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-200 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-xs sm:text-sm font-black text-[#324354]">{titulo}</h3>
                {derecha}
            </div>
            <div style={{ height: alto }}>{children}</div>
        </div>
    )
}

export function SinDatos({ texto = 'Sin datos para los filtros elegidos' }: { texto?: string }) {
    return <div className="h-full flex items-center justify-center text-xs font-bold italic text-slate-400">{texto}</div>
}

/** Barras de porcentaje (por mes, planta…) coloreadas con el semáforo y línea de meta. */
export function BarrasPct({ datos, meta, onClick, seleccion }: { datos: { key: string; label: string; valor: number | null; titulo?: string }[]; meta: number; onClick?: (k: string) => void; seleccion?: string | null }) {
    if (!datos.length) return <SinDatos />
    const max = Math.max(1, ...datos.map(d => d.valor ?? 0)) * 1.12
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={EJE} interval={0} angle={datos.length > 8 ? -25 : 0} textAnchor={datos.length > 8 ? 'end' : 'middle'} height={datos.length > 8 ? 46 : 24} />
                <YAxis tick={EJE} domain={[0, max]} tickFormatter={v => `${Math.round(v * 100)}%`} width={40} />
                <Tooltip cursor={{ fill: '#F6F3EE' }} content={({ active, payload }) => active && payload?.length ? (
                    <div className={tooltipCaja}><p className="font-black text-slate-800 capitalize">{(payload[0].payload as { titulo?: string; label: string }).titulo || (payload[0].payload as { label: string }).label}</p><p className="font-black" style={{ color: semaforo(payload[0].value as number, meta) }}>{pct(payload[0].value as number)}</p><p className="text-slate-500">Meta {pct(meta, 0)}</p></div>
                ) : null} />
                <ReferenceLine y={meta} stroke={COLOR_META} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Meta ${Math.round(meta * 100)}%`, position: 'insideTopLeft', fill: COLOR_META, fontSize: 10, fontWeight: 700 }} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} onClick={(d: unknown) => { const k = (d as { key?: string })?.key; if (k) onClick?.(k) }} cursor={onClick ? 'pointer' : undefined}>
                    {datos.map(d => <Cell key={d.key} fill={semaforo(d.valor, meta)} fillOpacity={seleccion && seleccion !== d.key ? 0.3 : 1} />)}
                    <LabelList dataKey="valor" position="top" formatter={(v: unknown) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}` : '')} style={{ fontSize: 10, fontWeight: 700, fill: '#1f2a35' }} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}

/** Línea de porcentaje (seguimiento diario o semanal) con meta. */
export function LineaPct({ datos, meta }: { datos: { key: string; label: string; valor: number | null }[]; meta: number }) {
    if (!datos.length) return <SinDatos />
    const muchos = datos.length > 20
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datos} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={EJE} interval={muchos ? 'preserveStartEnd' : 0} minTickGap={8} />
                <YAxis tick={EJE} domain={[0, (max: number) => Math.max(1.1, max * 1.08)]} tickFormatter={v => `${Math.round(v * 100)}%`} width={40} />
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                    <div className={tooltipCaja}><p className="font-black text-slate-800">{(payload[0].payload as { titulo?: string; label: string }).titulo || (payload[0].payload as { label: string }).label}</p><p className="font-black" style={{ color: semaforo(payload[0].value as number, meta) }}>{pct(payload[0].value as number)}</p></div>
                ) : null} />
                <ReferenceLine y={meta} stroke={COLOR_META} strokeDasharray="4 4" strokeWidth={1.5} />
                <Line type="monotone" dataKey="valor" stroke={NAVY} strokeWidth={2.5} connectNulls dot={({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { valor: number | null; key: string } }) => (cx == null || cy == null || payload?.valor == null ? <g key={payload?.key} /> : <circle key={payload.key} cx={cx} cy={cy} r={3.5} fill={semaforo(payload.valor, meta)} stroke="#fff" strokeWidth={1} />)}>
                    {!muchos && <LabelList dataKey="valor" position="top" formatter={(v: unknown) => (typeof v === 'number' ? `${Math.round(v * 100)}` : '')} style={{ fontSize: 10, fontWeight: 700, fill: '#1f2a35' }} />}
                </Line>
            </LineChart>
        </ResponsiveContainer>
    )
}

/** Pérdidas por familia apiladas con la línea del total (como "Pérdidas por familia Mes"). */
export function PerdidasApiladas({ datos, objetivo }: { datos: ({ key: string; label: string; total: number | null } & Partial<Record<Familia, number>>)[]; objetivo: number }) {
    if (!datos.length) return <SinDatos />
    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={datos} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={EJE} interval={0} angle={datos.length > 8 ? -25 : 0} textAnchor={datos.length > 8 ? 'end' : 'middle'} height={datos.length > 8 ? 46 : 24} />
                <YAxis tick={EJE} tickFormatter={v => `${Math.round(v * 100)}%`} width={40} />
                <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload as Record<string, number | string>
                    return <div className={tooltipCaja}><p className="font-black text-slate-800 capitalize mb-1">{String(d.titulo || d.label)}</p>
                        {FAMILIAS.map(f => <p key={f} className="flex justify-between gap-3"><span style={{ color: COLOR_FAMILIA[f] === '#f2e394' ? '#9a8a20' : COLOR_FAMILIA[f] }} className="font-bold">{NOMBRE_FAMILIA[f]}</span><span className="font-black">{pct(d[f] as number)}</span></p>)}
                        <p className="flex justify-between gap-3 border-t mt-1 pt-1"><span className="font-bold">Total</span><span className="font-black">{pct(d.total as number)}</span></p></div>
                }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                <ReferenceLine y={objetivo} stroke={COLOR_META} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Objetivo ${Math.round(objetivo * 100)}%`, position: 'insideTopLeft', fill: COLOR_META, fontSize: 10, fontWeight: 700 }} />
                {(['AVERIA', 'EXPLOTACION', 'INDUCIDO', 'FUNCIONAL'] as Familia[]).map(f => (
                    <Bar key={f} dataKey={f} name={NOMBRE_FAMILIA[f]} stackId="p" fill={COLOR_FAMILIA[f]}>
                        <LabelList dataKey={f} position="center" formatter={(v: unknown) => (typeof v === 'number' && v >= 0.02 ? `${Math.round(v * 100)}%` : '')} style={{ fontSize: 9, fontWeight: 700, fill: '#1f2a35' }} />
                    </Bar>
                ))}
                <Line type="monotone" dataKey="total" name="Total pérdidas" stroke="#1f2a35" strokeWidth={2} dot={{ r: 3, fill: '#1f2a35' }}>
                    <LabelList dataKey="total" position="top" formatter={(v: unknown) => (typeof v === 'number' ? `${Math.round(v * 100)}%` : '')} style={{ fontSize: 10, fontWeight: 700, fill: '#1f2a35' }} />
                </Line>
            </ComposedChart>
        </ResponsiveContainer>
    )
}

/** Barras de un valor real con línea del objetivo (piezas, kilos, PHH promedio por mes). */
export function RealVsObjetivo({ datos, nombreReal, nombreObj, dec = 0, sufijo = '' }: { datos: { key: string; label: string; real: number | null; objetivo: number | null }[]; nombreReal: string; nombreObj: string; dec?: number; sufijo?: string }) {
    if (!datos.length) return <SinDatos />
    const f = (v: unknown) => (typeof v === 'number' ? `${numero(v, dec)}${sufijo}` : '')
    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={datos} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={EJE} interval={0} angle={datos.length > 8 ? -25 : 0} textAnchor={datos.length > 8 ? 'end' : 'middle'} height={datos.length > 8 ? 46 : 24} />
                <YAxis tick={EJE} width={46} tickFormatter={v => numero(v, dec > 1 ? 1 : 0)} />
                <Tooltip formatter={(v: unknown, n: unknown) => [f(v), String(n)]} contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                <Bar dataKey="real" name={nombreReal} fill={NAVY} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="real" position="top" formatter={f} style={{ fontSize: 10, fontWeight: 700, fill: '#1f2a35' }} />
                </Bar>
                <Line type="monotone" dataKey="objetivo" name={nombreObj} stroke={COLOR_META} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: COLOR_META }} />
            </ComposedChart>
        </ResponsiveContainer>
    )
}

/** Barras horizontales (modo de pérdida, equipos, causas): horas o minutos. */
export function BarrasH({ datos, unidad, color = NAVY, onClick, seleccion }: { datos: { key: string; valor: number }[]; unidad: string; color?: string; onClick?: (k: string) => void; seleccion?: string | null }) {
    if (!datos.length) return <SinDatos />
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={EJE} hide />
                <YAxis type="category" dataKey="key" tick={{ ...EJE, fill: '#334155' }} width={170} interval={0} tickFormatter={(v: string) => (v.length > 26 ? `${v.slice(0, 25)}…` : v)} />
                <Tooltip cursor={{ fill: '#F6F3EE' }} formatter={(v: unknown) => [`${numero(v as number, 1)} ${unidad}`, '']} contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]} onClick={(d: unknown) => { const k = (d as { key?: string })?.key; if (k) onClick?.(k) }} cursor={onClick ? 'pointer' : undefined}>
                    {datos.map(d => <Cell key={d.key} fill={color} fillOpacity={seleccion && seleccion !== d.key ? 0.3 : 1} />)}
                    <LabelList dataKey="valor" position="right" formatter={(v: unknown) => (typeof v === 'number' ? numero(v, 1) : '')} style={{ fontSize: 10, fontWeight: 700, fill: '#1f2a35' }} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}

/** Columnas simples (horas por planta o por área). */
export function Columnas({ datos, unidad, color = NAVY, onClick, seleccion }: { datos: { key: string; valor: number }[]; unidad: string; color?: string; onClick?: (k: string) => void; seleccion?: string | null }) {
    if (!datos.length) return <SinDatos />
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="key" tick={EJE} interval={0} angle={datos.length > 6 ? -25 : 0} textAnchor={datos.length > 6 ? 'end' : 'middle'} height={datos.length > 6 ? 56 : 24} />
                <YAxis tick={EJE} width={46} />
                <Tooltip cursor={{ fill: '#F6F3EE' }} formatter={(v: unknown) => [`${numero(v as number, 1)} ${unidad}`, '']} contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} onClick={(d: unknown) => { const k = (d as { key?: string })?.key; if (k) onClick?.(k) }} cursor={onClick ? 'pointer' : undefined}>
                    {datos.map(d => <Cell key={d.key} fill={color} fillOpacity={seleccion && seleccion !== d.key ? 0.3 : 1} />)}
                    <LabelList dataKey="valor" position="top" formatter={(v: unknown) => (typeof v === 'number' ? numero(v, 1) : '')} style={{ fontSize: 10, fontWeight: 700, fill: '#1f2a35' }} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}

export function Tarjeta({ titulo, valor, detalle, color, destacada }: { titulo: string; valor: string; detalle?: string; color?: string; destacada?: boolean }) {
    return (
        <div className={`px-2.5 py-1.5 rounded-xl border shadow-2xs min-w-0 ${destacada ? 'bg-[#324354] border-[#324354]' : 'bg-white border-slate-200'}`}>
            <div className={`text-[10px] font-black uppercase truncate ${destacada ? 'text-white/70' : 'text-slate-500'}`} title={titulo}>{titulo}</div>
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-lg sm:text-2xl font-black leading-tight" style={{ color: destacada ? '#FBFBF8' : color || NAVY }}>{valor}</span>
                {detalle && <span className={`text-[9px] font-bold whitespace-nowrap ${destacada ? 'text-white/70' : 'text-slate-400'}`}>{detalle}</span>}
            </div>
        </div>
    )
}

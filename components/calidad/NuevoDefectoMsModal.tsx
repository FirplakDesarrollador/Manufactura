'use client'

import React, { useEffect, useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { CriterioCalidad } from '@/lib/calidad/criterios'

// Defecto del catálogo del registro diario MS (tabla ms_defectos)
export interface DefectoMsCatalogo {
    id: number
    Defecto?: string
    Al_amarilla?: number
    Al_azul?: number
    Al_roja?: number
    Requiere_Foto?: boolean
    Requiere_Referencia_Molde?: boolean
    [key: string]: any
}

// Lo mínimo que se necesita del catálogo existente
type DefectoNombre = { id: number; Defecto?: string; defecto?: string; nombre?: string; Nombre?: string }

interface NuevoDefectoMsModalProps {
    // Catálogo actual, para proponer el siguiente número y evitar duplicados
    defectos: DefectoNombre[]
    onClose: () => void
    onCreated: (defecto: DefectoMsCatalogo, criterio: CriterioCalidad | null) => void
}

// El número visible va dentro del nombre ("73. Burbuja…"), igual que el resto del catálogo
const numeroVisible = (d: DefectoNombre) => {
    const m = String(d.Defecto || d.defecto || d.nombre || d.Nombre || '').match(/^\s*(\d+)/)
    return m ? Number(m[1]) : null
}
const nombreLimpio = (d: DefectoNombre) =>
    String(d.Defecto || d.defecto || d.nombre || d.Nombre || '').replace(/^\s*\d+\.\s*/, '').trim().toLowerCase()

// Crea un defecto nuevo de MS: queda en el catálogo ms_defectos (registro en línea, reportes, histórico,
// indicadores y Power BI lo toman de ahí) y con su criterio de aceptación y rechazo vinculado.
export default function NuevoDefectoMsModal({ defectos, onClose, onCreated }: NuevoDefectoMsModalProps) {
    const siguiente = defectos.reduce((max, d) => Math.max(max, numeroVisible(d) ?? 0), 0) + 1
    const [numero, setNumero] = useState(String(siguiente))
    const [nombre, setNombre] = useState('')
    const [alAmarilla, setAlAmarilla] = useState('')
    const [alAzul, setAlAzul] = useState('')
    const [alRoja, setAlRoja] = useState('')
    const [requiereFoto, setRequiereFoto] = useState(true)
    const [requiereMolde, setRequiereMolde] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !saving) onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [saving, onClose])

    const handleSave = async () => {
        const n = Number(numero)
        const nom = nombre.trim()
        if (!nom) return setError('Escribe el nombre del defecto.')
        if (!Number.isInteger(n) || n <= 0) return setError('El número debe ser un entero mayor que 0.')
        if (defectos.some(d => numeroVisible(d) === n)) return setError(`Ya existe un defecto con el número ${n}.`)
        if (defectos.some(d => nombreLimpio(d) === nom.toLowerCase())) return setError('Ya existe un defecto con ese nombre.')

        setSaving(true)
        setError(null)
        try {
            const fila = {
                Defecto: `${n}. ${nom}`,
                Al_amarilla: Number(alAmarilla) || 0,
                Al_azul: Number(alAzul) || 0,
                Al_roja: Number(alRoja) || 0,
                Requiere_Foto: requiereFoto,
                Requiere_Referencia_Molde: requiereMolde
            }
            let { data, error: insErr } = await supabase.from('ms_defectos').insert(fila).select().single()
            // Si la tabla no genera el id sola, se usa el siguiente disponible
            if (insErr && (insErr.code === '23502' || /null value in column "id"/i.test(insErr.message))) {
                const maxId = defectos.reduce((max, d) => Math.max(max, Number(d.id) || 0), 0)
                ;({ data, error: insErr } = await supabase.from('ms_defectos').insert({ id: maxId + 1, ...fila }).select().single())
            }
            if (insErr || !data) throw new Error(insErr?.message || 'No se pudo crear el defecto.')
            const defecto = data as DefectoMsCatalogo

            // Criterio vinculado (zonas, responsable, fotos… se completan después en el detalle)
            const { data: crit, error: critErr } = await supabase
                .from('criterios_calidad_plantas')
                .insert({ planta: 'Ms', codigo: String(n), defecto: nom, id_defecto_ms: defecto.id })
                .select()
                .single()
            if (critErr) console.warn('Defecto creado, pero no su criterio:', critErr)

            onCreated(defecto, (crit as CriterioCalidad) || null)
        } catch (err: any) {
            console.warn('Error creando defecto MS:', err)
            setError(err?.message || 'No se pudo crear el defecto.')
            setSaving(false)
        }
    }

    const input = 'w-full h-10 bg-white border border-gray-300 rounded-lg px-3 text-sm font-bold text-[#254153] outline-none focus:border-[#254153]'
    const alarmas: { label: string; value: string; set: (v: string) => void; cls: string }[] = [
        { label: 'Alarma amarilla', value: alAmarilla, set: setAlAmarilla, cls: 'border-yellow-400 bg-yellow-50/60 text-yellow-700' },
        { label: 'Alarma azul', value: alAzul, set: setAlAzul, cls: 'border-blue-500 bg-blue-50/60 text-blue-700' },
        { label: 'Alarma roja', value: alRoja, set: setAlRoja, cls: 'border-red-500 bg-red-50/60 text-red-700' }
    ]
    const interruptor = (activo: boolean, onClick: () => void, label: string) => (
        <button type="button" onClick={onClick} className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between gap-2 text-left">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</span>
            <span className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 ${activo ? 'bg-[#324354]' : 'bg-slate-300'}`}>
                <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-4' : ''}`} />
            </span>
        </button>
    )

    return (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" onClick={() => !saving && onClose()}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[94vh] overflow-y-auto border-2 border-amber-300" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
                    <div>
                        <span className="inline-block px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-black text-[#324354] uppercase tracking-wider">Mármol Sintético · Nuevo defecto</span>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1.5">Queda disponible en el registro en línea, los reportes, el histórico y las gráficas.</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={saving} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                    <div className="grid grid-cols-[5.5rem_1fr] gap-2.5">
                        <label className="space-y-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Número</span>
                            <input type="text" inputMode="numeric" value={numero} onChange={e => setNumero(e.target.value.replace(/\D/g, ''))} className={input} />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nombre del defecto</span>
                            <input type="text" autoFocus value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Burbuja en el gelcoat" className={input} />
                        </label>
                    </div>

                    <div className="space-y-2">
                        <span className="text-xs font-black text-[#324354] uppercase tracking-wider block">Alarmas en el registro diario</span>
                        <p className="text-[10px] font-semibold text-slate-400">La tarjeta cambia de color al llegar a esta cantidad en el día (0 = sin alarma)</p>
                        <div className="grid grid-cols-3 gap-2">
                            {alarmas.map(a => (
                                <label key={a.label} className={`p-2.5 border-l-4 rounded-xl space-y-1 ${a.cls}`}>
                                    <span className="text-[10px] font-black uppercase block">{a.label}</span>
                                    <input type="text" inputMode="numeric" value={a.value} onChange={e => a.set(e.target.value.replace(/\D/g, ''))} placeholder="0" className={`${input} h-9`} />
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {interruptor(requiereFoto, () => setRequiereFoto(v => !v), 'Requiere foto')}
                        {interruptor(requiereMolde, () => setRequiereMolde(v => !v), 'Referencia de molde')}
                    </div>

                    {error && <div className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
                </div>

                <div className="flex justify-end gap-2 p-4 sm:p-5 border-t border-slate-100">
                    <button type="button" onClick={onClose} disabled={saving} className="h-9 px-4 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5 disabled:opacity-60">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Crear defecto
                    </button>
                </div>
            </div>
        </div>
    )
}

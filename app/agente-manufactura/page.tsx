'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Bell, CheckCircle2, Clock, Construction, FileText, Link2, Loader2, Send, ShieldCheck, X, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/opt-sistemica/Header'

// Agente Manufactura: por ahora es el módulo de CONEXIÓN con el bot Grok "Agente_App_Manufactura".
// · Estado: "Conectado" si el bot llamó a /api/agente hace menos de 5 minutos (tabla agente_estado).
// · Chat con validación: la pregunta queda pendiente, el bot propone la respuesta y el usuario solo la ve cuando un
//   administrador (permiso Configuración) la aprueba o la corrige. Tablas en agente_manufactura.sql.
// · Las demás capacidades del agente siguen en construcción.

type Mensaje = {
    id: number; creado_at: string; usuario_email: string | null; pregunta: string
    estado: 'pendiente' | 'en_validacion' | 'aprobada' | 'rechazada'
    respuesta_agente: string | null; respuesta_final: string | null; validado_por: string | null; validado_at: string | null; nota_validacion: string | null
}
type Estado = { ultimo_contacto: string | null; detalle: string | null } | null

const CONECTADO_MIN = 5
const hora = (s: string | null) => s ? new Date(s).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'
const nombre = (e: string | null) => (e || '').split('@')[0].split('.')[0].replace(/^./, c => c.toUpperCase()) || 'Usuario'
const LOGO = '/icon-512.png'   // logo "M" de la app, el mismo del bot Agente_App_Manufactura

export default function AgenteManufacturaPage() {
    const router = useRouter()
    const [userEmail, setUserEmail] = useState('')
    const [valida, setValida] = useState(false)       // puede aprobar respuestas (permiso Configuración)
    const [cargando, setCargando] = useState(true)
    const [estado, setEstado] = useState<Estado>(null)
    const [mensajes, setMensajes] = useState<Mensaje[]>([])
    const [error, setError] = useState<string | null>(null)
    const [texto, setTexto] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [ahora, setAhora] = useState(Date.now())
    const fin = useRef<HTMLDivElement>(null)

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }
            setUserEmail(user.email || '')
            const { data } = await supabase.from('usuarios').select('permisos').eq('uuid', user.id).maybeSingle()
            setValida(!!(data?.permisos as any)?.configuracion)
            setCargando(false)
        })()
    }, [router])

    const cargar = useCallback(async () => {
        const [e, m] = await Promise.all([
            supabase.from('agente_estado').select('ultimo_contacto, detalle').eq('agente', 'grok').maybeSingle(),
            supabase.from('agente_mensajes').select('*').order('creado_at', { ascending: true }).limit(300),
        ])
        if (e.error || m.error) {
            const msg = (e.error || m.error)!.message
            setError(/agente_(estado|mensajes)|relation|schema cache/i.test(msg) ? 'Falta crear las tablas del agente: ejecute agente_manufactura.sql en Supabase.' : msg)
            return
        }
        setError(null); setEstado(e.data as Estado); setMensajes((m.data || []) as Mensaje[]); setAhora(Date.now())
    }, [])
    useEffect(() => { if (!cargando) { cargar(); const t = setInterval(cargar, 15000); return () => clearInterval(t) } }, [cargando, cargar])

    const conectado = !!estado?.ultimo_contacto && ahora - new Date(estado.ultimo_contacto).getTime() < CONECTADO_MIN * 60000
    const mios = useMemo(() => mensajes.filter(m => m.usuario_email === userEmail), [mensajes, userEmail])
    const porValidar = useMemo(() => mensajes.filter(m => m.estado === 'en_validacion'), [mensajes])
    useEffect(() => { fin.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [mios.length])

    const preguntar = async () => {
        const p = texto.trim(); if (!p) return
        setEnviando(true)
        const { error: e } = await supabase.from('agente_mensajes').insert({ pregunta: p.slice(0, 2000), usuario_email: userEmail, estado: 'pendiente' })
        setEnviando(false)
        if (e) return alert(`No se pudo enviar: ${e.message}`)
        setTexto(''); cargar()
    }

    if (cargando) {
        return <div className="min-h-screen bg-[#324354] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F6F3EE]" /></div>
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
            <Header title="Agente Manufactura" subtitle="" compact={true} userEmail={userEmail} showLogout={true}
                onLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} />

            <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5">
                {/* Conexión con el bot */}
                <section className="bg-gradient-to-r from-[#324354] via-[#283643] to-[#1e293b] rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute right-[-20px] top-[-20px] w-64 h-64 bg-[#7B8E90]/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
                        <div className="relative shrink-0">
                            <img src={LOGO} alt="Agente_App_Manufactura" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/15 shadow-lg" />
                            <span className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-[3px] border-[#283643] ${conectado ? 'bg-[#59a96a]' : 'bg-slate-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold tracking-wide"><Link2 size={13} /> MÓDULO DE CONEXIÓN</div>
                            <h1 className="text-2xl sm:text-4xl font-display font-light tracking-wide">Agente_App_Manufactura</h1>
                            <p className="text-sm text-[#F6F3EE]/75">Bot Grok conectado a la app Manufactura FIRPLAK. Responde preguntas de los usuarios; cada respuesta la valida un administrador antes de mostrarse.</p>
                        </div>
                        <div className={`shrink-0 rounded-2xl px-4 py-3 border ${conectado ? 'bg-[#59a96a]/20 border-[#59a96a]/50' : 'bg-white/5 border-white/15'}`}>
                            <div className={`flex items-center gap-2 text-sm font-black ${conectado ? 'text-[#9fd8ab]' : 'text-slate-300'}`}>
                                <span className={`w-2.5 h-2.5 rounded-full ${conectado ? 'bg-[#59a96a] animate-pulse' : 'bg-slate-400'}`} />
                                {conectado ? 'Conectado' : 'Desconectado'}
                            </div>
                            <div className="text-[11px] text-white/60 mt-0.5">Último contacto: {hora(estado?.ultimo_contacto ?? null)}</div>
                            {estado?.detalle && <div className="text-[10px] text-white/45 mt-0.5 max-w-[220px] truncate" title={estado.detalle}>{estado.detalle}</div>}
                        </div>
                    </div>
                </section>

                {error && <div className="px-4 py-2 rounded-xl bg-[#d14747]/10 border border-[#d14747]/40 text-[#d14747] text-xs font-bold">{error}</div>}

                <div className={`grid grid-cols-1 ${valida ? 'lg:grid-cols-2' : ''} gap-5`}>
                    {/* Chat del usuario */}
                    <section className="bg-white rounded-3xl border border-[#e2ded5] shadow-sm flex flex-col h-[560px] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#e2ded5] bg-[#324354]/5 flex items-center gap-3">
                            <img src={LOGO} alt="" className="w-9 h-9 rounded-full" />
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-[#324354]">Pregúntale al agente</div>
                                <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1"><ShieldCheck size={11} /> Respuestas con validación: verás la respuesta cuando sea aprobada</div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F6F3EE]/40">
                            {mios.length === 0 && <div className="text-center text-xs text-slate-400 font-semibold py-10">Aún no has hecho preguntas. Escribe abajo, por ejemplo: "¿Cuántas piezas lleva FV hoy?"</div>}
                            {mios.map(m => (
                                <div key={m.id} className="space-y-1.5">
                                    <div className="ml-auto max-w-[85%] bg-[#324354] text-white rounded-2xl rounded-tr-none px-3 py-2 text-sm w-fit">
                                        {m.pregunta}
                                        <div className="text-[9px] text-white/60 text-right mt-1">{hora(m.creado_at)}</div>
                                    </div>
                                    <div className="flex items-start gap-2 max-w-[90%]">
                                        <img src={LOGO} alt="" className="w-7 h-7 rounded-full shrink-0" />
                                        {m.estado === 'aprobada' ? (
                                            <div className="bg-white border border-[#e2ded5] rounded-2xl rounded-tl-none px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap">
                                                {m.respuesta_final || m.respuesta_agente}
                                                <div className="text-[9px] text-[#2f7a40] font-bold mt-1 flex items-center gap-1"><CheckCircle2 size={10} /> Validada por {nombre(m.validado_por)} · {hora(m.validado_at)}</div>
                                            </div>
                                        ) : m.estado === 'rechazada' ? (
                                            <div className="bg-[#d14747]/5 border border-[#d14747]/30 rounded-2xl rounded-tl-none px-3 py-2 text-xs text-[#d14747] font-semibold">
                                                <XCircle size={12} className="inline mr-1" />La respuesta no fue aprobada.{m.nota_validacion ? ` ${m.nota_validacion}` : ''}
                                            </div>
                                        ) : (
                                            <div className="bg-white border border-dashed border-[#e2ded5] rounded-2xl rounded-tl-none px-3 py-2 text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                                                {m.estado === 'pendiente'
                                                    ? <><Clock size={12} /> {conectado ? 'El agente está preparando la respuesta…' : 'En espera: el agente está desconectado'}</>
                                                    : <><ShieldCheck size={12} /> Respuesta lista, en validación</>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={fin} />
                        </div>
                        <div className="p-3 border-t border-[#e2ded5] flex items-center gap-2">
                            <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') preguntar() }} maxLength={2000}
                                placeholder="Escríbele a Agente_App_Manufactura…" className="flex-1 h-11 px-3 bg-[#F6F3EE]/40 border border-[#e2ded5] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#7B8E90]" />
                            <button onClick={preguntar} disabled={enviando || !texto.trim()} className="w-11 h-11 rounded-xl bg-[#324354] text-white flex items-center justify-center hover:bg-[#254153] disabled:opacity-40" title="Enviar">
                                {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            </button>
                        </div>
                    </section>

                    {/* Validación (solo administradores) */}
                    {valida && (
                        <section className="bg-white rounded-3xl border border-[#e2ded5] shadow-sm flex flex-col h-[560px] overflow-hidden">
                            <div className="px-4 py-3 border-b border-[#e2ded5] bg-amber-50 flex items-center justify-between gap-2">
                                <div>
                                    <div className="text-sm font-bold text-[#324354] flex items-center gap-1.5"><ShieldCheck size={15} /> Validación de respuestas</div>
                                    <div className="text-[10px] text-slate-500 font-semibold">Apruebe, corrija o rechace antes de que el usuario la vea</div>
                                </div>
                                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">{porValidar.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {porValidar.length === 0 && <div className="text-center text-xs text-slate-400 font-semibold py-10">No hay respuestas por validar</div>}
                                {porValidar.map(m => <TarjetaValidacion key={m.id} m={m} quien={userEmail} onHecho={cargar} />)}
                            </div>
                        </section>
                    )}
                </div>

                {/* Lo demás del agente sigue en construcción */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-[#324354]">Capacidades del agente</h2>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1"><Construction size={11} /> En construcción</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { Icono: BarChart3, t: 'Análisis en tiempo real', d: 'Monitoreo continuo de la planta con los datos de la app.' },
                            { Icono: FileText, t: 'Informes automáticos', d: 'Resumen de turno y de día por planta.' },
                            { Icono: Bell, t: 'Alertas proactivas', d: 'Avisos antes de desviaciones o bajas estadísticas.' },
                            { Icono: Link2, t: 'Integración sistémica', d: 'Conexión con SAP, Calidad y Mantenimiento.' },
                        ].map(({ Icono, t, d }) => (
                            <div key={t} className="bg-white/70 rounded-2xl border border-[#e2ded5] p-4 opacity-80">
                                <Icono size={18} className="text-[#7B8E90]" />
                                <div className="text-sm font-bold text-[#324354] mt-2">{t}</div>
                                <div className="text-xs text-slate-500 mt-1">{d}</div>
                                <div className="text-[10px] font-bold text-amber-700 mt-2">Módulo en construcción</div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    )
}

function TarjetaValidacion({ m, quien, onHecho }: { m: Mensaje; quien: string; onHecho: () => void }) {
    const [respuesta, setRespuesta] = useState(m.respuesta_agente || '')
    const [guardando, setGuardando] = useState(false)
    const decidir = async (aprobar: boolean) => {
        let nota: string | null = null
        if (!aprobar) { nota = prompt('Motivo del rechazo (lo verá el usuario, opcional):') ; if (nota === null) return }
        setGuardando(true)
        const { error } = await supabase.from('agente_mensajes').update({
            estado: aprobar ? 'aprobada' : 'rechazada', respuesta_final: aprobar ? respuesta.trim() : null,
            validado_por: quien, validado_at: new Date().toISOString(), nota_validacion: nota || null,
        }).eq('id', m.id).eq('estado', 'en_validacion')
        setGuardando(false)
        if (error) return alert(`No se pudo guardar: ${error.message}`)
        onHecho()
    }
    return (
        <div className="rounded-2xl border border-[#e2ded5] p-3 space-y-2">
            <div className="text-[10px] text-slate-500 font-semibold">{nombre(m.usuario_email)} · {hora(m.creado_at)}</div>
            <div className="text-sm font-bold text-[#324354]">{m.pregunta}</div>
            <textarea value={respuesta} onChange={e => setRespuesta(e.target.value)} rows={4}
                className="w-full text-sm p-2 rounded-xl border border-amber-300 bg-white outline-none focus:ring-2 focus:ring-amber-200" title="Puede corregir la respuesta antes de aprobarla" />
            <div className="flex justify-end gap-2">
                <button onClick={() => decidir(false)} disabled={guardando} className="h-8 px-3 rounded-lg bg-white border border-[#d14747]/40 text-[#d14747] text-xs font-bold flex items-center gap-1 hover:bg-[#d14747]/5"><X size={13} /> Rechazar</button>
                <button onClick={() => decidir(true)} disabled={guardando || !respuesta.trim()} className="h-8 px-3 rounded-lg bg-[#59a96a] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#4a9459] disabled:opacity-40">
                    {guardando ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Aprobar
                </button>
            </div>
        </div>
    )
}

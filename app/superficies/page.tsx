'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Wrench, Keyboard, Warehouse, LineChart, SlidersHorizontal, UserCog, ArrowLeftRight, MapPin, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/opt-sistemica/Header'
import ModuloProcesoRtm from '@/components/superficies/ModuloProcesoRtm'
import AdministracionRtm from '@/components/superficies/AdministracionRtm'
import DashboardRtm from '@/components/superficies/DashboardRtm'
import ParametrosRtm from '@/components/superficies/ParametrosRtm'
import MapaProcesosRtm from '@/components/superficies/MapaProcesosRtm'
import TrasladosFibraModule from '@/components/fibra/traslados/TrasladosFibraModule'

// Control de Piso Superficies (RTM / Inyección). Base: el control de piso de Fibra, sin moldes y con menos procesos.
// Órdenes de SAP de las familias RTM y RTMM (ordenes_fabricacion_rtm). Registro por cantidad:
//   Pulido:     Programado → Digitado (pendiente de digitar) o Reparación
//   Reparación: → Digitado, Saldo o Destrucción
//   Digitado:   → Tránsito          CEDI: Tránsito → CEDI
// Permiso propio usuarios.permisos.superficies.{modulo}; los administradores y quien tiene Configuración General entran a todo.
type Modulo = 'pulido' | 'reparacion' | 'digitado' | 'cedi' | 'dashboard' | 'parametros' | 'administracion' | 'traslados' | 'mapa'
const MODULOS: { id: Modulo; label: string; icon: React.ElementType; libre?: boolean }[] = [
    { id: 'pulido', label: 'Pulido', icon: Sparkles },
    { id: 'reparacion', label: 'Reparación', icon: Wrench },
    { id: 'digitado', label: 'Digitado', icon: Keyboard },
    { id: 'cedi', label: 'CEDI', icon: Warehouse },
    { id: 'dashboard', label: 'Dashboard', icon: LineChart },
    { id: 'parametros', label: 'Parámetros', icon: SlidersHorizontal },
    { id: 'administracion', label: 'Administración', icon: UserCog },
    // Traslados y Mapa de procesos son de consulta: los ve cualquier usuario de la planta
    { id: 'traslados', label: 'Traslados', icon: ArrowLeftRight, libre: true },
    { id: 'mapa', label: 'Mapa de procesos', icon: MapPin, libre: true }
]

export default function SuperficiesPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [permisos, setPermisos] = useState<Record<string, boolean> | null>(null)
    const [admin, setAdmin] = useState(false)
    const [activo, setActivo] = useState<Modulo | null>(null)
    const [menuAbierto, setMenuAbierto] = useState(true)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        if (window.innerWidth < 768) setMenuAbierto(false)
        ;(async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }
            setEmail(user.email || '')
            const { data } = await supabase.from('usuarios').select('rol, permisos').eq('uuid', user.id).maybeSingle()
            // Acceso completo: administradores y quien administra usuarios (permiso Configuración General)
            const esAdmin = String(data?.rol || '').toLowerCase().includes('admin') || (data?.permisos as any)?.configuracion === true
            const p = ((data?.permisos as any)?.superficies || {}) as Record<string, boolean>
            setAdmin(esAdmin)
            setPermisos(p)
            const puede = (m: Modulo) => esAdmin || MODULOS.find(x => x.id === m)?.libre || p[m] === true
            setActivo(MODULOS.find(m => !m.libre && puede(m.id))?.id || 'mapa')
            setCargando(false)
        })()
    }, [router])

    const puede = (m: Modulo) => admin || !!MODULOS.find(x => x.id === m)?.libre || permisos?.[m] === true

    if (cargando) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#254153]" />
            </div>
        )
    }

    const contenido = () => {
        if (!activo || !puede(activo)) return <div className="p-10 text-center text-slate-500 font-bold">No tienes permiso para este módulo.</div>
        switch (activo) {
            case 'pulido': return <ModuloProcesoRtm key="pulido" titulo="Unidades sin pulir" desde="Programado" origen="pulido" usuarioEmail={email}
                acciones={[
                    { hacia: 'Pulido', label: 'Registrar Pulido → Digitado', clase: 'bg-[#324354] hover:bg-[#254153] text-white' },
                    { hacia: 'Reparacion', label: '→ Reparación', clase: 'bg-white border border-orange-300 text-orange-700 hover:bg-orange-50' }
                ]} />
            case 'reparacion': return <ModuloProcesoRtm key="reparacion" titulo="Unidades en reparación" desde="Reparacion" origen="reparacion" usuarioEmail={email}
                acciones={[
                    { hacia: 'Pulido', label: 'Reparada → Digitado', clase: 'bg-[#324354] hover:bg-[#254153] text-white' },
                    { hacia: 'Saldo', label: 'Saldo', clase: 'bg-white border border-sky-300 text-sky-700 hover:bg-sky-50', confirmar: '¿Pasar a Saldo?' },
                    { hacia: 'Destruccion', label: 'Destrucción', clase: 'bg-white border border-red-300 text-red-700 hover:bg-red-50', confirmar: '¿Está seguro de destruir?' }
                ]} />
            case 'digitado': return <ModuloProcesoRtm key="digitado" titulo="Unidades por digitar" desde="Pulido" origen="digitado" usuarioEmail={email} conEntrega
                acciones={[{ hacia: 'Transito', label: 'Registrar Digitado', clase: 'bg-[#324354] hover:bg-[#254153] text-white' }]} />
            case 'cedi': return <ModuloProcesoRtm key="cedi" titulo="Unidades en tránsito" desde="Transito" origen="cedi" usuarioEmail={email}
                acciones={[{ hacia: 'Cedi', label: 'Registrar CEDI', clase: 'bg-[#59a96a] hover:bg-[#4a9459] text-white' }]} />
            case 'dashboard': return <DashboardRtm />
            case 'parametros': return <ParametrosRtm usuarioEmail={email} />
            case 'administracion': return <AdministracionRtm usuarioEmail={email} />
            case 'traslados': return <TrasladosFibraModule planta="rtm" />
            case 'mapa': return <MapaProcesosRtm />
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header title="Control de Piso Superficies (RTM)" subtitle="" compact={true} userEmail={email} showLogout={true}
                onLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} />
            <div className="flex min-h-[calc(100vh-3rem)] relative">
                {menuAbierto && <div className="fixed inset-0 top-12 bg-black/50 z-40 md:hidden" onClick={() => setMenuAbierto(false)} />}
                <div className="w-12 shrink-0 md:hidden" />
                <aside className={`fixed md:sticky top-12 bottom-0 md:h-[calc(100vh-3rem)] left-0 z-50 md:z-30 shrink-0 transition-all duration-300 bg-white border-r border-[#e2ded5] shadow-sm overflow-hidden ${menuAbierto ? 'w-52' : 'w-12'}`}>
                    <nav className="p-2 space-y-1 overflow-y-auto h-full">
                        <button type="button" onClick={() => setMenuAbierto(!menuAbierto)} title={menuAbierto ? 'Recoger menú de módulos' : 'Abrir menú de módulos'}
                            className={`flex items-center gap-2 h-8 mb-1 rounded-lg w-full text-[10px] font-black uppercase tracking-wider text-[#324354] bg-[#F6F3EE] hover:bg-[#e2ded5] ${menuAbierto ? 'px-3' : 'justify-center'}`}>
                            {menuAbierto ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
                            {menuAbierto && <span className="flex-1 text-left">Módulos RTM</span>}
                        </button>
                        {MODULOS.filter(m => puede(m.id)).map(m => {
                            const Icono = m.icon
                            return (
                                <button key={m.id} type="button" title={m.label}
                                    onClick={() => { setActivo(m.id); if (window.innerWidth < 768) setMenuAbierto(false) }}
                                    className={`flex items-center gap-2 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${menuAbierto ? 'px-3' : 'justify-center'} ${activo === m.id ? 'bg-[#324354] text-white' : 'text-[#324354] hover:bg-[#F6F3EE]'}`}>
                                    <Icono size={18} className="shrink-0" />
                                    {menuAbierto && <span>{m.label}</span>}
                                </button>
                            )
                        })}
                    </nav>
                </aside>
                <main className="flex-1 min-w-0 h-[calc(100vh-3rem)] bg-white overflow-hidden relative">
                    <div className="h-full overflow-y-auto">{contenido()}</div>
                </main>
            </div>
        </div>
    )
}

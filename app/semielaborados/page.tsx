'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/opt-sistemica/Header'
import ModuloProcesoSemi from '@/components/semielaborados/ModuloProcesoSemi'
import AdministracionSemi from '@/components/semielaborados/AdministracionSemi'
import { type ProcesoSemi, type TipoSemi, TIPOS_SEMI, tipoSemi, permisoSemi } from '@/lib/semielaborados/datos'

// Control de Piso Semielaborados (SEM), un tipo a la vez (operarios distintos por tipo):
//  - Cajas (SKU PEMP…): Corte → Digitado → Tránsito → Almacén
//  - Herrajes FV (PMPD04…): Herrajes → Digitado → Tránsito → Almacén
//  - Kits motobomba FV (PEST01… MOTOBOMBA): Ensamble → Digitado → Tránsito → CEDI
// Permisos: semielaborados.<tipo>_<proceso> (Configuración → Usuarios) y semielaborados.administracion (todos los
// tipos). Cajas también acepta los permisos anteriores (semielaborados.corte… o los de Muebles).
type Modulo = 'corte' | 'digitado' | 'transito' | 'almacen' | 'administracion'
const PROCESO: Record<Exclude<Modulo, 'administracion'>, ProcesoSemi> = { corte: 'Corte', digitado: 'Digitado', transito: 'Transito', almacen: 'Almacen' }

const trazo = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 2 }
const MENU: { id: Modulo; label: string; permisos: string[]; icono: React.ReactNode }[] = [
    { id: 'corte', label: 'Corte', permisos: ['corte'], icono: <path {...trazo} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 11-4.243 4.243 3 3 0 014.243-4.243zm0-5.758a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243z" /> },
    { id: 'digitado', label: 'Digitado', permisos: ['digitado'], icono: <path {...trazo} d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM6 9h.01M10 9h.01M14 9h.01M18 9h.01M8 12.5h.01M12 12.5h.01M16 12.5h.01M7 16h10" /> },
    { id: 'transito', label: 'Tránsito', permisos: ['transito'], icono: <><path {...trazo} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path {...trazo} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1" /></> },
    { id: 'almacen', label: 'Almacén', permisos: ['almacen', 'cedi'], icono: <path {...trazo} d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35ZM6 22V12h12v10M6 15h12M6 18.5h12" /> },
    { id: 'administracion', label: 'Administración', permisos: ['administracion'], icono: <><path {...trazo} d="M2 21a8 8 0 0 1 10.43-7.62M10 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" /><circle cx="18" cy="18" r="3" strokeWidth={2} /><path {...trazo} d="M18 13.5v1.5M18 21v1.5M21.9 15.75l-1.3.75M15.4 19.5l-1.3.75M14.1 15.75l1.3.75M20.6 19.5l1.3.75" /></> },
]

export default function SemielaboradosPage() {
    const router = useRouter()
    const [cargando, setCargando] = useState(true)
    const [email, setEmail] = useState('')
    const [perfil, setPerfil] = useState<any>(null)
    const [abierto, setAbierto] = useState(true)
    const [activo, setActivo] = useState<Modulo>('corte')
    const [tipo, setTipo] = useState<TipoSemi>('cajas')

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }
            setEmail(user.email || '')
            const { data } = await supabase.from('usuarios').select('*').eq('uuid', user.id).maybeSingle()
            setPerfil(data)
            setCargando(false)
        })()
        if (typeof window !== 'undefined' && window.innerWidth < 768) setAbierto(false)
    }, [router])

    const esAdminApp = !perfil || perfil.rol === 'desarrollador' || perfil.rol === 'director' || perfil.rol === 'admin'
    const p = perfil?.permisos || {}
    const puedeAdministrar = esAdminApp || p.semielaborados?.administracion === true || p.muebles?.administracion === true
    const puede = (t: TipoSemi, m: (typeof MENU)[number]) => {
        if (esAdminApp) return true
        if (m.id === 'administracion') return puedeAdministrar
        const proc = PROCESO[m.id]
        if (p.semielaborados?.[permisoSemi(t, proc)] === true) return true
        // Cajas: permisos anteriores (semielaborados.corte… o los de Muebles)
        return t === 'cajas' && m.permisos.some(k => p.semielaborados?.[k] === true || p.muebles?.[k] === true)
    }
    const tipos = TIPOS_SEMI.filter(t => MENU.some(m => puede(t.id, m)))
    const menu = MENU.filter(m => puede(tipo, m))
    useEffect(() => { if (!cargando && tipos.length && !tipos.some(t => t.id === tipo)) setTipo(tipos[0].id) }, [cargando, tipos, tipo])
    useEffect(() => { if (!cargando && menu.length && !menu.some(m => m.id === activo)) setActivo(menu[0].id) }, [cargando, menu, activo])

    if (cargando) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#254153]" /></div>
    const usuario = { email, nombre: perfil?.nombre || email }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header title="Control de Piso Semielaborados (SEM)" subtitle="" compact={true} userEmail={email} showLogout={true}
                onLogout={async () => { await supabase.auth.signOut(); router.push('/login') }} />
            <div className="flex min-h-[calc(100vh-3rem)] relative">
                {abierto && <div className="fixed inset-0 top-12 bg-black/50 z-40 md:hidden" onClick={() => setAbierto(false)} />}
                <div className="w-12 shrink-0 md:hidden" />
                <aside className={`fixed md:sticky top-12 bottom-0 md:h-[calc(100vh-3rem)] left-0 z-50 md:z-30 shrink-0 transition-all duration-300 bg-white border-r border-[#e2ded5] shadow-sm overflow-hidden ${abierto ? 'w-52' : 'w-12'}`}>
                    <nav className={`p-2 space-y-1 overflow-y-auto h-full [&_button>svg]:w-4 [&_button>svg]:h-4 [&_button>svg]:shrink-0 ${abierto ? '' : '[&_button>span]:hidden [&_button]:justify-center [&_button]:px-0'}`}>
                        <button onClick={() => setAbierto(!abierto)} title={abierto ? 'Recoger menú de módulos' : 'Abrir menú de módulos'}
                            className="flex items-center space-x-2 px-3 h-8 mb-1 rounded-lg w-full text-[10px] font-black uppercase tracking-wider text-[#324354] bg-[#F6F3EE] hover:bg-[#e2ded5]">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path {...trazo} d={abierto ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'} /></svg>
                            <span className="flex-1 text-left">Módulos SEM</span>
                        </button>
                        {/* Tipo de semielaborado: solo los que el usuario puede ver */}
                        {tipos.length > 1 && abierto && (
                            <div className="mb-2 p-1 rounded-lg bg-[#F6F3EE] border border-[#e2ded5] space-y-0.5">
                                {tipos.map(t => (
                                    <button key={t.id} onClick={() => setTipo(t.id)}
                                        className={`w-full text-left px-2.5 h-7 rounded-md text-[11px] font-bold ${tipo === t.id ? 'bg-[#324354] text-white' : 'text-[#324354] hover:bg-white'}`}>
                                        <span>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {abierto && <p className="px-3 pt-1 text-[10px] font-black uppercase tracking-wider text-[#7B8E90]">{tipoSemi(tipo).label}</p>}
                        {menu.map(m => (
                            <button key={m.id} onClick={() => { setActivo(m.id); if (window.innerWidth < 768) setAbierto(false) }} title={abierto ? undefined : m.label}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activo === m.id ? 'bg-[#254153] text-white' : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'}`}>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">{m.icono}</svg>
                                <span>{m.id === 'administracion' ? m.label : tipoSemi(tipo).procesos[PROCESO[m.id]]}</span>
                            </button>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1 min-w-0 h-[calc(100vh-3rem)] bg-white overflow-hidden">
                    {!menu.length ? (
                        <div className="h-full flex items-center justify-center text-sm text-slate-500 p-6 text-center">No tiene permisos para el Control de Piso Semielaborados.</div>
                    ) : activo === 'administracion' ? (
                        <AdministracionSemi key={tipo} tipo={tipo} usuario={usuario} />
                    ) : (
                        <ModuloProcesoSemi key={`${tipo}-${activo}`} tipo={tipo} proceso={PROCESO[activo]} usuario={usuario} />
                    )}
                </main>
            </div>
        </div>
    )
}

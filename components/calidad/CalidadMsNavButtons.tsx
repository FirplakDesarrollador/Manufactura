'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Search, ClipboardList, History, Settings, Timer, PieChart, BookOpenCheck } from 'lucide-react'
import { BrokenSinkIcon } from '@/components/icons/BrokenSinkIcon'
import { usePermisosCalidadMs } from '@/lib/calidad/usePermisosCalidadMs'
import type { PermisosCalidadMs } from '@/lib/calidad/permisos'

export type CalidadMsTab = 'registro' | 'list' | 'historico' | 'saldos' | 'indicadores' | 'criterios'

interface CalidadMsNavButtonsProps {
    activeTab: CalidadMsTab
    onOpenSettings?: () => void
    onToggleChart?: () => void
    // Se conserva por compatibilidad; el permiso real viene de usuarios.permisos.calidad.configuracion
    hasSettingsPermission?: boolean
    isChartActive?: boolean
    isSettingsActive?: boolean
}

// Vista de cada pestaña y si el usuario puede entrar (Registro también sirve para ver Hora a hora)
const RUTAS: { tab: CalidadMsTab; ruta: string; permitido: (p: PermisosCalidadMs) => boolean }[] = [
    { tab: 'registro', ruta: '/calidad/ms', permitido: p => p.registro || p.hora_a_hora },
    { tab: 'list', ruta: '/calidad/ms/list', permitido: p => p.reportes },
    { tab: 'historico', ruta: '/calidad/ms/historico', permitido: p => p.historico },
    { tab: 'saldos', ruta: '/calidad/ms/saldos', permitido: p => p.saldos },
    { tab: 'indicadores', ruta: '/calidad/ms/indicadores', permitido: p => p.indicadores },
    { tab: 'criterios', ruta: '/calidad/ms/criterios', permitido: p => !!p.criterios }
]

export function CalidadMsNavButtons({
    activeTab,
    onOpenSettings,
    onToggleChart,
    isChartActive = false,
    isSettingsActive = false
}: CalidadMsNavButtonsProps) {
    const router = useRouter()
    const { permisos, cargando } = usePermisosCalidadMs()

    // Pre-cargar las rutas en segundo plano para cambio instantáneo
    React.useEffect(() => {
        RUTAS.forEach(r => router.prefetch(r.ruta))
    }, [router])

    // Sin permiso para la vista actual: se va a la primera permitida (o al inicio)
    React.useEffect(() => {
        if (cargando || !permisos) return
        const actual = RUTAS.find(r => r.tab === activeTab)
        if (actual && !actual.permitido(permisos)) {
            const destino = RUTAS.find(r => r.permitido(permisos))
            router.replace(destino ? destino.ruta : '/home')
        }
    }, [cargando, permisos, activeTab, router])

    if (cargando || !permisos) return <div className="h-7" />

    const ir = (tab: CalidadMsTab, ruta: string) => {
        if (activeTab === tab) return
        router.push(ruta)
    }

    const handleRegistroClick = () => {
        if (activeTab === 'registro') {
            if (isChartActive && onToggleChart) onToggleChart()
            return
        }
        router.push('/calidad/ms')
    }

    const handleSettingsClick = () => {
        if (onOpenSettings) onOpenSettings()
        else router.push('/calidad/ms?settings=true')
    }

    const handleChartClick = () => {
        if (onToggleChart) onToggleChart()
        else router.push('/calidad/ms?chart=true')
    }

    const botones: { key: string; visible: boolean; activo: boolean; onClick: () => void; title: string; icon: React.ReactNode }[] = [
        { key: 'registro', visible: permisos.registro, activo: activeTab === 'registro' && !isChartActive && !isSettingsActive, onClick: handleRegistroClick, title: 'Registro de Defectos en Línea (Matriz)', icon: <Search className="w-4 h-4" /> },
        { key: 'list', visible: permisos.reportes, activo: activeTab === 'list', onClick: () => ir('list', '/calidad/ms/list'), title: 'Ver Reportes del Día', icon: <ClipboardList className="w-4 h-4" /> },
        { key: 'historico', visible: permisos.historico, activo: activeTab === 'historico', onClick: () => ir('historico', '/calidad/ms/historico'), title: 'Histórico General de Defectos', icon: <History className="w-4 h-4" /> },
        { key: 'saldos', visible: permisos.saldos, activo: activeTab === 'saldos', onClick: () => ir('saldos', '/calidad/ms/saldos'), title: 'Saldos y Destrucciones', icon: <BrokenSinkIcon className="w-4 h-4" /> },
        { key: 'hora', visible: permisos.hora_a_hora, activo: isChartActive, onClick: handleChartClick, title: 'Indicador Hora a Hora', icon: <Timer className="w-4 h-4" /> },
        { key: 'indicadores', visible: permisos.indicadores, activo: activeTab === 'indicadores', onClick: () => ir('indicadores', '/calidad/ms/indicadores'), title: 'Indicadores Generales de Calidad MS', icon: <PieChart className="w-4 h-4" /> },
        { key: 'config', visible: !!permisos.configuracion, activo: isSettingsActive, onClick: handleSettingsClick, title: permisos.configuracion === 'editar' ? 'Configuración de Defectos' : 'Configuración de Defectos (solo consulta)', icon: <Settings className="w-4 h-4" /> },
        { key: 'criterios', visible: !!permisos.criterios, activo: activeTab === 'criterios', onClick: () => ir('criterios', '/calidad/ms/criterios'), title: 'Criterios de Aceptación y Rechazo', icon: <BookOpenCheck className="w-4 h-4" /> }
    ]

    // Botones unidos; las esquinas redondeadas van en el primero y el último visibles
    const baseClass = "h-7 w-8 flex items-center justify-center transition-all border shrink-0 text-sm focus:outline-none first:rounded-l last:rounded-r"
    const activeClass = "bg-blue-600 text-white border-blue-600 shadow-md relative z-10"
    const inactiveClass = "bg-white text-[#254153] hover:bg-slate-100 border-gray-300"

    return (
        <div className="flex items-center -space-x-px">
            {botones.filter(b => b.visible).map(b => (
                <button key={b.key} type="button" onClick={b.onClick} className={`${baseClass} ${b.activo ? activeClass : inactiveClass}`} title={b.title}>
                    {b.icon}
                </button>
            ))}
        </div>
    )
}

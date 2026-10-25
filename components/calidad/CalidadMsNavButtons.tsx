'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Search, ClipboardList, History, Settings, Timer, PieChart, BookOpenCheck } from 'lucide-react'
import { BrokenSinkIcon } from '@/components/icons/BrokenSinkIcon'

export type CalidadMsTab = 'registro' | 'list' | 'historico' | 'saldos' | 'indicadores' | 'criterios'

interface CalidadMsNavButtonsProps {
    activeTab: CalidadMsTab
    onOpenSettings?: () => void
    onToggleChart?: () => void
    hasSettingsPermission?: boolean
    isChartActive?: boolean
    isSettingsActive?: boolean
}

export function CalidadMsNavButtons({
    activeTab,
    onOpenSettings,
    onToggleChart,
    hasSettingsPermission = true,
    isChartActive = false,
    isSettingsActive = false
}: CalidadMsNavButtonsProps) {
    const router = useRouter()

    // Pre-cargar todas las rutas en segundo plano para cambio instantáneo
    React.useEffect(() => {
        router.prefetch('/calidad/ms')
        router.prefetch('/calidad/ms/list')
        router.prefetch('/calidad/ms/historico')
        router.prefetch('/calidad/ms/saldos')
        router.prefetch('/calidad/ms/indicadores')
        router.prefetch('/calidad/ms/criterios')
    }, [router])

    const handleRegistroClick = () => {
        if (activeTab === 'registro') {
            if (isChartActive && onToggleChart) onToggleChart()
            return
        }
        router.push('/calidad/ms')
    }

    const handleListClick = () => {
        if (activeTab === 'list') return
        router.push('/calidad/ms/list')
    }

    const handleHistoricoClick = () => {
        if (activeTab === 'historico') return
        router.push('/calidad/ms/historico')
    }

    const handleSettingsClick = () => {
        if (onOpenSettings) {
            onOpenSettings()
        } else {
            router.push('/calidad/ms?settings=true')
        }
    }

    const handleChartClick = () => {
        if (onToggleChart) {
            onToggleChart()
        } else {
            router.push('/calidad/ms?chart=true')
        }
    }

    const handleSaldosClick = () => {
        if (activeTab === 'saldos') return
        router.push('/calidad/ms/saldos')
    }

    const handleIndicadoresClick = () => {
        if (activeTab === 'indicadores') return
        router.push('/calidad/ms/indicadores')
    }

    const handleCriteriosClick = () => {
        if (activeTab === 'criterios') return
        router.push('/calidad/ms/criterios')
    }

    const isRegistroActive = activeTab === 'registro' && !isChartActive && !isSettingsActive
    const isListActive = activeTab === 'list'
    const isHistoricoActive = activeTab === 'historico'
    const isSaldosActive = activeTab === 'saldos'
    const isIndicadoresActive = activeTab === 'indicadores'
    const isCriteriosActive = activeTab === 'criterios'

    const baseClass = "h-10 w-10 flex items-center justify-center transition-all border shrink-0 text-sm focus:outline-none"
    const activeClass = "bg-blue-600 text-white border-blue-600 shadow-md relative z-10"
    const inactiveClass = "bg-white text-[#254153] hover:bg-slate-100 border-gray-300"

    return (
        <div className="flex items-center -space-x-px">
            {/* 1. Registro en Línea (Matriz) */}
            <button
                type="button"
                onClick={handleRegistroClick}
                className={`${baseClass} rounded-l ${isRegistroActive ? activeClass : inactiveClass}`}
                title="Registro de Defectos en Línea (Matriz)"
            >
                <Search className="w-5 h-5" />
            </button>

            {/* 2. Reportes del Día */}
            <button
                type="button"
                onClick={handleListClick}
                className={`${baseClass} ${isListActive ? activeClass : inactiveClass}`}
                title="Ver Reportes del Día"
            >
                <ClipboardList className="w-5 h-5" />
            </button>

            {/* 3. Histórico General de Defectos */}
            <button
                type="button"
                onClick={handleHistoricoClick}
                className={`${baseClass} ${isHistoricoActive ? activeClass : inactiveClass}`}
                title="Histórico General de Defectos"
            >
                <History className="w-5 h-5" />
            </button>

            {/* 4. Saldos y Destrucciones */}
            <button
                type="button"
                onClick={handleSaldosClick}
                className={`${baseClass} ${isSaldosActive ? activeClass : inactiveClass}`}
                title="Saldos y Destrucciones"
            >
                <BrokenSinkIcon className="w-5 h-5" />
            </button>

            {/* 5. Indicador Hora a Hora */}
            <button
                type="button"
                onClick={handleChartClick}
                className={`${baseClass} ${isChartActive ? activeClass : inactiveClass}`}
                title="Indicador Hora a Hora"
            >
                <Timer className="w-5 h-5" />
            </button>

            {/* 6. Indicadores generales de calidad MS (misma vista del tablero de control) */}
            <button
                type="button"
                onClick={handleIndicadoresClick}
                className={`${baseClass} ${isIndicadoresActive ? activeClass : inactiveClass}`}
                title="Indicadores Generales de Calidad MS"
            >
                <PieChart className="w-5 h-5" />
            </button>

            {/* 7. Configurar Defectos */}
            {hasSettingsPermission && (
                <button
                    type="button"
                    onClick={handleSettingsClick}
                    className={`${baseClass} ${isSettingsActive ? activeClass : inactiveClass}`}
                    title="Configuración de Defectos"
                >
                    <Settings className="w-5 h-5" />
                </button>
            )}

            {/* 8. Criterios de Aceptación y Rechazo */}
            <button
                type="button"
                onClick={handleCriteriosClick}
                className={`${baseClass} rounded-r ${isCriteriosActive ? activeClass : inactiveClass}`}
                title="Criterios de Aceptación y Rechazo"
            >
                <BookOpenCheck className="w-5 h-5" />
            </button>
        </div>
    )
}

'use client'

import { useEffect, useState, useTransition, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/opt-sistemica/Header'
import VigilanciaMainMenu from '@/components/calidad/vigilancia/VigilanciaMainMenu'
import VigilanciaPlantaView from '@/components/calidad/vigilancia/VigilanciaPlantaView'
import IndicadoresVigilanciaView from '@/components/calidad/vigilancia/IndicadoresVigilanciaView'
import { PLANTAS_VIGILANCIA, PlantaVigilanciaKey } from '@/components/calidad/vigilancia/types'

function VigilanciaContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()

    // Parámetros URL
    const plantaParam = searchParams.get('planta') as PlantaVigilanciaKey | null
    const vistaParam = searchParams.get('vista')

    const [activePlantaKey, setActivePlantaKey] = useState<PlantaVigilanciaKey | null>(plantaParam)
    const [showIndicadores, setShowIndicadores] = useState<boolean>(vistaParam === 'indicadores')
    const [indicadoresPlantaKey, setIndicadoresPlantaKey] = useState<PlantaVigilanciaKey | null>(plantaParam)

    useEffect(() => {
        if (plantaParam && PLANTAS_VIGILANCIA.some(p => p.key === plantaParam)) {
            setActivePlantaKey(plantaParam)
            setIndicadoresPlantaKey(plantaParam)
        } else {
            setActivePlantaKey(null)
            setIndicadoresPlantaKey(null)
        }

        if (vistaParam === 'indicadores') {
            setShowIndicadores(true)
        } else {
            setShowIndicadores(false)
        }
    }, [plantaParam, vistaParam])

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) {
                router.push('/login')
                return
            }
            setUser(authUser)
            setLoading(false)
        }
        checkUser()
    }, [router])

    const handleSelectPlanta = (key: PlantaVigilanciaKey) => {
        startTransition(() => {
            setShowIndicadores(false)
            setActivePlantaKey(key)
            const url = new URL(window.location.href)
            url.searchParams.set('planta', key)
            url.searchParams.delete('vista')
            window.history.pushState(null, '', url.toString())
        })
    }

    const handleOpenIndicadores = (plantaKey?: PlantaVigilanciaKey) => {
        startTransition(() => {
            setShowIndicadores(true)
            if (plantaKey) {
                setIndicadoresPlantaKey(plantaKey)
            }
            const url = new URL(window.location.href)
            url.searchParams.set('vista', 'indicadores')
            if (plantaKey) {
                url.searchParams.set('planta', plantaKey)
            } else {
                url.searchParams.delete('planta')
            }
            window.history.pushState(null, '', url.toString())
        })
    }

    const handleBackFromIndicadores = () => {
        startTransition(() => {
            setShowIndicadores(false)
            const url = new URL(window.location.href)
            url.searchParams.delete('vista')
            window.history.pushState(null, '', url.toString())
        })
    }

    const handleBackToMenu = () => {
        startTransition(() => {
            setShowIndicadores(false)
            setActivePlantaKey(null)
            setIndicadoresPlantaKey(null)
            const url = new URL(window.location.href)
            url.searchParams.delete('planta')
            url.searchParams.delete('vista')
            window.history.pushState(null, '', url.toString())
        })
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#324354] flex items-center justify-center">
                <div className="text-white text-base font-bold animate-pulse">Cargando Plan de Vigilancia...</div>
            </div>
        )
    }

    const activePlantaConfig = PLANTAS_VIGILANCIA.find(p => p.key === activePlantaKey)

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
            <Header
                title="Plan de Vigilancia"
                subtitle="Calidad"
                compact={true}
                userEmail={user?.email}
                showLogout={true}
                onLogout={handleLogout}
            />

            <main className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 w-full">
                {showIndicadores ? (
                    <IndicadoresVigilanciaView
                        plantaInicial={indicadoresPlantaKey}
                        onBack={activePlantaConfig ? () => setShowIndicadores(false) : handleBackFromIndicadores}
                    />
                ) : activePlantaConfig ? (
                    <VigilanciaPlantaView
                        planta={activePlantaConfig}
                        onBack={handleBackToMenu}
                        onOpenIndicadores={handleOpenIndicadores}
                    />
                ) : (
                    <VigilanciaMainMenu
                        onSelectPlanta={handleSelectPlanta}
                        onOpenIndicadores={() => handleOpenIndicadores()}
                    />
                )}
            </main>
        </div>
    )
}

export default function VigilanciaPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#324354] flex items-center justify-center text-white font-bold">
                Cargando...
            </div>
        }>
            <VigilanciaContent />
        </Suspense>
    )
}

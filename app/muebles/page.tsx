'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import CorteModule from '@/components/muebles/CorteModule'
import EnchapeModule from '@/components/muebles/EnchapeModule'
import InspeccionModule from '@/components/muebles/InspeccionModule'
import EmpaqueModule from '@/components/muebles/EmpaqueModule'
import DigitadoModule from '@/components/muebles/DigitadoModule'
import TransitoModule from '@/components/muebles/TransitoModule'
import CediModule from '@/components/muebles/CediModule'
import AdministracionModule from '@/components/muebles/AdministracionModule'
import DefectosModule from '@/components/muebles/DefectosModule'
import PanelDefectosModule from '@/components/muebles/PanelDefectosModule'
import DashboardModule from '@/components/muebles/DashboardModule'
import ConfigurarTurnosModal from '@/components/muebles/ConfigurarTurnosModal'
import ConfigurarSupervisoresModal from '@/components/muebles/ConfigurarSupervisoresModal'
import CambiarPlantaModal from '@/components/muebles/CambiarPlantaModal'
import { getMetricasMueblesHoy } from '@/lib/supabase/queries/muebles'

export default function MueblesPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [activeModule, setActiveModule] = useState('corte')
    const [isTurnosModalOpen, setIsTurnosModalOpen] = useState(false)
    const [isSupervisoresModalOpen, setIsSupervisoresModalOpen] = useState(false)
    const [isPlantaModalOpen, setIsPlantaModalOpen] = useState(false)

    useEffect(() => {
        const getUser = async () => {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
            } else {
                setUser(user)
                // Fetch user profile for permissions and name
                const { data: profile } = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('uuid', user.id)
                    .single()
                
                if (profile) {
                    setProfile(profile)
                    if (profile.modulo_predeterminado_muebles) {
                        setActiveModule(profile.modulo_predeterminado_muebles.toLowerCase())
                    }
                }
            }
            setLoading(false)
        }
        getUser()
    }, [router])

    const reloadProfile = async () => {
        if (!user) return
        const { data: profile } = await supabase
            .from('usuarios')
            .select('*')
            .eq('uuid', user.id)
            .single()
        
        if (profile) {
            setProfile(profile)
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) return (
      <div className="min-h-screen bg-[#254153] flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
    if (!user) return null

    const menuItems = [
        { id: 'corte', label: 'Corte', permission: 'corte', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 11-4.243 4.243 3 3 0 014.243-4.243zm0-5.758a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243z" />
            </svg>
        )},
        { id: 'enchape', label: 'Enchape', permission: 'enchape', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
        )},
        { id: 'inspeccion', label: 'Inspección', permission: 'inspeccion', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
        )},
        { id: 'empaque', label: 'Empaque', permission: 'empaque', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        )},
        { id: 'digitado', label: 'Digitado', permission: 'digitado', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        )},
        { id: 'transito', label: 'Transito', permission: 'transito', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
        )},
        { id: 'cedi', label: 'CEDI', permission: 'cedi', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        )},
        { id: 'administracion', label: 'Administración', permission: 'administracion', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        )},
        { id: 'defectos', label: 'Defectos', permission: 'defectos', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        )},
        { id: 'panel', label: 'Panel Defectos', permission: 'panel', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        )},
        { id: 'dashboard', label: 'Dashboard', permission: 'dashboard', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
        )}
    ]

    const utilityItems = [
        { id: 'turnos', label: 'Turnos', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )},
        { id: 'supervisores', label: 'Supervisores', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        )},
        { id: 'cambiar_planta', label: 'Cambiar Planta', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        )}
    ]

    const filteredMenuItems = menuItems.filter(item => {
        if (!profile) return true; // Show all while loading profile
        if (profile.rol === 'desarrollador' || profile.rol === 'director') return true;
        return profile.permisos?.muebles?.[item.permission] === true;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-[#254153] border-b border-[#1a2e3b] sticky top-0 z-50 shadow-md">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => router.push('/home/selection')}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                                title="Volver a Selección"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                                <img src="/assets/images/Logo-Firplak-Azul.png" alt="Logo" className="w-8 h-auto" onError={(e:any) => e.target.src = "https://placehold.co/40x40/white/254153?text=FP"} />
                            </div>
                            <h1 className="text-xl font-bold text-white">Manufactura - Muebles</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm text-gray-200">Bienvenido</p>
                                <p className="text-white font-semibold">{profile?.nombre || user?.email || 'Usuario'}</p>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                            >
                                Cerrar Sesión
                            </button>
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="text-white hover:bg-[#1a2e3b] p-2 rounded-lg transition-colors border border-white/20"
                                title="Toggle Sidebar"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex min-h-[calc(100vh-4rem)] relative">
                {/* Sidebar Backdrop (Mobile only) */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={`fixed md:relative inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out bg-white border-r border-gray-200 shadow-lg
                        ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-0'}
                        overflow-hidden`}
                >
                    <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
                        {filteredMenuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveModule(item.id)}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm w-full ${activeModule === item.id
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        ))}

                        <div className="pt-4 border-t border-gray-200 mt-4 space-y-1">
                            {utilityItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                      if (item.id === 'cambiar_planta') {
                                        setIsPlantaModalOpen(true);
                                      } else if (item.id === 'turnos') {
                                        setIsTurnosModalOpen(true);
                                      } else if (item.id === 'supervisores') {
                                        setIsSupervisoresModalOpen(true);
                                      } else {
                                        setActiveModule(item.id);
                                      }
                                    }}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm w-full text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]`}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 h-[calc(100vh-4rem)] bg-white overflow-hidden relative">
                    <div className="h-full overflow-y-auto">
                        {activeModule === 'corte' ? (
                            <CorteModule 
                                userEmail={user?.email || ''} 
                                turno="1" 
                                usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                plantaMuebles={profile?.planta_muebles || 'Muebles'}
                            />
                        ) : activeModule === 'enchape' ? (
                            <EnchapeModule 
                                userEmail={user?.email || ''} 
                                turno="1" 
                                usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                plantaMuebles={profile?.planta_muebles || 'Muebles'}
                            />
                        ) : activeModule === 'inspeccion' ? (
                            <InspeccionModule 
                                userEmail={user?.email || ''} 
                                turno="1" 
                                usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                plantaMuebles={profile?.planta_muebles || 'Muebles'}
                            />
                        ) : activeModule === 'empaque' ? (
                            <EmpaqueModule 
                                userEmail={user?.email || ''} 
                                turno="1" 
                                usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                plantaMuebles={profile?.planta_muebles || 'Muebles'}
                            />
                        ) : activeModule === 'digitado' ? (
                            <DigitadoModule 
                                userEmail={user?.email || ''} 
                                turno="1" 
                                usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                plantaMuebles={profile?.planta_muebles || 'Muebles'}
                            />
                        ) : activeModule === 'transito' ? (
                            <TransitoModule 
                                userEmail={user?.email || ''} 
                                turno="1" 
                                usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                plantaMuebles={profile?.planta_muebles || 'Muebles'}
                            />
                        ) : activeModule === 'cedi' ? (
                            <CediModule 
                                userEmail={user?.email || ''} 
                                turno="1" 
                                usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                plantaMuebles={profile?.planta_muebles || 'Muebles'}
                            />
                        ) : activeModule === 'administracion' ? (
                            <AdministracionModule 
                                userEmail={user?.email || ''} 
                                turno="1" 
                                usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                plantaMuebles={profile?.planta_muebles || 'Muebles'}
                            />
                        ) : activeModule === 'defectos' ? (
                            <DefectosModule 
                                plantaMuebles={profile?.planta_muebles || 'Muebles'}
                            />
                        ) : activeModule === 'panel' ? (
                            <PanelDefectosModule 
                                plantaMuebles={profile?.planta_muebles || 'Muebles'}
                                turno={profile?.turno || '1'}
                            />
                        ) : activeModule === 'dashboard' ? (
                            <DashboardModule 
                                plantaMuebles={profile?.planta_muebles || 'Muebles'}
                            />
                        ) : (
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                                <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
                                    <div className="text-center">
                                        <div className="w-32 h-32 bg-[#254153]/10 rounded-full flex items-center justify-center mx-auto mb-8">
                                            <svg className="w-16 h-16 text-[#254153]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                        <h1 className="text-4xl font-bold text-[#254153] mb-4 capitalize">
                                            Módulo {activeModule.replace('_', ' ')}
                                        </h1>
                                        <p className="text-xl text-gray-600 mb-8">
                                            Este módulo se encuentra en desarrollo. Por favor selecciona otro del menú lateral.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            {/* Turnos Modal */}
            {isTurnosModalOpen && (
                <ConfigurarTurnosModal 
                    onClose={() => setIsTurnosModalOpen(false)}
                />
            )}
            {/* Supervisores Modal */}
            {isSupervisoresModalOpen && (
                <ConfigurarSupervisoresModal 
                    onClose={() => setIsSupervisoresModalOpen(false)}
                />
            )}
            {/* Cambiar Planta Modal */}
            {isPlantaModalOpen && (
                <CambiarPlantaModal 
                    userUuid={user.id}
                    currentPlant={profile?.planta_muebles || 'Muebles'}
                    onClose={() => setIsPlantaModalOpen(false)}
                    onPlantChanged={async () => {
                        await reloadProfile()
                        setIsPlantaModalOpen(false)
                    }}
                />
            )}
        </div >
    )
}

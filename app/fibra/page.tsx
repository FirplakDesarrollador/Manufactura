'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function FibraPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [activeModule, setActiveModule] = useState('dashboard')

    useEffect(() => {
        const getUser = async () => {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
            } else {
                setUser(user)
                const { data: profile } = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('uuid', user.id)
                    .single()
                
                if (profile) {
                    setProfile(profile)
                }
            }
            setLoading(false)
        }
        getUser()
    }, [router])

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
        { id: 'dashboard', label: 'Dashboard', permission: 'dashboard', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
        )}
    ]

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
                            <h1 className="text-xl font-bold text-white">Control de Piso - Fibra</h1>
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
                        {menuItems.map((item) => (
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
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 h-[calc(100vh-4rem)] bg-white overflow-hidden relative">
                    <div className="h-full overflow-y-auto">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                            <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
                                <div className="text-center">
                                    <div className="w-32 h-32 bg-[#254153]/10 rounded-full flex items-center justify-center mx-auto mb-8">
                                        <svg className="w-16 h-16 text-[#254153]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    <h1 className="text-4xl font-bold text-[#254153] mb-4 capitalize">
                                        Bienvenido a Fibra
                                    </h1>
                                    <p className="text-xl text-gray-600 mb-8">
                                        Este módulo se encuentra en construcción.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div >
    )
}

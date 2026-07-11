'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Plus, Edit3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { isAuthorizedEditor } from '@/lib/hdt/authorized-editors'

export default function HdtMenuPage() {
    const [userName, setUserName] = useState('')
    const [canEdit, setCanEdit] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }
            if (user?.email) {
                const namePart = user.email.split('@')[0].split('.')[0]
                const capitalized = namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase()
                setUserName(capitalized)
                setCanEdit(isAuthorizedEditor(user.email))
            }
        }
        getUser()
    }, [router])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const allMenuItems = [
        {
            title: 'Ver HDTs creadas',
            image: '/brand/lista.avif',
            action: () => router.push('/hdt/plants?action=view'),
            requiresEdit: false,
        },
        {
            title: 'Editar una HDT',
            icon: <Edit3 className="h-10 w-10" style={{ color: 'var(--brand-primary)' }} />,
            action: () => router.push('/hdt/plants?action=edit'),
            requiresEdit: true,
        },
        {
            title: 'Crear una nueva HDT',
            icon: <Plus className="h-10 w-10" style={{ color: 'var(--brand-primary)' }} />,
            action: () => router.push('/hdt/create'),
            requiresEdit: false,
        },
    ]

    const menuItems = allMenuItems.filter(item => !item.requiresEdit || canEdit)

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 sm:p-12 relative">
            {/* Top Navigation / Brand */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center w-full max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/home')}
                        className="flex items-center gap-2 text-zinc-400 hover:text-brand-primary transition-colors font-bold text-sm"
                        style={{ color: '#6b7280' }}
                        onMouseOver={e => (e.currentTarget.style.color = 'var(--brand-primary)')}
                        onMouseOut={e => (e.currentTarget.style.color = '#6b7280')}
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="hidden sm:inline">Volver al inicio</span>
                    </button>
                    <img
                        src="/brand/logo_2.png"
                        alt="Firplak Logo"
                        className="h-16 w-auto object-contain"
                    />
                </div>

                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 font-bold text-sm transition-colors"
                    style={{ color: '#6b7280' }}
                    onMouseOver={e => (e.currentTarget.style.color = 'var(--brand-primary)')}
                    onMouseOut={e => (e.currentTarget.style.color = '#6b7280')}
                >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Cerrar sesión</span>
                </button>
            </div>

            <div className="w-full max-w-6xl mt-12 flex justify-center">
                <div className="flex flex-col items-center text-center space-y-10 w-full max-w-4xl">
                    {/* Dynamic Greeting */}
                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ color: 'var(--brand-primary)' }}>
                            ¡Hola {userName}!
                        </h1>
                        <h2 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--brand-primary)' }}>
                            ¿Qué quieres hacer?
                        </h2>
                    </div>

                    {/* Menu Buttons Area */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                        {menuItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={item.action}
                                className="flex flex-col items-center justify-center p-8 rounded-3xl space-y-4 bg-white min-h-[220px] transition-all"
                                style={{
                                    border: '2px solid rgba(27,65,84,0.10)',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                }}
                                onMouseOver={e => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb'
                                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-primary)'
                                    ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(27,65,84,0.10)'
                                }}
                                onMouseOut={e => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = 'white'
                                    ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(27,65,84,0.10)'
                                    ;(e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'
                                }}
                            >
                                <div className="h-24 flex items-center justify-center">
                                    {item.image ? (
                                        <img src={item.image} alt={item.title} className="h-20 w-auto object-contain transition-transform" />
                                    ) : (
                                        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'rgba(27,65,84,0.05)' }}>
                                            {item.icon}
                                        </div>
                                    )}
                                </div>
                                <span className="font-bold text-xl leading-snug" style={{ color: 'var(--brand-primary)' }}>{item.title}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-16 flex flex-col items-center">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-center" style={{ color: 'rgba(27,65,84,0.4)' }}>
                    FIRPLAK S.A. | Inspirando Hogares | Estandarización HDT
                </p>
            </div>
        </div>
    )
}

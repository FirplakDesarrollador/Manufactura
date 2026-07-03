'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isAuthorizedEditor } from '@/lib/hdt/authorized-editors'
import HdtForm from '@/components/hdt/HdtForm'
import { Loader2, ShieldX } from 'lucide-react'

interface EditHdtPageProps {
    params: Promise<{ id: string }>
}

export default function EditHdtPage({ params }: EditHdtPageProps) {
    const { id } = use(params)
    const router = useRouter()
    const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized'>('loading')

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (isAuthorizedEditor(user?.email)) {
                setAuthState('authorized')
            } else {
                setAuthState('unauthorized')
                setTimeout(() => router.replace('/hdt'), 2500)
            }
        }
        checkAccess()
    }, [router])

    if (authState === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <Loader2 className="h-12 w-12 animate-spin" style={{ color: 'var(--brand-primary)' }} />
                <p className="font-medium" style={{ color: '#6b7280' }}>Verificando permisos...</p>
            </div>
        )
    }

    if (authState === 'unauthorized') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4 text-center p-8">
                <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
                    <ShieldX className="h-10 w-10" style={{ color: '#ef4444' }} />
                </div>
                <h2 className="text-2xl font-extrabold" style={{ color: '#18181b' }}>Acceso Denegado</h2>
                <p className="max-w-sm" style={{ color: '#6b7280' }}>No tienes permisos para editar HDTs. Serás redirigido al menú...</p>
            </div>
        )
    }

    return <HdtForm mode="edit" hdtId={id} />
}

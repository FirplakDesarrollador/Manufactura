'use client'

import { useEffect, useState } from 'react'
import HdtForm from '@/components/hdt/HdtForm'
import Header from '@/components/opt-sistemica/Header'
import SubHeader from '@/components/hdt/SubHeader'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CreateHdtPage() {
    const [userEmail, setUserEmail] = useState('')
    const router = useRouter()

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                setUserEmail(data.user.email || '')
            }
        })
    }, [])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000] w-full">
            <Header 
                title="HDT"
                subtitle="Estandarización"
                userEmail={userEmail}
                showLogout={true}
                onLogout={handleSignOut}
            />
            <SubHeader />
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <HdtForm mode="create" />
            </main>
        </div>
    )
}

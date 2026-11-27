'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Header from '@/components/opt-sistemica/Header';
import ConsumosModule from '@/components/calidad/consumos/ConsumosModule';

export default function CalidadConsumosPage() {
    const router = useRouter();
    const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setUserEmail(user.email);
            setLoading(false);
        };
        checkUser();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#324354] flex items-center justify-center">
                <div className="text-white text-base font-bold animate-pulse">Cargando Consumos...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
            <Header
                title="Consumos"
                subtitle="Calidad"
                compact={true}
                userEmail={userEmail}
                showLogout={true}
                onLogout={handleLogout}
            />
            <main className="flex-1 w-full">
                <ConsumosModule userEmail={userEmail} />
            </main>
        </div>
    );
}

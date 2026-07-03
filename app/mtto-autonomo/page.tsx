'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';

export default function MttoAutonomoPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-[#254153] shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/home')}
                            className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-semibold text-white">Mantenimiento Autónomo</h1>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center justify-center">
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center max-w-lg w-full">
                    <div className="w-20 h-20 bg-[#254153]/10 rounded-full flex items-center justify-center mb-6">
                        <Settings className="w-10 h-10 text-[#254153]" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Módulo en Construcción</h2>
                    <p className="text-gray-600 mb-8">
                        Estamos trabajando en la integración de Mantenimiento Autónomo. 
                        Esta sección estará disponible muy pronto.
                    </p>
                    <button
                        onClick={() => router.push('/home')}
                        className="px-6 py-3 bg-[#254153] text-white font-medium rounded-xl hover:bg-[#1a2e3b] transition-colors"
                    >
                        Volver al inicio
                    </button>
                </div>
            </main>
        </div>
    );
}

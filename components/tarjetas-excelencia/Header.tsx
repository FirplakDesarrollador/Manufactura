"use client";

import Image from "next/image";
import Link from "next/link";
import { UserCircle, ArrowLeft } from "lucide-react";

export default function Header() {
    return (
        <header className="bg-[#243c4f] text-white shadow-md sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-3 gap-2">
                        <Link href="/sistema-produccion">
                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white" title="Volver a Producción">
                                <ArrowLeft size={24} />
                            </button>
                        </Link>
                        <Link href="/tarjetas-excelencia" className="flex items-center space-x-3 gap-2">
                            <div className="bg-white rounded p-1">
                                <Image
                                    src="/firplak-logo.png"
                                    alt="FIRPLAK Logo"
                                    width={100}
                                    height={30}
                                    className="object-contain"
                                />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-lg font-bold uppercase tracking-wide">Tarjetas de Excelencia</h1>
                                <p className="text-xs text-blue-200">Sistema de Producción</p>
                            </div>
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center justify-center p-2 rounded-full hover:bg-white/10 transition-colors">
                            <UserCircle size={28} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}

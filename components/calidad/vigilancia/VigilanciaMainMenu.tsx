'use client'

import React from 'react';
import { PLANTAS_VIGILANCIA, PlantaVigilanciaKey, PlantaVigilanciaConfig } from './types';
import {
    MarmolSinteticoIcon,
    FibraDeVidrioIcon,
    MueblesIcon,
    CefiIcon,
    RtmIcon,
    MoldesIcon
} from './VigilanciaIcons';

interface VigilanciaMainMenuProps {
    onSelectPlanta: (key: PlantaVigilanciaKey) => void;
}

export default function VigilanciaMainMenu({ onSelectPlanta }: VigilanciaMainMenuProps) {
    const renderIcon = (key: PlantaVigilanciaKey) => {
        const iconProps = {
            size: 84,
            className: "transition-transform duration-300 group-hover:scale-105 drop-shadow-xs"
        };
        switch (key) {
            case 'ms':
                return <MarmolSinteticoIcon {...iconProps} />;
            case 'fv':
                return <FibraDeVidrioIcon {...iconProps} />;
            case 'muebles':
                return <MueblesIcon {...iconProps} />;
            case 'cefi':
                return <CefiIcon {...iconProps} />;
            case 'rtm':
                return <RtmIcon {...iconProps} />;
            case 'moldes':
                return <MoldesIcon {...iconProps} />;
            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
            {/* Título de la vista tal como en el diseño de referencia */}
            <div className="text-center mb-8 sm:mb-12">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#324354] tracking-wider uppercase font-sans">
                    MENU PRINCIPAL
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    Selecciona una planta para explorar sus procesos y capturar datos del plan de vigilancia
                </p>
            </div>

            {/* Grid 3x2 de Plantas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {PLANTAS_VIGILANCIA.map((planta: PlantaVigilanciaConfig) => (
                    <button
                        key={planta.key}
                        onClick={() => onSelectPlanta(planta.key)}
                        className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-[#0099e5]/60 hover:-translate-y-1.5 transition-all duration-300 p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px] sm:min-h-[250px] relative overflow-hidden"
                    >
                        {/* Glow de fondo al hacer hover */}
                        <div className="absolute inset-0 bg-gradient-to-b from-[#0099e5]/0 via-[#0099e5]/0 to-[#0099e5]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        {/* Ícono azul Firplak */}
                        <div className="h-24 flex items-center justify-center mb-4">
                            {renderIcon(planta.key)}
                        </div>

                        {/* Nombre de la planta */}
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-600 group-hover:text-[#324354] tracking-tight transition-colors">
                            {planta.nombre}
                        </h2>

                        {/* Cantidad de procesos */}
                        <span className="mt-2 text-[11px] font-semibold text-slate-400 group-hover:text-[#0099e5] tracking-wide uppercase transition-colors">
                            {planta.procesos.length} {planta.procesos.length === 1 ? 'proceso' : 'procesos'} disponibles
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}


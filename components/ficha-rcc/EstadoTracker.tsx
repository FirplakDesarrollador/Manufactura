'use client';

import React from 'react';
import { EstadoFicha } from '@/types';
import { FileText, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface EstadoTrackerProps {
  estadoActual: EstadoFicha;
}

const ESTADOS: { key: EstadoFicha; label: string; desc: string; icon: any }[] = [
  { key: 'Abierto', label: 'Abierto', desc: 'Ficha detectada', icon: FileText },
  { key: 'En Seguimiento', label: 'En Seguimiento', desc: 'Acciones en curso', icon: Clock },
  { key: 'Pendiente de Cierre', label: 'Pendiente de Cierre', desc: 'Erradicaciones OK', icon: AlertTriangle },
  { key: 'Cerrado', label: 'Cerrado', desc: 'Validado por Calidad', icon: CheckCircle2 },
];

export default function EstadoTracker({ estadoActual }: EstadoTrackerProps) {
  const currentIndex = ESTADOS.findIndex(e => e.key === estadoActual);
  const activeIdx = currentIndex === -1 ? 0 : currentIndex;
  const progressPercent = (activeIdx / (ESTADOS.length - 1)) * 100;

  return (
    <div className="w-full bg-white/80 backdrop-blur-md rounded-2xl p-6 mb-8 border border-gray-200/80 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">Estado del Proceso</span>
          <h3 className="text-lg font-bold text-[#254153] flex items-center gap-2">
            Flujo de Trazabilidad RRC
          </h3>
        </div>
        <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 ${
          estadoActual === 'Cerrado' 
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
            : estadoActual === 'Pendiente de Cierre'
            ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse'
            : estadoActual === 'En Seguimiento'
            ? 'bg-amber-100 text-amber-800 border border-amber-300'
            : 'bg-gray-100 text-gray-700 border border-gray-300'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            estadoActual === 'Cerrado' ? 'bg-emerald-600' : estadoActual === 'Pendiente de Cierre' ? 'bg-blue-600' : estadoActual === 'En Seguimiento' ? 'bg-amber-600' : 'bg-gray-500'
          }`} />
          {estadoActual}
        </span>
      </div>

      {/* Barra Horizontal Tracker */}
      <div className="relative px-2 sm:px-6 py-4">
        {/* Línea de fondo */}
        <div className="absolute top-1/2 left-8 right-8 h-1.5 bg-gray-200 -translate-y-1/2 rounded-full z-0" />
        
        {/* Línea de progreso activa */}
        <div 
          className="absolute top-1/2 left-8 h-1.5 bg-[#254153] -translate-y-1/2 rounded-full z-0 transition-all duration-500"
          style={{ width: `calc(${progressPercent}% * 0.88)` }}
        />

        {/* Nodos de los 4 Estados */}
        <div className="relative z-10 flex justify-between items-center">
          {ESTADOS.map((item, idx) => {
            const isCompleted = idx < activeIdx;
            const isCurrent = idx === activeIdx;
            const isPending = idx > activeIdx;
            const Icon = item.icon;

            return (
              <div key={item.key} className="flex flex-col items-center group cursor-default">
                {/* Círculo indicador */}
                <div 
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                    isCurrent
                      ? 'bg-[#254153] text-white ring-4 ring-[#254153]/20 scale-110'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-gray-400 border-2 border-gray-300'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                  ) : (
                    <Icon className="w-5 h-5" strokeWidth={isCurrent ? 2.5 : 2} />
                  )}
                </div>

                {/* Etiquetas */}
                <div className="mt-3 text-center">
                  <p className={`text-xs sm:text-sm font-bold tracking-tight transition-colors ${
                    isCurrent ? 'text-[#254153]' : isCompleted ? 'text-gray-800' : 'text-gray-400'
                  }`}>
                    {item.label}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

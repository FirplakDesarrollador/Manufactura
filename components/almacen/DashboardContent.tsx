'use client'

import UnifiedInventoryTable from '@/components/almacen/UnifiedInventoryTable'
import LowStockChart from '@/components/almacen/LowStockChart'
import { useState } from 'react'

export default function DashboardContent() {
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null)

  return (
    <div className="w-full">
      <main className="pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        {/* Header Section */}
        <section>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold mb-4 tracking-widest uppercase">
                Panel de Control
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                Inventario de <span className="text-indigo-600">Repuestos</span>
              </h1>
              <p className="mt-4 text-gray-500 max-w-2xl text-lg">
                Gestiona y controla el stock de mantenimiento en tiempo real.
                Usa el buscador para filtrar registros instantáneamente o haz clic en las barras de la gráfica para ver los repuestos por debajo del nivel mínimo por planta.
              </p>
            </div>
          </div>
        </section>

        {/* Analytics Section */}
        <section>
          <LowStockChart 
            onPlantClick={setSelectedPlant} 
            selectedPlant={selectedPlant} 
          />
        </section>

        {/* Main Operational Table */}
        <section>
          <UnifiedInventoryTable 
            externalPlantFilter={selectedPlant} 
            onClearPlantFilter={() => setSelectedPlant(null)} 
          />
        </section>

        {/* System Infrastructure Footer Card */}
        <section>
          <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold mb-4 tracking-widest uppercase">
                  Infraestructura ANTY
                </div>
                <h2 className="text-2xl font-bold mb-4">Arquitectura de Mantenimiento</h2>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Este tablero está conectado directamente a la base de datos de Supabase. Todos los cambios en el stock actual de la tabla se guardan y sincronizan automáticamente sin necesidad de recargar la página.
                </p>
              </div>
            </div>
            {/* Mesh background effects */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-10 left-10 w-40 h-40 bg-indigo-700/30 rounded-full blur-[60px]"></div>
          </div>
        </section>
      </main>
    </div>
  )
}

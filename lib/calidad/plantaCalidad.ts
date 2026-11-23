'use client'

import { usePathname } from 'next/navigation'
import { plantaCalidadDeRuta, type PlantaCalidad } from './plantasCalidadConfig'

// Hook de la planta de calidad según la ruta (/calidad/ms o /calidad/rmold). La configuración está en
// plantasCalidadConfig.ts (sin 'use client', para usarla también en el servidor).
export * from './plantasCalidadConfig'

export function usePlantaCalidad(): PlantaCalidad {
    return plantaCalidadDeRuta(usePathname())
}

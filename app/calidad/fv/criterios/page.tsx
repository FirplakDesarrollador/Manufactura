'use client'

import CriteriosCalidadView from '@/components/calidad/CriteriosCalidadView'

// Entrada desde Calidad FV: la misma vista de criterios con Fibra de Vidrio seleccionada y la barra de Calidad FV
export default function CriteriosCalidadFvPage() {
    return <CriteriosCalidadView plantaInicial="Fv" mostrarBotonesMs />
}

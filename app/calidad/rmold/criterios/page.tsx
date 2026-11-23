'use client'

import CriteriosCalidadView from '@/components/calidad/CriteriosCalidadView'

// Entrada desde Calidad RMOLD: la misma vista de criterios con Reparación de Moldes seleccionada y la barra de Calidad RMOLD
export default function CriteriosCalidadRmoldPage() {
    return <CriteriosCalidadView plantaInicial="R moldes" mostrarBotonesMs />
}

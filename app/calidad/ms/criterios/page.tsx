'use client'

import CriteriosCalidadView from '@/components/calidad/CriteriosCalidadView'

// Entrada desde Calidad MS: la misma vista de criterios con MS seleccionada y la barra de Calidad MS
export default function CriteriosCalidadMsPage() {
    return <CriteriosCalidadView plantaInicial="Ms" mostrarBotonesMs />
}

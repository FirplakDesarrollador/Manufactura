// Plantas con el módulo de Calidad "tipo MS" (registro en línea por pieza, reportes del día, histórico, hora a hora,
// indicadores, configuración y criterios). Las pantallas son las mismas (app/calidad/ms/*); la ruta decide la planta:
//   /calidad/ms/…     Mármol Sintético (MS)
//   /calidad/rmold/…  Reparación de Moldes (RMOLD): la referencia es el tipo de molde (MS y FV) y el serial del molde
// Las tablas de RMOLD son copia exacta de las de MS (calidad_rmold.sql), así el mismo código sirve para las dos.
export type PlantaCalidadId = 'ms' | 'rmold'

export interface PlantaCalidad {
    id: PlantaCalidadId
    titulo: string              // banner
    nombre: string              // texto corto en títulos ("Calidad MS")
    base: string                // ruta base
    tReportes: string           // un registro por pieza revisada
    tDefectos: string           // catálogo de defectos del registro en línea
    tReferencias: string        // referencias que se escogen al registrar (id, Referencia)
    vDia: string                // vista con los registros del día (defectos_lista)
    plantaCriterios: string     // valor de criterios_calidad_plantas.planta
    carpetaFotos: string
    placeholderReferencia: string
    saldos: boolean             // submódulo Saldos y destrucciones
    conSerial: boolean          // al registrar se escoge también el serial del molde
    inicio: string              // primer día con datos para los indicadores
    // Defectos que no hacen defectuosa la pieza (MS: Opaco y los de logística)
    defectosNoCuentan: string[]
}

export const PLANTAS_CALIDAD: Record<PlantaCalidadId, PlantaCalidad> = {
    ms: {
        id: 'ms', titulo: 'Calidad MS', nombre: 'Calidad MS', base: '/calidad/ms',
        tReportes: 'ms_reporte_defectos', tDefectos: 'ms_defectos', tReferencias: 'productos_defectos_ms', vDia: 'query_ms_reporte_defectos_dia',
        plantaCriterios: 'Ms', carpetaFotos: 'ms-defectos', placeholderReferencia: 'SELECCIONAR REFERENCIA DE PRODUCTO',
        saldos: true, conSerial: false, inicio: '2025-09-17',
        defectosNoCuentan: ['saldos/destrucciones', 'opaco', 'error en pedido referencia', 'quebrados logistica']
    },
    rmold: {
        id: 'rmold', titulo: 'Calidad Reparación Moldes (RMOLD)', nombre: 'Calidad RMOLD', base: '/calidad/rmold',
        tReportes: 'rmold_reporte_defectos', tDefectos: 'rmold_defectos', tReferencias: 'rmold_referencias', vDia: 'query_rmold_reporte_defectos_dia',
        plantaCriterios: 'R moldes', carpetaFotos: 'rmold-defectos', placeholderReferencia: 'SELECCIONAR TIPO DE MOLDE',
        saldos: false, conSerial: true, inicio: '2026-10-01',
        defectosNoCuentan: []
    }
}

export function plantaCalidadDeRuta(ruta: string | null | undefined): PlantaCalidad {
    return (ruta || '').startsWith('/calidad/rmold') ? PLANTAS_CALIDAD.rmold : PLANTAS_CALIDAD.ms
}

// ¿El defecto (nombre con o sin número "3. ") hace defectuosa la pieza en esta planta?
export function defectoCuenta(p: PlantaCalidad, nombre: string): boolean {
    const limpio = nombre.replace(/^\s*\d+\.\s*/, '').trim().toLowerCase()
    return !p.defectosNoCuentan.includes(limpio)
}

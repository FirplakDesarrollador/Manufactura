// Peso de vaciado por pieza (Bañera / Faldón) desde la lista de materiales de la OF en SAP.
// Regla tomada de la hoja "Por vaciar / Por pintar" de planta, validada con 12 OF: en la lista de materiales cada pieza
// vaciada es un bloque de líneas seguidas Gelcoat → Masilla para vaciado → Resina. La resina del bloque es la que queda
// más cerca de su masilla: RESINA FV 4891 = "Virgen", RESINA PALATAL CARGADA = "Cargada". Las resinas sueltas pequeñas
// (0,03 a 1,3 kg, reparaciones) no son vaciado. La pieza con más resina es la Bañera y la otra el Faldón; el gelcoat
// también de mayor a menor (el mayor es el de la bañera). Valores por unidad (SAP trae el total de la OF).
// La usan el detalle de la orden (/api/sap/production-orders/[docNum]) y las tarjetas de Pintura y Vaciado FV.
export type PiezaVaciado = { pieza: string; resinaTipo: string; resinaKg: number; gelcoatKg: number | null }

export function calcularPesosVaciado(lineas: any[], cantidadOf: unknown): PiezaVaciado[] {
    const qty = (line: any) => { const q = Number(line.PlannedQuantity ?? line.BaseQuantity ?? 0); return Number.isFinite(q) ? q : 0 }
    const conPos = lineas.map((line: any, i: number) => ({ line, i, d: String(line.ItemName || '').toUpperCase(), no: String(line.ItemNo || '').toUpperCase() }))
    const masillas = conPos.filter(x => /MASILLA\s+PARA\s+VACIADO/.test(x.d))
    const resinas = conPos.filter(x => /\bRESINA\b/.test(x.d) && qty(x.line) > 0)
    const gelcoats = conPos.filter(x => /GEL\s?COAT/.test(x.d) || x.no.startsWith('PGEL'))
    // Emparejar cada masilla con la resina más cercana (de menor a mayor distancia, cada resina una sola vez)
    const pares = masillas.flatMap(m => resinas.map(r => ({ m, r, dist: Math.abs(m.i - r.i) }))).sort((a, b) => a.dist - b.dist)
    const usadasM = new Set<number>(), usadasR = new Set<number>()
    const piezas: typeof conPos = []
    for (const p of pares) {
        if (p.dist > 6 || usadasM.has(p.m.i) || usadasR.has(p.r.i)) continue
        usadasM.add(p.m.i); usadasR.add(p.r.i); piezas.push(p.r)
    }
    const unidades = Number(cantidadOf) > 0 ? Number(cantidadOf) : 1
    const porUnidad = (q: number) => Number((q / unidades).toFixed(2))
    const resinasVaciado = piezas.sort((x, y) => qty(y.line) - qty(x.line))
    const gelcoatsVaciado = gelcoats.map(g => qty(g.line)).sort((x, y) => y - x)
    return resinasVaciado.map((r, k) => ({
        pieza: k === 0 ? 'Bañera' : k === 1 ? 'Faldón' : `Pieza ${k + 1}`,
        resinaTipo: /CARGAD/.test(r.d) ? 'Cargada' : 'Virgen',
        resinaKg: porUnidad(qty(r.line)),
        gelcoatKg: gelcoatsVaciado[k] != null ? porUnidad(gelcoatsVaciado[k]) : null,
    }))
}

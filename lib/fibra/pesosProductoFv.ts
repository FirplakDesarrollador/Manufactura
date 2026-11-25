import { fetchSAP } from '@/lib/sap'
import { sinTildes } from '@/lib/gruposMateriales'

// Resina y gelcoat por pieza (Bañera / Faldón) de cada producto FV, desde su lista de materiales en SAP (ProductTrees).
// En SAP el producto trae una sub-estructura por pieza ("ESTRUCTURA CONFORMACION HIDRO …" = Bañera,
// "ESTRUCTURA CONFORMACION FALDON …" = Faldón). Dentro de cada una:
//  · Gelcoat: líneas GELCOAT (kg directos).
//  · Resina: el "REFUERZO FIBRA VIDRIO CON RESINA …" es otra sub-estructura; resina = cantidad del refuerzo × resina por unidad
//    (ej. Noruega: bañera 20 × 0,6 = 12 kg de RESINA FV 4891 "Virgen"; faldón 12,43 × 0,65 = 8,08 kg de PALATAL "Cargada").
//    Si la resina viene suelta dentro de la estructura, se suma directa.
// Pieza = sub-estructura PEST cuyo nombre dice "CONFORMACION" (bañera, faldón…); las demás (sistema autoportante, cantonera,
// empaque) y las resinas sueltas (reparaciones) no cuentan. Dentro de la pieza solo se abren los refuerzos y las sub-estructuras
// PEST: la masilla para vaciado trae algo de resina, pero no es resina de vaciado.

type Linea = { ItemCode: string; ItemName?: string; Quantity: number }
type Arbol = { codigo: string; descripcion: string; lineas: Linea[] } | null

export type PiezaFv = { pieza: string; estructura: string; resinaKg: number; resinaTipo: string | null; gelcoatKg: number }

const esPieza = (l: Linea) => /^PEST/i.test(l.ItemCode) && /CONFORMACION/.test(sinTildes(l.ItemName || ''))
const seAbre = (l: Linea) => /^PEST/i.test(l.ItemCode) || /REFUERZO/.test(sinTildes(l.ItemName || ''))
const esGelcoat = (l: Linea) => /GEL\s?COAT/.test(sinTildes(l.ItemName || '')) || /^PGEL/i.test(l.ItemCode)
const esResina = (l: Linea) => /\bRESINA\b/.test(sinTildes(l.ItemName || '')) && !/REFUERZO/.test(sinTildes(l.ItemName || ''))
const tipoResina = (d: string) => /CARGAD/.test(sinTildes(d)) ? 'Cargada' : 'Virgen'
const r2 = (n: number) => Math.round(n * 100) / 100

export class LectorArboles {
    private cache = new Map<string, Arbol>()
    constructor(private baseUrl: string) {}

    async arbol(codigo: string): Promise<Arbol> {
        if (this.cache.has(codigo)) return this.cache.get(codigo)!
        const r = await fetchSAP(`${this.baseUrl}/ProductTrees('${encodeURIComponent(codigo)}')?$select=TreeCode,ProductDescription,Quantity,ProductTreeLines`, { method: 'GET' })
        let a: Arbol = null
        if (r.ok) {
            const d = await r.json()
            const base = Number(d.Quantity) > 0 ? Number(d.Quantity) : 1
            a = { codigo, descripcion: String(d.ProductDescription || ''), lineas: (d.ProductTreeLines || []).map((l: any) => ({ ItemCode: String(l.ItemCode || '').trim(), ItemName: l.ItemName || '', Quantity: (Number(l.Quantity) || 0) / base })) }
        } else if (r.status !== 404) {
            throw new Error(`SAP no entregó la lista de materiales de ${codigo} (${r.status})`)
        }
        this.cache.set(codigo, a)
        return a
    }

    // Resina y gelcoat contenidos en una estructura (abre refuerzos y sub-estructuras)
    private async contenido(codigo: string, factor: number, prof: number): Promise<{ resina: number; tipo: string | null; gelcoat: number }> {
        const a = await this.arbol(codigo)
        const out = { resina: 0, tipo: null as string | null, gelcoat: 0 }
        if (!a || prof > 4) return out
        for (const l of a.lineas) {
            const q = l.Quantity * factor
            if (esGelcoat(l)) out.gelcoat += q
            else if (esResina(l)) { out.resina += q; out.tipo = out.tipo || tipoResina(l.ItemName || '') }
            else if (seAbre(l)) {
                const c = await this.contenido(l.ItemCode, q, prof + 1)
                out.resina += c.resina; out.gelcoat += c.gelcoat; out.tipo = out.tipo || c.tipo
            }
        }
        return out
    }

    async piezas(sku: string): Promise<{ descripcion: string; piezas: PiezaFv[] } | null> {
        const a = await this.arbol(sku)
        if (!a) return null
        const piezas: PiezaFv[] = []
        for (const l of a.lineas) {
            if (!esPieza(l)) continue
            const c = await this.contenido(l.ItemCode, l.Quantity, 1)
            if (c.resina <= 0 && c.gelcoat <= 0) continue
            const d = sinTildes(l.ItemName || '')
            piezas.push({ pieza: /FALDON/.test(d) ? 'Faldón' : 'Bañera', estructura: l.ItemName || l.ItemCode, resinaKg: r2(c.resina), resinaTipo: c.tipo, gelcoatKg: r2(c.gelcoat) })
        }
        // Dos "Bañera" (o dos faldones) se numeran para no mezclarlas
        const vistos = new Map<string, number>()
        for (const p of piezas) { const n = (vistos.get(p.pieza) || 0) + 1; vistos.set(p.pieza, n); if (n > 1) p.pieza = `${p.pieza} ${n}` }
        return { descripcion: a.descripcion, piezas }
    }
}

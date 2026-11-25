import { supabase } from '@/lib/supabase'
import { fetchSAP, SAP_BASE_URL } from '@/lib/sap'

// Familia de fabricación de cada artículo (U_Familia en SAP: PC, FV, MBL, RTM…). Se guarda en sap_items_familia para
// no consultar SAP en cada carga de órdenes: solo se piden los artículos nuevos, de a 20 por consulta y una a la vez
// (en la misma sesión de SAP las consultas en paralelo se bloquean). Si SAP no responde, esos artículos quedan sin
// familia y no se clasifican como de Superficies (nunca se adivina).
export const FAMILIAS_SUPERFICIES = ['RTM', 'RTMM']

export async function familiasDeArticulos(skus: string[]): Promise<Map<string, string>> {
    const unicos = [...new Set(skus.map(s => String(s || '').trim()).filter(Boolean))]
    const familias = new Map<string, string>()
    if (unicos.length === 0) return familias

    // 1) Caché
    for (let i = 0; i < unicos.length; i += 300) {
        const { data, error } = await supabase.from('sap_items_familia').select('item_code, familia').in('item_code', unicos.slice(i, i + 300))
        if (error) {
            // Sin la tabla (falta superficies_rtm.sql) no se clasifica nada como Superficies
            console.warn('[familias] sin caché de familias:', error.message)
            return familias
        }
        for (const r of data || []) familias.set(String(r.item_code), String(r.familia || ''))
    }

    // 2) Artículos nuevos: SAP
    const faltan = unicos.filter(s => !familias.has(s))
    const nuevos: { item_code: string; familia: string; actualizado: string }[] = []
    for (let i = 0; i < faltan.length; i += 20) {
        const lote = faltan.slice(i, i + 20)
        try {
            const filtro = lote.map(s => `ItemCode eq '${s.replace(/'/g, "''")}'`).join(' or ')
            const res = await fetchSAP(`${SAP_BASE_URL}/Items?$select=ItemCode,U_Familia&$filter=${encodeURIComponent(filtro)}`,
                { method: 'GET', headers: { Prefer: 'odata.maxpagesize=50' } })
            if (!res.ok) { console.warn(`[familias] SAP no entregó la familia de ${lote.length} artículos (${res.status})`); continue }
            for (const it of (await res.json()).value || []) {
                const fam = String(it.U_Familia || '').trim()
                familias.set(String(it.ItemCode), fam)
                nuevos.push({ item_code: String(it.ItemCode), familia: fam, actualizado: new Date().toISOString() })
            }
        } catch (e) {
            console.warn('[familias] error consultando SAP:', e)
        }
    }
    if (nuevos.length) {
        const { error } = await supabase.from('sap_items_familia').upsert(nuevos, { onConflict: 'item_code' })
        if (error) console.warn('[familias] no se guardó la caché:', error.message)
    }
    return familias
}

export const esFamiliaSuperficies = (familia: string | undefined | null) => FAMILIAS_SUPERFICIES.includes(String(familia || '').trim().toUpperCase())

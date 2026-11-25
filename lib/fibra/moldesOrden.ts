import { Molde, OrdenFabricacion } from '@/types/pintura'

// Moldes para una orden FV (lo usan Pintura y el Mapa de procesos):
// coincide por SKU o serial del molde, por el código numérico del SKU (PMOL02-0087-… → serial "0087-xx")
// o porque la descripción del molde contiene todas las palabras de la descripción de la orden.
// NOTA FIBRA: No es restrictivo por estado para permitir seleccionar cualquier molde aunque no esté en 'Disponible'.
export function moldesDisponiblesOrden(orden: OrdenFabricacion, todos: Molde[]): Molde[] {
    return moldesDeOrden(orden, todos)
}

// Todos los moldes de la referencia de la orden, en cualquier estado (ordenando Disponibles primero)
export function moldesDeOrden(orden: OrdenFabricacion, todos: Molde[]): Molde[] {
    // Si la orden tiene tipo de molde (molde_id = tipos_moldes.id) y ese tipo tiene moldes, SOLO esos;
    // la comparación por SKU, serial y palabras queda de respaldo para referencias sin tipo asignado.
    const tipoOrden = Number((orden as any).molde_id) || null
    if (tipoOrden != null) {
        const delTipo = todos.filter(m => m.estado !== 'Destruido' && Number((m as any).tipo_molde_id) === tipoOrden && !moldeDeOtraReferencia(m))
        if (delTipo.length > 0) {
            return delTipo.sort((a, b) => (a.estado === 'Disponible' ? 0 : 1) - (b.estado === 'Disponible' ? 0 : 1) || a.vueltas_actuales - b.vueltas_actuales)
        }
    }
    const sku = (orden.molde_sku || orden.producto_sku || orden.sku || '').trim().toLowerCase()
    const targetDesc = (orden.molde_descripcion || orden.producto_descripcion || '').trim().toLowerCase()

    // Extract numeric code from PMOL02-0087-000-0000 -> "87"
    const codeMatch = sku.match(/PMOL\d*-(\d+)/i)
    const targetCode = codeMatch ? codeMatch[1].replace(/^0+/, '') : ''

    return todos
        .filter(m => {
            if (m.estado === 'Destruido') return false

            const mSku = (m.molde_sku || (m as any).tipo_molde_sku || '').trim().toLowerCase()
            const mSerial = (m.serial || '').trim().toLowerCase()
            const mDesc = (m.molde_descripcion || (m as any).nombre_articulo || '').trim().toLowerCase()

            // 1. Exact SKU / Serial match
            if (sku && (mSku === sku || mSerial === sku)) return true

            // 2. Serial code prefix match (e.g. "0087-10" matches targetCode "87" or "0087")
            if (targetCode) {
                const serialPrefix = mSerial.split('-')[0].replace(/^0+/, '')
                if (serialPrefix === targetCode) return true
            }

            // 3. Description keyword match (e.g. both contain "aqua 80x60" or "lavarropas aqua")
            if (targetDesc && mDesc) {
                const keywords = targetDesc
                    .replace(/molde|blanco|brillante|mate|con|flauta/gi, '')
                    .split(/\s+/)
                    .filter(w => w.length > 2)

                if (keywords.length > 0 && keywords.every(kw => mDesc.includes(kw))) {
                    return true
                }
            }

            return false
        })
        .sort((a, b) => {
            // Priorizar 'Disponible' primero por conveniencia visual, pero permitir todos
            if (a.estado === 'Disponible' && b.estado !== 'Disponible') return -1
            if (a.estado !== 'Disponible' && b.estado === 'Disponible') return 1
            return a.vueltas_actuales - b.vueltas_actuales
        })
}

// Nombre de molde normalizado (sin tildes, × → X, sin "MOLDE"/"MODELO"/acabado): para comparar el nombre del molde
// con el de su tipo de molde
const normNombre = (t: string | null | undefined) => String(t || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[×*]/g, 'X').replace(/\b(MOLDE|MODELO|BRILLANTE|MATE|SOFT|NUEVO)\b/g, ' ').replace(/\s*X\s*/g, 'X').replace(/\s+/g, ' ').trim()

// ¿El molde es de otra referencia? (caso tipo 474: moldes de Doha, Oslo, Versa y Santorini asignados a la Aqua 80x60)
// Se compara su nombre propio (nombre_articulo) con el de su tipo (molde_descripcion) de forma tolerante a errores
// de escritura ("MOLEPDLAVAPLATOS KOA 63X51" sigue siendo un Koa 63X51):
//  - si los dos tienen medida (63X51, 80X60…), es de otra referencia cuando ninguna medida coincide;
//  - si el molde no tiene medida, cuando ninguna de sus palabras (de 4 letras o más) aparece en el nombre del tipo.
// Los moldes sin nombre o "Molde Nuevo" no se descartan.
const medidas = (t: string) => (t.match(/[0-9]+(?:[.,][0-9]+)?X[0-9]+(?:[.,][0-9]+)?/g) || []) as string[]
export function moldeDeOtraReferencia(m: Molde): boolean {
    const propio = normNombre((m as any).nombre_articulo)
    const delTipo = normNombre(m.molde_descripcion)
    if (!propio || !delTipo || propio === delTipo) return false
    const mp = medidas(propio), mt = medidas(delTipo)
    if (mp.length && mt.length) return !mp.some(x => mt.includes(x))
    const palabras = propio.split(' ').filter(w => w.length > 3 && !/^[0-9]/.test(w))
    return palabras.length > 0 && !palabras.some(w => delTipo.includes(w))
}

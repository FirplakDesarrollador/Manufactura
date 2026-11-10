import { Molde, OrdenFabricacion } from '@/types/pintura'

// Moldes disponibles para una orden FV (lo usan Pintura y el Mapa de procesos):
// coincide por SKU o serial del molde, por el código numérico del SKU (PMOL02-0087-… → serial "0087-xx")
// o porque la descripción del molde contiene todas las palabras de la descripción de la orden.
export function moldesDisponiblesOrden(orden: OrdenFabricacion, todos: Molde[]): Molde[] {
    return moldesDeOrden(orden, todos).filter(m => m.estado === 'Disponible')
}

// Todos los moldes de la referencia de la orden, en cualquier estado (para ofrecer liberar uno ocupado)
export function moldesDeOrden(orden: OrdenFabricacion, todos: Molde[]): Molde[] {
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
        .sort((a, b) => a.vueltas_actuales - b.vueltas_actuales)
}

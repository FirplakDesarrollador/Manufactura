// Clasificación de la lista de materiales por la descripción del artículo (SAP no trae este grupo).
// La usan el detalle de la orden (Resumen Materiales por grupos) y el módulo Traslados.
// Mano de obra: mano de obra y todo lo que diga CIF.
// Materias primas pesadas: resinas, peróxido, gelcoat, cargas minerales, refuerzos de fibra, ceras y similares.
// Lo demás: accesorios y equipos.
export type GrupoMaterial = 'mp' | 'acc' | 'mo'

export const RE_MANO_OBRA = /\bMANO\s+(DE\s+)?OBRA\b|\bCIF\b/
export const RE_MATERIA_PESADA = new RegExp('\\b(' + [
    'RESINAS?', 'PEROXIDOS?', 'GEL\\s?COAT', 'GRANICALCIO', 'OMYA', 'CARBONATOS?', 'ROVING', 'WOVEN', 'WOVING',
    'CERAS?', 'ESTIRENO', 'CATALIZADOR', 'MEKP', 'COBALTO', 'ACELERANTE', 'PIGMENTOS?', 'PASTA\\s+PIGMENT\\w*',
    'MASILLA', 'TALCO', 'MICROESFERAS?', 'SILICE', 'ARENA', 'DESMOLDANTE', 'ALCOHOL\\s+POLIVINILICO', 'ACETONA',
    'MATT?', 'FIBRA\\s+(DE\\s+)?VIDRIO', 'TRIHIDRATO', 'ALUMINA', 'CARGA\\s+MINERAL'
].join('|') + ')\\b')

export const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()

export function grupoMaterial(descripcion: string): GrupoMaterial {
    const d = sinTildes(descripcion || '')
    if (RE_MANO_OBRA.test(d)) return 'mo'
    if (RE_MATERIA_PESADA.test(d)) return 'mp'
    return 'acc'
}

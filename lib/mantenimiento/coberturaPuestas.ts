import { supabase } from '@/lib/supabase';

// Cobertura de puestas a punto: cuántas hay por planta y proceso frente a las HDT vigentes (una por labor).
// Referencia: cada HDT vigente (labor) debería tener su puesta a punto.

export const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

// "VACIADO FV" → "vaciado", "ACABADO Y REPARACIÓN" → "acabado", "Ensayo e instalación faldón" → "ensayo"
export const claveProceso = (p: string | null | undefined) =>
    sinTildes(p || 'sin proceso').replace(/\b(fv|ms)\b/g, '').trim().split(/\s+/)[0] || 'sin proceso';

const titulo = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export type FilaCobertura = { clave: string; proceso: string; puestas: number; hdts: number; labores: string[] };
export type Cobertura = { planta: string; puestas: number; hdts: number; procesos: FilaCobertura[] };

export async function cargarCobertura(): Promise<Record<string, Cobertura>> {
    const [enc, hdt] = await Promise.all([
        supabase.from('puestas_a_punto_encabezado').select('planta, proceso, estado_puesta_a_punto'),
        supabase.from('hdts').select('planta, proceso, labor').eq('is_current', true)
    ]);
    if (enc.error) throw new Error(`No se pudieron leer las puestas a punto: ${enc.error.message}`);
    if (hdt.error) throw new Error(`No se pudieron leer las HDT: ${hdt.error.message}`);

    const res: Record<string, Cobertura> = {};
    const fila = (planta: string, proceso: string | null) => {
        const kp = sinTildes(planta || '');
        const c = (res[kp] ||= { planta, puestas: 0, hdts: 0, procesos: [] });
        const clave = claveProceso(proceso);
        let f = c.procesos.find(x => x.clave === clave);
        if (!f) { f = { clave, proceso: titulo(proceso || 'Sin proceso'), puestas: 0, hdts: 0, labores: [] }; c.procesos.push(f); }
        return { c, f };
    };
    for (const e of enc.data || []) {
        if (sinTildes(e.estado_puesta_a_punto || '') === 'eliminada') continue;
        const { c, f } = fila(e.planta, e.proceso);
        c.puestas++; f.puestas++;
    }
    for (const h of hdt.data || []) {
        const { c, f } = fila(h.planta, h.proceso);
        c.hdts++; f.hdts++;
        if (h.labor) f.labores.push(h.labor);
        f.proceso = titulo(h.proceso || f.proceso); // el nombre de la HDT es más limpio ("Vaciado" y no "VACIADO FV")
    }
    for (const c of Object.values(res)) c.procesos.sort((a, b) => (b.hdts - b.puestas) - (a.hdts - a.puestas) || a.proceso.localeCompare(b.proceso, 'es'));
    return res;
}

export const coberturaDe = (todas: Record<string, Cobertura>, planta: string): Cobertura =>
    todas[sinTildes(planta)] || { planta, puestas: 0, hdts: 0, procesos: [] };

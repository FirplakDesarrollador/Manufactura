import { supabase } from './supabaseClient';
import type { PlantaEnum } from '@/types';

// Mármol Sintético usa el mismo catálogo de defectos de Calidad MS (ms_defectos),
// así la ficha y el reporte de defectos hablan de los mismos defectos.
// Las demás plantas siguen con el catálogo propio de la ficha (cat_defectos).
const PLANTA_MS = 'Mármol Sintético';

export async function fetchDefectosPlanta(planta: PlantaEnum): Promise<string[]> {
  if (planta === PLANTA_MS) {
    const { data, error } = await supabase.from('ms_defectos').select('id, Defecto').order('id', { ascending: true });
    if (error) throw error;
    const nombres = (data || []).map((d: { Defecto: string | null }) => String(d.Defecto || '').trim()).filter(Boolean);
    return Array.from(new Set(nombres));
  }

  const { data, error } = await supabase
    .from('cat_defectos')
    .select('nombre_defecto')
    .eq('planta', planta)
    .order('posicion', { ascending: true });
  if (error) throw error;
  return (data || []).map((d: { nombre_defecto: string }) => d.nombre_defecto);
}

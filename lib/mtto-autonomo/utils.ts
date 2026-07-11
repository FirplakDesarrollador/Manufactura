import { supabase } from './supabase';

/**
 * Genera un consecutivo único para una nueva Puesta a Punto.
 * Formato: PP-[PROC]-[YEAR]-[MONTH]-[SEQ]
 * Ejemplo: PP-PUL-2026-05-001
 */
export async function generateConsecutivo(proceso: string, fecha?: Date): Promise<string> {
  const now = fecha || new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // 1. Obtener abreviación del proceso (ej: "PULIDO" -> "PUL")
  const processAbbr = proceso.trim().substring(0, 3).toUpperCase();
  
  const prefix = `PP-${processAbbr}-${year}-${month}`;
  
  // 2. Buscar el último consecutivo que empiece con este prefijo para este mes
  const { data, error } = await supabase
    .from('puestas_a_punto_encabezado')
    .select('consecutivo')
    .like('consecutivo', `${prefix}-%`)
    .order('consecutivo', { ascending: false })
    .limit(1);
    
  if (error) {
    console.error("Error fetching last consecutivo:", error);
    // Fallback simple si hay error, aunque lo ideal es que el insert falle si es null
    return `${prefix}-001`;
  }
  
  let nextSeq = 1;
  if (data && data.length > 0 && data[0]?.consecutivo) {
    const lastConsecutivo = data[0].consecutivo;
    const parts = lastConsecutivo.split('-');
    const lastSeqStr = parts[parts.length - 1];
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }
  
  const seqStr = String(nextSeq).padStart(2, '0'); // Usamos 2 o 3 dígitos? En el ejemplo vi 001, así que usaré 3.
  const seqStrFinal = String(nextSeq).padStart(3, '0');
  
  return `${prefix}-${seqStrFinal}`;
}

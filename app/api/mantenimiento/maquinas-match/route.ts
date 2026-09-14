import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET() {
  try {
    // 1. Fetch all preventivo plans
    const { data: preventivos, error: prevErr } = await supabase
      .from('mantenimiento_planes_preventivos')
      .select('*')
      .order('id', { ascending: true });

    if (prevErr) throw prevErr;

    // 2. Fetch all maquinas
    let allMaquinas: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('maquinas_equipos')
        .select('*')
        .range(from, from + step - 1)
        .order('id', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        allMaquinas = allRawConcat(allMaquinas, data);
        if (data.length < step) hasMore = false;
        else from += step;
      } else {
        hasMore = false;
      }
    }

    function allRawConcat(a: any[], b: any[]) {
      return a.concat(b);
    }

    // Compare and find matches
    const comparisons: any[] = [];
    const unmatchedPreventivos: any[] = [];
    const matchedPreventivos: any[] = [];

    preventivos?.forEach(p => {
      const pMaq = (p.maquina || '').trim();
      const pTitle = (p.titulo || '').trim();
      const pCode = (p.codigo || '').trim();
      const pPlant = (p.planta || '').trim();

      const normMaq = normalize(pMaq);
      const normTitle = normalize(pTitle);

      // Try exact code match inside title/code (e.g. C-0244, MSNPT, etc.)
      // Try exact name match
      let bestMatch: any = null;
      let matchType = 'none';

      for (const m of allMaquinas) {
        const mCode = (m.codigo_equipo || '').trim();
        const mName = (m.nombre_equipo || '').trim();
        const normMName = normalize(mName);
        const normMCode = normalize(mCode);

        // 1. Exact code match
        if (mCode && (normTitle.includes(normMCode) || normMaq.includes(normMCode) || pCode.includes(mCode))) {
          bestMatch = m;
          matchType = 'exact_code';
          break;
        }

        // 2. Exact name match
        if (normMaq === normMName || normTitle === normMName) {
          bestMatch = m;
          matchType = 'exact_name';
          break;
        }

        // 3. Partial substring match
        if (normMaq.length > 3 && (normMName.includes(normMaq) || normMaq.includes(normMName))) {
          bestMatch = m;
          matchType = 'partial_name';
        }
      }

      const item = {
        id: p.id,
        preventivo_codigo: p.codigo,
        preventivo_titulo: p.titulo,
        preventivo_maquina_actual: p.maquina,
        preventivo_planta: p.planta,
        matchType,
        matched_maquina: bestMatch ? {
          id: bestMatch.id,
          codigo_equipo: bestMatch.codigo_equipo,
          nombre_equipo: bestMatch.nombre_equipo,
          planta: bestMatch.planta,
          marca: bestMatch.marca,
          modelo: bestMatch.modelo
        } : null
      };

      comparisons.push(item);
      if (bestMatch) {
        matchedPreventivos.push(item);
      } else {
        unmatchedPreventivos.push(item);
      }
    });

    return NextResponse.json({
      totalPreventivos: preventivos?.length || 0,
      totalMaquinas: allMaquinas.length,
      matchedCount: matchedPreventivos.length,
      unmatchedCount: unmatchedPreventivos.length,
      matchedSamples: matchedPreventivos.slice(0, 10),
      unmatchedSamples: unmatchedPreventivos.slice(0, 15)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

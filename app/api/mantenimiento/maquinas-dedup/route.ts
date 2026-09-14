import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to calculate record completeness
function calculateScore(record: any): number {
  let score = 0;
  const fields = [
    'codigo_equipo', 'activo_fijo', 'tipo', 'estado', 'nombre_equipo',
    'nombre_alterno', 'marca', 'modelo', 'caracteristicas', 'fecha_compra',
    'proveedor_nombre', 'proveedor_contacto', 'proveedor_telefono', 'proveedor_email',
    'fecha_instalacion', 'valor_compra', 'valor_nuevo', 'planta', 'proceso',
    'clasificacion', 'criticidad', 'bodega', 'factura', 'fotos', 'planos',
    'manuales', 'estandares', 'notas'
  ];

  for (const f of fields) {
    if (record[f] !== null && record[f] !== undefined && record[f] !== '' && record[f] !== 0) {
      score += 1;
    }
  }

  // Extra points if it has photos, serial/codigo, or dates
  if (record.fotos) score += 3;
  if (record.codigo_equipo) score += 2;
  if (record.marca || record.modelo) score += 1;

  return score;
}

// Generate deduplication key for a machine
function getMachineKey(m: any): string {
  // If codigo_equipo exists and is not empty
  const code = (m.codigo_equipo || '').trim().toUpperCase();
  const name = (m.nombre_equipo || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const plant = (m.planta || '').trim().toUpperCase();
  const model = (m.modelo || '').trim().toUpperCase();
  const brand = (m.marca || '').trim().toUpperCase();

  // If code exists and is significant (e.g. "1332")
  if (code && code !== '-' && code !== 'N/A' && code !== '0') {
    return `CODE:${code}__PLANT:${plant}`;
  }

  // Otherwise by name + brand + model + plant
  return `NAME:${name}__BRAND:${brand}__MODEL:${model}__PLANT:${plant}`;
}

export async function GET() {
  try {
    // Fetch all records from maquinas_equipos
    // Since Supabase has a default limit of 1000, we should paginate if needed
    let allMachines: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('maquinas_equipos')
        .select('*')
        .range(from, from + step - 1)
        .order('id', { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (data && data.length > 0) {
        allMachines = allMachines.concat(data);
        if (data.length < step) {
          hasMore = false;
        } else {
          from += step;
        }
      } else {
        hasMore = false;
      }
    }

    const totalCount = allMachines.length;

    // Group by key
    const groups: { [key: string]: any[] } = {};
    allMachines.forEach(m => {
      const key = getMachineKey(m);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(m);
    });

    const uniqueCount = Object.keys(groups).length;
    const duplicatesToRemove = totalCount - uniqueCount;

    const sampleDuplicates: any[] = [];
    for (const [key, list] of Object.entries(groups)) {
      if (list.length > 1) {
        sampleDuplicates.push({
          key,
          count: list.length,
          codigo: list[0].codigo_equipo,
          nombre: list[0].nombre_equipo,
          planta: list[0].planta,
          ids: list.map(item => item.id)
        });
      }
    }

    return NextResponse.json({
      totalCount,
      uniqueCount,
      duplicatesToRemove,
      duplicateGroupsCount: sampleDuplicates.length,
      sampleDuplicates: sampleDuplicates.slice(0, 15)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    let allMachines: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('maquinas_equipos')
        .select('*')
        .range(from, from + step - 1)
        .order('id', { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (data && data.length > 0) {
        allMachines = allMachines.concat(data);
        if (data.length < step) {
          hasMore = false;
        } else {
          from += step;
        }
      } else {
        hasMore = false;
      }
    }

    const totalBefore = allMachines.length;

    // Group by key
    const groups: { [key: string]: any[] } = {};
    allMachines.forEach(m => {
      const key = getMachineKey(m);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(m);
    });

    const idsToDelete: number[] = [];
    const updatesToPerform: { id: number; data: any }[] = [];

    for (const [key, list] of Object.entries(groups)) {
      if (list.length === 1) continue;

      // Sort by completeness score descending, then by lowest ID
      list.sort((a, b) => {
        const scoreA = calculateScore(a);
        const scoreB = calculateScore(b);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.id - b.id;
      });

      const master = list[0];
      const duplicates = list.slice(1);

      // Merge any missing fields from duplicates into master
      const mergedFields: any = {};
      let hasMerges = false;

      const fieldsToCheck = [
        'codigo_equipo', 'activo_fijo', 'tipo', 'estado', 'nombre_equipo',
        'nombre_alterno', 'marca', 'modelo', 'caracteristicas', 'fecha_compra',
        'proveedor_nombre', 'proveedor_contacto', 'proveedor_telefono', 'proveedor_email',
        'fecha_instalacion', 'valor_compra', 'valor_nuevo', 'planta', 'proceso',
        'clasificacion', 'criticidad', 'bodega', 'factura', 'fotos', 'planos',
        'manuales', 'estandares', 'notas'
      ];

      for (const dup of duplicates) {
        idsToDelete.push(dup.id);

        for (const f of fieldsToCheck) {
          if (!master[f] && dup[f]) {
            master[f] = dup[f];
            mergedFields[f] = dup[f];
            hasMerges = true;
          }
        }
      }

      if (hasMerges) {
        updatesToPerform.push({ id: master.id, data: mergedFields });
      }
    }

    // Apply merges to masters
    for (const update of updatesToPerform) {
      await supabase
        .from('maquinas_equipos')
        .update(update.data)
        .eq('id', update.id);
    }

    // Delete duplicates in batches of 200
    const batchSize = 200;
    let deletedCount = 0;

    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batchIds = idsToDelete.slice(i, i + batchSize);
      const { error: deleteError } = await supabase
        .from('maquinas_equipos')
        .delete()
        .in('id', batchIds);

      if (deleteError) {
        console.error('Error deleting batch:', deleteError);
      } else {
        deletedCount += batchIds.length;
      }
    }

    const totalAfter = totalBefore - deletedCount;

    return NextResponse.json({
      success: true,
      totalBefore,
      deletedCount,
      totalAfter,
      uniqueMachinesCount: Object.keys(groups).length,
      updatesApplied: updatesToPerform.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

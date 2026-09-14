import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  const tenantId = process.env.SHAREPOINT_TENANT_ID;
  const clientId = process.env.SHAREPOINT_CLIENT_ID;
  const clientSecret = process.env.SHAREPOINT_CLIENT_SECRET;
  const siteId = process.env.SHAREPOINT_SITE_ID;
  const listId = process.env.SHAREPOINT_LIST_ID;
  const tecnicosListId = process.env.SHAREPOINT_LIST_TECNICOS_ID;

  if (!tenantId || !clientId || !clientSecret || !siteId || !listId || !tecnicosListId) {
    return NextResponse.json({ error: 'Faltan variables de entorno de SharePoint' }, { status: 500 });
  }

  const results: any = {
    tecnicosMigrados: 0,
    preventivosMigrados: 0,
    historicosMigrados: 0,
    errores: []
  };

  try {
    // 1. Obtener Token de Microsoft Graph
    const tokenResp = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        scope: 'https://graph.microsoft.com/.default',
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
      cache: 'no-store'
    });

    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) {
      return NextResponse.json({ error: 'Error autenticando con Graph API', tokenData }, { status: 401 });
    }
    const token = tokenData.access_token;

    // 2. Descargar datos de SharePoint
    const [itemsResp, tecnicosResp] = await Promise.all([
      fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields&$top=5000`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }),
      fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${tecnicosListId}/items?expand=fields&$top=5000`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      })
    ]);

    const itemsData = await itemsResp.json();
    const tecnicosData = await tecnicosResp.json();

    const s = (v: any) => v == null ? '' : String(v).trim();
    const num = (v: any, def = 0) => {
      const parsed = parseInt(String(v).replace(/[^0-9]/g, ''), 10);
      return isNaN(parsed) ? def : parsed;
    };

    // 3. Migrar Técnicos a Supabase
    if (tecnicosData.value && Array.isArray(tecnicosData.value)) {
      const tecnicosToInsert = tecnicosData.value.map((item: any, idx: number) => {
        const f = item.fields || {};
        const rawTurno = s(f.Turno).toUpperCase();
        let turno = 'General';
        if (rawTurno.includes('PRNP')) turno = 'PRNP';
        else if (rawTurno.includes('NP')) turno = 'NP';
        else if (rawTurno.includes('PR')) turno = 'PR';

        const parsedId = num(f.IDTEC) || num(item.id) || (idx + 1);
        return {
          id: parsedId,
          nombre: s(f.Title) || 'Técnico Sin Nombre',
          turno: turno,
          documento: s(f.Documento),
          capacidad_horas: 7.20,
          especialidad: 'Mecánico',
          activo: true
        };
      }).filter((t: any) => t.nombre && t.nombre !== 'Técnico Sin Nombre');

      // Deduplicar técnicos por id
      const uniqueTecsMap = new Map<number, any>();
      tecnicosToInsert.forEach((t: any) => {
        if (!uniqueTecsMap.has(t.id)) {
          uniqueTecsMap.set(t.id, t);
        }
      });
      const uniqueTecs = Array.from(uniqueTecsMap.values());

      if (uniqueTecs.length > 0) {
        const { data, error } = await supabase
          .from('mantenimiento_tecnicos')
          .upsert(uniqueTecs, { onConflict: 'id' })
          .select();

        if (error) {
          console.error('Error tecnicos:', error);
          results.errores.push({ paso: 'tecnicos', error: error.message, details: error.details, hint: error.hint, code: error.code });
        } else {
          results.tecnicosMigrados = data?.length || tecnicosToInsert.length;
        }
      }
    }

    // 4. Migrar Planes Preventivos Maestros (PMP)
    if (itemsData.value && Array.isArray(itemsData.value)) {
      const preventivosToInsert = itemsData.value.map((item: any, idx: number) => {
        const f = item.fields || {};
        const title = s(f.Title);
        const maquina = s(f.MAQUINA) || 'Equipo General';
        const planta = s(f.PLANTA) || 'Mármol Sintético';
        const duracion = num(f.TIEMPODEEJECUCION, 60);
        const frecuencia = num(f.FRECUENCIA, 15);
        const refFrecuencia = num(f.REFFRECUENCIA, 15);
        const tipoIntervencion = s(f.TIPODEINTERVENCION) || 'Mecánico';
        const detalle = s(f.DETALLEDELMANTENIMIENTO);
        
        // Parsear IDs de técnicos autorizados
        const rawTecs = s(f.IDTECS);
        const idTecs: number[] = rawTecs
          .split(/[,;\-\s]+/)
          .map(v => parseInt(v.trim(), 10))
          .filter(v => !isNaN(v) && v > 0);

        return {
          codigo: `MP-${idx + 1}`,
          titulo: title || `Mantenimiento ${maquina}`,
          maquina: maquina,
          planta: planta,
          duracion_minutos: duracion,
          tipo_intervencion: tipoIntervencion,
          turno_requerido: 'General',
          frecuencia_dias: frecuencia,
          ref_frecuencia: refFrecuencia,
          id_tecnicos_autorizados: idTecs,
          detalle_instrucciones: detalle,
          activo: true
        };
      }).filter((p: any) => p.titulo);

      if (preventivosToInsert.length > 0) {
        // Insertamos en lotes de 100
        for (let i = 0; i < preventivosToInsert.length; i += 100) {
          const chunk = preventivosToInsert.slice(i, i + 100);
          const { error } = await supabase
            .from('mantenimiento_planes_preventivos')
            .insert(chunk);

          if (error) {
            console.error('Error preventivos:', error);
            results.errores.push({ paso: 'preventivos_chunk_' + i, error: error.message, details: error.details, code: error.code });
          } else {
            results.preventivosMigrados += chunk.length;
          }
        }
      }
    }

    // 5. Migrar historial existente desde 'Mantenimientos ejecutados' si existe
    try {
      const { data: oldHistory, error: oldErr } = await supabase
        .from('Mantenimientos ejecutados')
        .select('*');

      if (!oldErr && oldHistory && oldHistory.length > 0) {
        const ordenesToInsert = oldHistory.map((h: any) => {
          let estado = 'Completado';
          const rawEst = s(h['ESTADO']).toLowerCase();
          if (rawEst.includes('pend')) estado = 'Pendiente';
          else if (rawEst.includes('incomp')) estado = 'Incompleto';
          else if (rawEst.includes('proc')) estado = 'En Proceso';

          return {
            tipo_orden: 'PREVENTIVO',
            titulo: s(h['Título']) || 'Mantenimiento Preventivo',
            maquina: 'Planta',
            planta: 'Mármol Sintético',
            tecnico_nombre: s(h['TECNICO']),
            estado: estado,
            fecha_apertura: h['FECHA DE APERTURA'] || null,
            fecha_cierre: h['FECHA DE CIERRE'] || null,
            comentarios_ejecucion: s(h['COMENTARIO DE EJECUCION']),
            created_at: h.created_at || new Date().toISOString()
          };
        });

        for (let i = 0; i < ordenesToInsert.length; i += 100) {
          const chunk = ordenesToInsert.slice(i, i + 100);
          const { error: insErr } = await supabase
            .from('mantenimiento_ordenes')
            .insert(chunk);

          if (insErr) {
            console.error('Error ordenes:', insErr);
            results.errores.push({ paso: 'ordenes_chunk_' + i, error: insErr.message, details: insErr.details, code: insErr.code });
          } else {
            results.historicosMigrados += chunk.length;
          }
        }
      }
    } catch (e: any) {
      console.warn('Nota: no se pudo leer la tabla vieja Mantenimientos ejecutados:', e.message);
    }

    return NextResponse.json({
      success: true,
      mensaje: '¡Migración de SharePoint a Supabase ejecutada con éxito!',
      results
    });
  } catch (err: any) {
    console.error('Error durante la migración:', err);
    return NextResponse.json({ error: err.message, results }, { status: 500 });
  }
}

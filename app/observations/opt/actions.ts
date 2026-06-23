'use server'

import { createClient } from '@/lib/supabase/server'

export async function createOPTObservation(formData: FormData) {
    const supabase = await createClient()

    const titulo = formData.get('titulo') as string
    const planta = formData.get('planta') as string
    const operario = formData.get('operario') as string
    const puesto = formData.get('puesto') as string
    const etiquetas = formData.get('etiquetas') as string
    const elementos_seguridad = formData.get('elementos_seguridad') === 'on'
    const puesto_ergonomia = formData.get('puesto_ergonomia') === 'on'
    const puesto_ordenado = formData.get('puesto_ordenado') === 'on'
    const cumple_hdt = formData.get('cumple_hdt') === 'on'
    const cumple_puesta_punto = formData.get('cumple_puesta_punto') === 'on'
    const cumple_5s = formData.get('cumple_5s') === 'on'
    const producto_conforme = formData.get('producto_conforme') === 'on'
    const herramientas_estado = formData.get('herramientas_estado') === 'on'
    const conoce_defectos = formData.get('conoce_defectos') === 'on'
    const conoce_indicadores = formData.get('conoce_indicadores') === 'on'
    const emociones = formData.get('emociones') as string
    const va_count = parseInt(formData.get('va_count') as string || '0')
    const nva_count = parseInt(formData.get('nva_count') as string || '0')
    const observaciones_va_nva = formData.get('observaciones_va_nva') as string
    const archivo = formData.get('archivo') as File
    const realizadoPor = formData.get('realizadoPor') as string

    // Potentially upload file to Supabase storage if a bucket is configured
    // For now, we'll just extract the reference

    const observacion_tipo = formData.get('observacion_tipo') as string
    const observaciones_ergonomia = formData.get('observaciones_ergonomia') as string
    const observaciones_orden_aseo = formData.get('observaciones_orden_aseo') as string
    const observaciones_5s = formData.get('observaciones_5s') as string
    const observaciones_herramientas = formData.get('observaciones_herramientas') as string
    const observaciones_indicadores = formData.get('observaciones_indicadores') as string // Changed from generales to match schema
    const observaciones_plan_control = formData.get('observaciones_plan_control') as string
    const observaciones_seguridad = formData.get('observaciones_seguridad') as string
    const observaciones_hdt = formData.get('observaciones_hdt') as string
    const observaciones_defectos = formData.get('observaciones_defectos') as string
    const observaciones_producto_conforme = formData.get('observaciones_producto_conforme') as string

    if (!titulo) {
        throw new Error('El título es requerido')
    }

    const { data: { user } } = await supabase.auth.getUser()

    // Fetch the maximum current ID to implement N+1 logic
    const { data: lastRecord, error: fetchError } = await supabase
        .from('OPT')
        .select('ID')
        .order('ID', { ascending: false, nullsFirst: false })
        .limit(1)
        .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching last ID:', fetchError)
        throw new Error('Error al generar el consecutivo ID')
    }

    const nextId = (lastRecord?.ID ? Number(lastRecord.ID) : 0) + 1

    // ==========================================
    // CÁLCULO DE CALIFICACIÓN DE LA OPT (0% a 100%)
    // ==========================================
    let score = 0;
    
    // 1. Datos Básicos (20%)
    const hasBasicData = titulo && planta && operario && puesto && (realizadoPor || user?.email);
    const scoreBasicData = hasBasicData ? 20 : 0;
    score += scoreBasicData;

    // 2. Llenado de Observaciones (30%)
    const textFields = [
        observaciones_ergonomia, observaciones_orden_aseo, observaciones_5s,
        observaciones_herramientas, observaciones_indicadores, observaciones_producto_conforme,
        observaciones_plan_control, observaciones_seguridad, observaciones_hdt,
        observaciones_defectos, observaciones_va_nva
    ];
    const filledFields = textFields.filter(t => t && t.trim().length > 0).length;
    // Si llena 4 o más, se gana los 30%. Si llena menos, proporcional.
    const scoreFilledObs = filledFields >= 4 ? 30 : Math.round((filledFields / 4) * 30);
    score += scoreFilledObs;

    // 3. Nivel de Detalle (20%)
    // Contamos longitud total de textos llenados
    const totalChars = textFields.reduce((acc, curr) => acc + (curr ? curr.trim().length : 0), 0);
    const avgChars = filledFields > 0 ? totalChars / filledFields : 0;
    // Pide un promedio mayor a 40 para el puntaje completo.
    let scoreDetailLevel = 0;
    if (avgChars >= 40) scoreDetailLevel = 20;
    else if (avgChars >= 15) scoreDetailLevel = 10;
    else scoreDetailLevel = 0;
    score += scoreDetailLevel;

    // 4. Congruencia de Hallazgos (15%)
    // Al menos un check en "falso" que tenga justificación en texto, o todo excelente
    let scoreCongruence = 0;
    const hasNegativeCheck = !elementos_seguridad || !puesto_ergonomia || !puesto_ordenado || 
                             !cumple_hdt || !cumple_puesta_punto || !cumple_5s || 
                             !producto_conforme || !herramientas_estado || !conoce_defectos || !conoce_indicadores;
    
    if (hasNegativeCheck && filledFields > 0) {
        scoreCongruence = 15; // Encontró algo malo y escribió observaciones
    } else if (!hasNegativeCheck && filledFields > 0) {
        scoreCongruence = 10; // Todo bien y explicó por qué
    } else if (!hasNegativeCheck && filledFields === 0) {
        scoreCongruence = 5; // Todo excelente pero sin comentarios
    }
    score += scoreCongruence;

    // 5. Análisis VA/NVA (15%)
    let scoreVANVA = 0;
    if ((va_count > 0 || nva_count > 0) && observaciones_va_nva && observaciones_va_nva.trim().length > 0) {
        scoreVANVA = 15; // Midió y justificó
    } else if (va_count > 0 || nva_count > 0) {
        scoreVANVA = 5; // Midió pero no justificó
    }
    score += scoreVANVA;
    // ==========================================

    const { error } = await supabase
        .from('OPT')
        .insert([
            {
                'ID': nextId,
                'Título': titulo,
                'Planta': planta,
                'Operario': operario,
                'Puesto': puesto,
                'Etiquetas': etiquetas,
                'Elementos de seguridad': elementos_seguridad,
                'Puesto con ergonomía': puesto_ergonomia,
                'Puesto ordenado y aseado': puesto_ordenado,
                'Cumple HDT': cumple_hdt,
                'Cumple puesta a punto / plan de control': cumple_puesta_punto,
                'Observaciones de ergonomía': observaciones_ergonomia,
                'Cumple 5S': cumple_5s,
                'Observaciones orden y aseo': observaciones_orden_aseo,
                'Observaciones 5S': observaciones_5s,
                'Observaciones herramientas': observaciones_herramientas,
                'Observaciones indicadores': observaciones_indicadores,
                'Observaciones producto conforme': observaciones_producto_conforme,
                'Observaciones plan control': observaciones_plan_control,
                'Observaciones seguridad': observaciones_seguridad,
                'Observaciones HDT': observaciones_hdt,
                'Observaciones defectos calidad': observaciones_defectos,
                'Producto conforme': producto_conforme,
                'Herramientas en buen estado': herramientas_estado,
                'Operario conoce los defectos de calidad': conoce_defectos,
                'Operario conoce sus indicadores': conoce_indicadores,
                'Observación lejana / cercana': observacion_tipo,
                'Emociones': emociones,
                'VA': va_count.toString(),
                'NVA': nva_count.toString(),
                'Observaciones VA/NVA': observaciones_va_nva,
                'Created': user?.email,
                'Modified': user?.email,
                'Create_at': new Date().toISOString(),
                'Created By': realizadoPor || user?.email || null,
                'Calificación': score
            }
        ])

    if (error) {
        console.error('Error inserting OPT:', error)
        return { success: false, error: error.message }
    }

    return { 
        success: true, 
        scoreData: {
            total: score,
            basicData: scoreBasicData,
            filledObs: scoreFilledObs,
            detailLevel: scoreDetailLevel,
            congruence: scoreCongruence,
            vaNva: scoreVANVA
        }
    }
}

export async function getAllOPTRecordsForStats() {
    const supabase = await createClient()

    // Solo traemos los campos necesarios para las estadísticas para ahorrar memoria
    const { data, error } = await supabase
        .from('OPT')
        .select(`
            ID, 
            Título, 
            Operario, 
            Puesto, 
            "Created By", 
            Create_at, 
            Planta,
            Calificación,
            "Elementos de seguridad",
            "Puesto con ergonomía",
            "Puesto ordenado y aseado",
            "Cumple HDT",
            "Cumple puesta a punto / plan de control",
            "Cumple 5S",
            "Producto conforme",
            "Herramientas en buen estado",
            "Operario conoce los defectos de calidad",
            "Operario conoce sus indicadores",
            "VA",
            "NVA"
        `)
        .order('ID', { ascending: false })

    if (error) {
        console.error('Error fetching all OPT records for stats:', error)
        throw new Error('Error al obtener los registros históricos para estadísticas')
    }

    return data || []
}


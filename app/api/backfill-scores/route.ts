import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    const supabase = await createClient()

    try {
        // Fetch all OPT records that need a score (or all of them to recount)
        const { data: records, error: fetchError } = await supabase
            .from('OPT')
            .select('*')
            // .is('Calificación', null) // Uncomment to only update nulls, but for now we'll do all just in case

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 })
        }

        if (!records || records.length === 0) {
            return NextResponse.json({ message: 'No records to process' })
        }

        let updatedCount = 0;

        // Process each record
        for (const record of records) {
            let score = 0;

            // 1. Datos Básicos (20%)
            const hasBasicData = record['Título'] && record['Planta'] && record['Operario'] && record['Puesto'] && record['Created By'];
            const scoreBasicData = hasBasicData ? 20 : 0;
            score += scoreBasicData;

            // 2. Llenado de Observaciones (30%)
            const textFields = [
                record['Observaciones de ergonomía'], record['Observaciones orden y aseo'], record['Observaciones 5S'],
                record['Observaciones herramientas'], record['Observaciones indicadores'], record['Observaciones producto conforme'],
                record['Observaciones plan control'], record['Observaciones seguridad'], record['Observaciones HDT'],
                record['Observaciones defectos calidad'], record['Observaciones VA/NVA']
            ];
            
            // Some records might use 'Observacion lejana / cercana' instead of VA/NVA observations if old, but we follow the new schema
            const filledFields = textFields.filter(t => t && String(t).trim().length > 0).length;
            const scoreFilledObs = filledFields >= 4 ? 30 : Math.round((filledFields / 4) * 30);
            score += scoreFilledObs;

            // 3. Nivel de Detalle (20%)
            const totalChars = textFields.reduce((acc, curr) => acc + (curr ? String(curr).trim().length : 0), 0);
            const avgChars = filledFields > 0 ? totalChars / filledFields : 0;
            let scoreDetailLevel = 0;
            if (avgChars >= 40) scoreDetailLevel = 20;
            else if (avgChars >= 15) scoreDetailLevel = 10;
            else scoreDetailLevel = 0;
            score += scoreDetailLevel;

            // 4. Congruencia de Hallazgos (15%)
            let scoreCongruence = 0;
            const hasNegativeCheck = !record['Elementos de seguridad'] || !record['Puesto con ergonomía'] || !record['Puesto ordenado y aseado'] || 
                                     !record['Cumple HDT'] || !record['Cumple puesta a punto / plan de control'] || !record['Cumple 5S'] || 
                                     !record['Producto conforme'] || !record['Herramientas en buen estado'] || !record['Operario conoce los defectos de calidad'] || !record['Operario conoce sus indicadores'];
            
            if (hasNegativeCheck && filledFields > 0) {
                scoreCongruence = 15;
            } else if (!hasNegativeCheck && filledFields > 0) {
                scoreCongruence = 10;
            } else if (!hasNegativeCheck && filledFields === 0) {
                scoreCongruence = 5;
            }
            score += scoreCongruence;

            // 5. Análisis VA/NVA (15%)
            let scoreVANVA = 0;
            // Parse numbers safely
            const va_count = parseInt(record['VA'] || '0');
            const nva_count = parseInt(record['NVA'] || '0');
            const hasVaNvaText = record['Observaciones VA/NVA'] && String(record['Observaciones VA/NVA']).trim().length > 0;

            if ((va_count > 0 || nva_count > 0) && hasVaNvaText) {
                scoreVANVA = 15;
            } else if (va_count > 0 || nva_count > 0) {
                scoreVANVA = 5;
            }
            score += scoreVANVA;

            // Validate Final Score
            const finalScore = Math.min(Math.max(score, 0), 100);

            // Update Database
            const { error: updateError } = await supabase
                .from('OPT')
                .update({ 'Calificación': finalScore })
                .eq('ID', record.ID || record.id) // Fallback for old records

            if (updateError) {
                console.error(`Failed to update record ${record.ID}:`, updateError.message);
            } else {
                updatedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully calculated and backfilled scores for ${updatedCount} out of ${records.length} total records.`
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}


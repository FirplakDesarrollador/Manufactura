import { createClient } from "@/lib/supabase/client";
import { EvaluacionHoraHora } from "@/lib/store";

const TABLE = "Hora_Hora";

// Map app model → DB columns
function toDbRow(ev: EvaluacionHoraHora) {
    return {
        id: ev.id,
        fecha: ev.fecha,
        turno: ev.turno || "",
        planta: ev.planta || "",
        linea: ev.linea || "",
        puesto: ev.puesto || "",
        supervisor: ev.supervisor || "",
        operario: ev.operario || "",
        creado_por: ev.creadoPor || "",
        creado_por_email: ev.creadoPorEmail || "",
        tiempo_ciclo_teorico: ev.tiempoCicloTeorico,
        tiempo_inicio: ev.tiempoInicio,
        tiempo_fin: ev.tiempoFin,
        tiempo_total: ev.tiempoTotal,
        ciclos_totales: Math.round(ev.ciclosTotales || 0),
        tiempo_promedio: ev.tiempoPromedio,
        piezas_teoricas: Math.round(ev.piezasTeoricas || 0),
        piezas_reales: Math.round(ev.piezasReales || 0),
        rendimiento: ev.rendimiento,
        piezas_totales_calidad: Math.round(ev.piezasTotalesCalidad || 0),
        piezas_buenas: Math.round(ev.piezasBuenas || 0),
        piezas_defectuosas: Math.round(ev.piezasDefectuosas || 0),
        calidad: ev.calidad,
        hdt_cumple: ev.hdtCumple,
        hdt_comentario: ev.hdtComentario || "",
        desperdicios: ev.desperdicios || [],
        comentario_general: ev.comentarioGeneral || "",
        firma_operario: ev.firmaOperario || "",
        estado_global: ev.estadoGlobal,
        ciclos: ev.ciclos || [],
    };
}

// Map DB row → app model
function fromDbRow(row: any): EvaluacionHoraHora {
    return {
        id: row.id,
        consecutivo: row.consecutivo,
        fecha: row.fecha,
        turno: row.turno,
        planta: row.planta,
        linea: row.linea,
        puesto: row.puesto,
        supervisor: row.supervisor,
        operario: row.operario,
        creadoPor: row.creado_por,
        creadoPorEmail: row.creado_por_email,
        tiempoCicloTeorico: Number(row.tiempo_ciclo_teorico),
        tiempoInicio: Number(row.tiempo_inicio),
        tiempoFin: row.tiempo_fin ? Number(row.tiempo_fin) : null,
        tiempoTotal: Number(row.tiempo_total),
        ciclosTotales: row.ciclos_totales,
        tiempoPromedio: Number(row.tiempo_promedio),
        piezasTeoricas: row.piezas_teoricas,
        piezasReales: row.piezas_reales,
        rendimiento: Number(row.rendimiento),
        piezasTotalesCalidad: row.piezas_totales_calidad,
        piezasBuenas: row.piezas_buenas,
        piezasDefectuosas: row.piezas_defectuosas,
        calidad: Number(row.calidad),
        hdtCumple: row.hdt_cumple,
        hdtComentario: row.hdt_comentario,
        desperdicios: row.desperdicios || [],
        comentarioGeneral: row.comentario_general,
        firmaOperario: row.firma_operario,
        estadoGlobal: row.estado_global,
        ciclos: row.ciclos || [],
    };
}

// ─── CRUD Operations ─────────────────────────────────────────────

export async function insertEvaluacion(ev: EvaluacionHoraHora) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from(TABLE)
        .insert(toDbRow(ev))
        .select("consecutivo")
        .single();
    if (error) throw error;
    return data?.consecutivo as number;
}

export async function fetchEvaluaciones(): Promise<EvaluacionHoraHora[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(fromDbRow);
}

export async function updateEvaluacion(ev: EvaluacionHoraHora) {
    const supabase = createClient();
    const { error } = await supabase
        .from(TABLE)
        .update(toDbRow(ev))
        .eq("id", ev.id);
    if (error) throw error;
}

export async function deleteEvaluacion(id: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq("id", id);
    if (error) throw error;
}

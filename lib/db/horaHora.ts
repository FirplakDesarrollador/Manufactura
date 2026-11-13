import { createClient } from "@/lib/supabase/client";
import { EvaluacionHoraHora } from "@/lib/store";

const TABLE = "Hora_Hora";

// Map app model → DB columns
function toDbRow(ev: EvaluacionHoraHora) {
    // Combine compromiso into comentario_general if present to preserve data in Supabase without schema errors
    const comentarioCompleto = ev.compromiso && ev.compromiso.trim() !== ""
        ? `${ev.comentarioGeneral || ""}\n\n[Compromiso / Retroalimentación]: ${ev.compromiso}`.trim()
        : (ev.comentarioGeneral || "");

    return {
        id: ev.id,
        fecha: ev.fecha,
        turno: ev.turno || "",
        planta: ev.planta || "",
        linea: ev.linea || "",
        puesto: ev.puesto || "",
        supervisor: ev.supervisor || "",
        operario: ev.operario || "",
        creado_por: ev.realizadoPor || ev.creadoPor || "",
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
        comentario_general: comentarioCompleto,
        firma_operario: ev.firmaOperario || "",
        estado_global: ev.estadoGlobal,
        ciclos: ev.ciclos || [],
    };
}

// Map DB row → app model
function fromDbRow(row: any): EvaluacionHoraHora {
    let comentarioGeneral = row.comentario_general || "";
    let compromiso = row.compromiso || row.retroalimentacion || "";

    // Parse compromise back if embedded in comentario_general
    if (comentarioGeneral.includes("\n\n[Compromiso / Retroalimentación]: ")) {
        const parts = comentarioGeneral.split("\n\n[Compromiso / Retroalimentación]: ");
        comentarioGeneral = parts[0];
        compromiso = parts[1] || "";
    } else if (comentarioGeneral.includes("[Compromiso / Retroalimentación]: ")) {
        const parts = comentarioGeneral.split("[Compromiso / Retroalimentación]: ");
        comentarioGeneral = parts[0].trim();
        compromiso = parts[1] || "";
    }

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
        realizadoPor: row.realizado_por || row.creado_por || "",
        compromiso: compromiso,
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
        comentarioGeneral: comentarioGeneral,
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
    // Por páginas: Supabase entrega máximo 1000 filas por consulta y los registros más viejos no aparecían
    const supabase = createClient();
    const PAGINA = 1000;
    const filas: any[] = [];
    for (let desde = 0; ; desde += PAGINA) {
        const { data, error } = await supabase
            .from(TABLE)
            .select("*")
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(desde, desde + PAGINA - 1);
        if (error) throw error;
        filas.push(...(data || []));
        if (!data || data.length < PAGINA) break;
    }
    return filas.map(fromDbRow);
}

// Libera espacio del equipo: borra de la copia local (historialHoraHora) los registros que ya están en la base.
// Antes se copiaba cada Hora a Hora con su firma y el almacenamiento del navegador se llenaba.
// Solo borra lo confirmado en la base; lo pendiente por subir se conserva.
export async function limpiarCopiasSubidas(): Promise<number> {
    let locales: { id?: string }[] = [];
    try { locales = JSON.parse(localStorage.getItem("historialHoraHora") || "[]"); } catch { return 0; }
    if (!Array.isArray(locales) || locales.length === 0) return 0;
    const ids = locales.map(l => l?.id).filter((x): x is string => !!x);
    const supabase = createClient();
    const enBase = new Set<string>();
    for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await supabase.from(TABLE).select("id").in("id", ids.slice(i, i + 200));
        if (error) throw error;
        (data || []).forEach((r: { id: string }) => enBase.add(r.id));
    }
    const pendientes = locales.filter(l => l?.id && !enBase.has(l.id));
    if (pendientes.length === locales.length) return 0;
    try { localStorage.setItem("historialHoraHora", JSON.stringify(pendientes)); } catch { /* sin acceso */ }
    return locales.length - pendientes.length;
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

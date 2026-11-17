import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Conexión del bot Grok "Agente_App_Manufactura" con el módulo Agente Manufactura.
// Toda llamada debe traer el encabezado  x-api-key: <AGENTE_API_KEY>  (variable de entorno del servidor; sin ella
// la ruta no funciona). Cada llamada cuenta como latido: la app muestra el bot "Conectado" si llamó hace menos de 5 min.
//   GET  /api/agente                       → preguntas pendientes [{ id, pregunta, usuario, creado_at }]
//   POST /api/agente { id, respuesta }     → deja la respuesta del bot; queda "en validación" hasta que un administrador la apruebe
//   POST /api/agente { ping: true }        → solo latido
export const dynamic = 'force-dynamic';

const AGENTE = 'grok';

function autorizado(request: Request) {
    const llave = process.env.AGENTE_API_KEY;
    if (!llave) return NextResponse.json({ error: 'Conexión no configurada: falta AGENTE_API_KEY en el servidor' }, { status: 503 });
    if (request.headers.get('x-api-key') !== llave) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    return null;
}

async function latido(detalle: string) {
    await supabase.from('agente_estado').upsert({ agente: AGENTE, nombre: 'Agente_App_Manufactura (Grok)', ultimo_contacto: new Date().toISOString(), detalle }, { onConflict: 'agente' });
}

export async function GET(request: Request) {
    const no = autorizado(request); if (no) return no;
    await latido('Consultó preguntas pendientes');
    const { data, error } = await supabase.from('agente_mensajes')
        .select('id, pregunta, usuario_email, creado_at').eq('estado', 'pendiente').order('creado_at').limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ pendientes: (data || []).map(m => ({ id: m.id, pregunta: m.pregunta, usuario: m.usuario_email, creado_at: m.creado_at })) });
}

export async function POST(request: Request) {
    const no = autorizado(request); if (no) return no;
    const body = await request.json().catch(() => ({}));
    if (body?.ping) { await latido('Latido'); return NextResponse.json({ ok: true }); }
    const id = Number(body?.id), respuesta = String(body?.respuesta || '').trim();
    if (!id || !respuesta) return NextResponse.json({ error: 'Envíe { id, respuesta }' }, { status: 400 });
    if (respuesta.length > 8000) return NextResponse.json({ error: 'Respuesta demasiado larga (máx. 8000 caracteres)' }, { status: 400 });
    await latido(`Respondió la pregunta ${id}`);
    const { data, error } = await supabase.from('agente_mensajes')
        .update({ respuesta_agente: respuesta, respondido_at: new Date().toISOString(), estado: 'en_validacion' })
        .eq('id', id).eq('estado', 'pendiente').select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) return NextResponse.json({ error: 'La pregunta no existe o ya fue respondida' }, { status: 409 });
    return NextResponse.json({ ok: true, estado: 'en_validacion' });
}

import { supabase } from '@/lib/supabase';

// Hoja de vida de una máquina o equipo: se arma en una ventana nueva y se abre la impresión
// del navegador para guardarla en PDF (mismo método de los demás formatos imprimibles de la app).

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const txt = (v: unknown, vacio = '—') => {
  const s = String(v ?? '').trim();
  return s ? esc(s) : vacio;
};

const fecha = (v: unknown) => {
  const s = String(v ?? '').trim();
  if (!s) return '—';
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  return isNaN(d.getTime()) ? esc(s) : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const cop = (v: unknown) => {
  const n = Number(v);
  return v === null || v === undefined || v === '' || isNaN(n) ? '—' : n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
};

const tabla = (encabezados: string[], filas: string[][], vacio: string) =>
  filas.length === 0
    ? `<p class="vacio">${esc(vacio)}</p>`
    : `<table><thead><tr>${encabezados.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
       <tbody>${filas.map(f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

const ejecutado = (item: any) => {
  const est = String(item['ESTADO'] || item.estado || '').toLowerCase();
  return est.includes('completad') || est.includes('resuelt') || est.includes('cerrad') || est.includes('ejecutad') || !!(item['FECHA DE CIERRE'] || item.fecha_cierre);
};

interface DatosHojaDeVida {
  maquina: any;
  codigoPlanta: string;
  rutinasPmp: any[];
  intervenciones: any[];
}

// Auditorías OPT de Mantenimiento Autónomo: guardan el id de la máquina en responses.MAQUINA_ID
export async function cargarAuditoriasOptMa(maquina: any) {
  if (maquina?.id === undefined || maquina?.id === null) return [];
  const { data, error } = await supabase
    .from('opt_registros')
    .select('*')
    .eq('modulo_tipo', 'MA')
    .eq('responses->MAQUINA_ID->>value', String(maquina.id));
  if (error) throw new Error(`No se pudieron consultar las auditorías OPT de mantenimiento autónomo: ${error.message}`);
  return (data || []).sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

export async function cargarPuestasAPunto(maquina: any) {
  const nombre = String(maquina.nombre_equipo || '').trim();
  if (!nombre) return [] as { encabezado: any; actividades: any[] }[];
  const { data: detalle, error } = await supabase
    .from('puestas_a_punto_detalle')
    .select('id_puesta_a_punto, numero_item, equipo_herramienta, punto_a_revisar, criticidad, frecuencia, fecha_revision, resultado, validado_por')
    .ilike('equipo_herramienta', nombre.replace(/[%_\\]/g, '\\$&'));
  if (error) throw new Error(`No se pudieron consultar las puestas a punto: ${error.message}`);
  const ids = [...new Set((detalle || []).map(d => d.id_puesta_a_punto))];
  if (ids.length === 0) return [];
  const { data: encs, error: errEnc } = await supabase
    .from('puestas_a_punto_encabezado')
    .select('id_puesta_a_punto, consecutivo, nombre_puesta_a_punto, proceso, planta, version_formato, estado_puesta_a_punto')
    .in('id_puesta_a_punto', ids);
  if (errEnc) throw new Error(`No se pudieron consultar las puestas a punto: ${errEnc.message}`);
  return (encs || []).map(e => ({
    encabezado: e,
    actividades: (detalle || [])
      .filter(d => d.id_puesta_a_punto === e.id_puesta_a_punto)
      .sort((a, b) => Number(a.numero_item || 0) - Number(b.numero_item || 0))
  }));
}

export async function cargarTarjetasTpm(maquina: any) {
  const codigo = String(maquina.codigo_equipo || '').trim();
  const nombre = String(maquina.nombre_equipo || '').trim();
  const filtros: string[] = [];
  // Caracteres que rompen el filtro or() de Supabase
  const limpio = (s: string) => s.replace(/[%_,()"\\]/g, ' ').trim();
  if (codigo && codigo.length >= 2) filtros.push(`codigo_maquina.eq.${limpio(codigo)}`);
  if (nombre) filtros.push(`maquina.ilike.${limpio(nombre)}`);
  if (filtros.length === 0) return [];
  const { data, error } = await supabase
    .from('tarjetas_falla_anomalia')
    .select('codigo_tarjeta, tipo_tarjeta, tipo_aviso, prioridad, fecha_apertura, fecha_cierre, estado, descripcion_que, accion_inmediata, accion_correctiva, observaciones, detectada_por, cerrada_por, responsable')
    .or(filtros.join(','))
    .order('fecha_apertura', { ascending: false });
  if (error) throw new Error(`No se pudieron consultar las tarjetas de mantenimiento autónomo: ${error.message}`);
  return data || [];
}

function construirHtml({ maquina, codigoPlanta, rutinasPmp, intervenciones }: DatosHojaDeVida, puestas: Awaited<ReturnType<typeof cargarPuestasAPunto>>, tarjetas: any[], auditorias: any[]) {
  const m = maquina;
  const foto = String(m.fotos || '').split(',').map((s: string) => s.trim()).find((u: string) => u && !/\.(pdf|docx?)($|\?)/i.test(u));
  const campo = (label: string, valor: string) => `<div class="campo"><span>${esc(label)}</span><strong>${valor}</strong></div>`;

  const ejecutados = intervenciones
    .filter(ejecutado)
    .sort((a, b) => new Date(b['FECHA DE CIERRE'] || b.sourceDate || 0).getTime() - new Date(a['FECHA DE CIERRE'] || a.sourceDate || 0).getTime());

  // Programados sin ejecutar: del más próximo al más lejano
  const pendientes = intervenciones
    .filter(i => !ejecutado(i))
    .sort((a, b) => new Date(a.sourceDate || a['FECHA DE APERTURA'] || 0).getTime() - new Date(b.sourceDate || b['FECHA DE APERTURA'] || 0).getTime());
  const hoyCorte = new Date(); hoyCorte.setHours(0, 0, 0, 0);
  const vencido = (i: any) => {
    const d = new Date(String(i['FECHA DE APERTURA'] || i.fecha_apertura || i.sourceDate || '').slice(0, 10) + 'T00:00:00');
    return !isNaN(d.getTime()) && d < hoyCorte;
  };

  const hoy = new Date().toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Hoja de vida ${esc(m.codigo_equipo || '')} - ${esc(m.nombre_equipo || '')}</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
  @page { size: letter; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Montserrat, Arial, sans-serif; color: #1f2937; font-size: 10px; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #324354; padding-bottom: 8px; margin-bottom: 10px; }
  header img { height: 34px; }
  header h1 { margin: 0; font-size: 16px; font-weight: 900; color: #324354; letter-spacing: 2px; text-transform: uppercase; text-align: right; }
  header p { margin: 2px 0 0; font-size: 9px; color: #6b7280; text-align: right; }
  .titulo { display: flex; gap: 12px; margin-bottom: 10px; }
  .titulo .foto { width: 150px; height: 150px; border: 1px solid #e2ded5; border-radius: 8px; object-fit: contain; background: #F6F3EE; flex-shrink: 0; }
  .titulo h2 { margin: 0 0 4px; font-size: 15px; font-weight: 900; color: #324354; }
  .chips span { display: inline-block; background: #F6F3EE; border: 1px solid #e2ded5; border-radius: 4px; padding: 1px 6px; margin: 0 4px 4px 0; font-weight: 700; font-size: 9px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
  .campo { border: 1px solid #e2ded5; border-radius: 6px; padding: 4px 6px; background: #fff; }
  .campo span { display: block; font-size: 7.5px; font-weight: 700; color: #7B8E90; text-transform: uppercase; }
  .campo strong { font-size: 9.5px; color: #324354; word-break: break-word; }
  h3 { background: #324354; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; padding: 4px 8px; border-radius: 4px; margin: 14px 0 6px; break-after: avoid; }
  h4 { font-size: 10px; color: #324354; margin: 8px 0 4px; }
  .texto { border: 1px solid #e2ded5; border-radius: 6px; padding: 6px 8px; white-space: pre-wrap; background: #fff; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
  th { background: #F6F3EE; color: #324354; text-align: left; padding: 4px; border: 1px solid #e2ded5; font-weight: 700; }
  td { padding: 3px 4px; border: 1px solid #e2ded5; vertical-align: top; word-break: break-word; }
  tr { break-inside: avoid; }
  .vacio { color: #6b7280; font-style: italic; margin: 2px 0; }
  .nota { font-size: 8px; color: #6b7280; margin-top: 2px; }
  footer { margin-top: 16px; border-top: 1px solid #e2ded5; padding-top: 4px; font-size: 8px; color: #6b7280; text-align: center; }
</style></head><body>
<header>
  <img src="${location.origin}/firplak-logo-dark.png" alt="FIRPLAK" onerror="this.style.display='none'">
  <div><h1>Hoja de vida del equipo</h1><p>Gestor de Mantenimiento · Generado el ${esc(hoy)}</p></div>
</header>

<div class="titulo">
  ${foto ? `<img class="foto" src="${esc(foto)}" alt="">` : ''}
  <div style="flex:1">
    <h2>${txt(m.nombre_equipo)}</h2>
    <div class="chips">
      <span>Código: ${txt(m.codigo_equipo)}</span>
      ${m.activo_fijo ? `<span>Activo fijo: ${esc(m.activo_fijo)}</span>` : ''}
      <span>Planta: ${txt(codigoPlanta || m.planta)}</span>
      ${m.proceso ? `<span>Proceso: ${esc(m.proceso)}</span>` : ''}
    </div>
    ${m.nombre_alterno ? `<p class="nota">Nombre alterno: ${esc(m.nombre_alterno)}</p>` : ''}
    <div class="grid" style="margin-top:6px">
      ${campo('Marca', txt(m.marca))}
      ${campo('Modelo', txt(m.modelo))}
      ${campo('Tipo', txt(m.tipo))}
      ${campo('Criticidad', txt(m.criticidad))}
      ${campo('Estado', txt(m.estado))}
      ${campo('Ubicación / Bodega', txt(m.bodega))}
      ${campo('Clasificación', m.clasificacion ? `Clase ${esc(m.clasificacion)}` : '—')}
      ${campo('Planta (registro)', txt(m.planta))}
    </div>
  </div>
</div>

<h3>Especificaciones y características técnicas</h3>
<div class="texto">${txt(m.caracteristicas, 'Sin especificaciones registradas.')}</div>

<h3>Compra y proveedor</h3>
<div class="grid">
  ${campo('Fecha de compra', fecha(m.fecha_compra))}
  ${campo('Fecha de instalación', fecha(m.fecha_instalacion))}
  ${campo('Valor de compra', cop(m.valor_compra))}
  ${campo('Valor de reposición', cop(m.valor_nuevo))}
  ${campo('Factura', txt(m.factura))}
  ${campo('Proveedor', txt(m.proveedor_nombre))}
  ${campo('Contacto', txt(m.proveedor_contacto))}
  ${campo('Teléfono', txt(m.proveedor_telefono))}
  ${campo('Email', txt(m.proveedor_email))}
</div>

<h3>Documentación y notas</h3>
<div class="grid">
  ${campo('Planos técnicos', txt(m.planos))}
  ${campo('Manuales', txt(m.manuales))}
  ${campo('Estándares', txt(m.estandares))}
</div>
<div class="texto" style="margin-top:5px">${txt(m.notas, 'Sin notas registradas.')}</div>

<h3>Rutinas de mantenimiento preventivo (PMP) · ${rutinasPmp.length}</h3>
${tabla(['Código', 'Rutina', 'Detalle / instrucciones', 'Frecuencia', 'Duración', 'Turno', 'Estado'],
  rutinasPmp.map(p => [
    txt(p.code || p.csvId),
    `<b>${txt(p.title)}</b>`,
    txt(p.detalle),
    p.frecuencia ? `Cada ${esc(p.frecuencia)} días` : '—',
    p.durationMinutes ? `${esc(p.durationMinutes)} min` : '—',
    txt(p.tipoIntervencion),
    p.activo === false ? 'Inactiva' : 'Activa'
  ]),
  'No hay rutinas PMP vinculadas a este equipo.')}

<h3>Mantenimientos autónomos · 0</h3>
<p class="vacio">Este equipo no tiene rutinas de mantenimiento autónomo asignadas.</p>

<h3>Tarjetas TPM · ${tarjetas.length}</h3>
${tabla(['Tarjeta', 'Tipo', 'Apertura', 'Cierre', 'Qué se encontró', 'Acción', 'Detectó / Cerró', 'Estado'],
  tarjetas.map(t => [
    txt(t.codigo_tarjeta),
    txt([t.tipo_tarjeta, t.tipo_aviso].filter(Boolean).join(' · ')),
    fecha(t.fecha_apertura),
    fecha(t.fecha_cierre),
    txt(t.descripcion_que),
    txt([t.accion_inmediata, t.accion_correctiva, t.observaciones].filter(Boolean).join(' / ')),
    txt([t.detectada_por, t.cerrada_por || t.responsable].filter(Boolean).join(' / ')),
    txt(t.estado)
  ]),
  'No hay tarjetas de mantenimiento autónomo registradas para este equipo.')}

<h3>Auditorías OPT · Mantenimiento autónomo · ${auditorias.length}</h3>
${tabla(['Fecha', 'Persona evaluada', 'Auditor', 'Puesta a punto', 'Cumplimiento'],
  auditorias.map(a => [
    fecha(a.created_at),
    txt(a.persona_evaluada),
    txt(a.user_email),
    txt(a.responses?.CHECKLIST_ID?.comment),
    isNaN(Number(a.percentage)) ? '—' : `${Number(a.percentage).toFixed(0)}%`
  ]),
  'Este equipo no tiene auditorías OPT de mantenimiento autónomo.')}

<h3>Puestas a punto · ${puestas.length}</h3>
${puestas.length === 0 ? '<p class="vacio">Este equipo no está relacionado con ninguna puesta a punto.</p>' : puestas.map(({ encabezado: e, actividades }) => `
  <h4>${txt(e.consecutivo, 'PP')} · ${txt(e.nombre_puesta_a_punto || e.proceso)} <span class="nota">(V.${txt(e.version_formato, '1')} · Proceso: ${txt(e.proceso)} · Planta: ${txt(e.planta)} · ${txt(e.estado_puesta_a_punto, 'Abierta')})</span></h4>
  ${tabla(['#', 'Punto a revisar', 'Criticidad', 'Frecuencia', 'Última revisión', 'Resultado', 'Validado por'],
    actividades.map(a => [txt(a.numero_item), txt(a.punto_a_revisar), txt(a.criticidad), txt(a.frecuencia), fecha(a.fecha_revision), txt(a.resultado), txt(a.validado_por)]),
    'Sin actividades.')}`).join('')}

<h3>Mantenimientos programados sin ejecutar · ${pendientes.length}</h3>
${tabla(['Código', 'Tipo', 'Mantenimiento', 'Fecha programada', 'Situación', 'Técnico asignado', 'Estado', 'Observaciones'],
  pendientes.map(i => [
    txt(i.codigoDisplay || i.codigo),
    txt(i.category),
    txt(i['Título'] || i.titulo || i.sintoma),
    fecha(i['FECHA DE APERTURA'] || i.fecha_apertura || i.sourceDate),
    vencido(i) ? '<b style="color:#b91c1c">Atrasado</b>' : 'Por ejecutar',
    txt(i['TECNICO'] || i.tecnico_nombre || i.tecnico_asignado, 'Sin asignar'),
    txt(i['ESTADO'] || i.estado, 'Pendiente'),
    txt(i['COMENTARIO DE EJECUCION'] || i.observaciones)
  ]),
  'No hay mantenimientos programados pendientes para este equipo.')}

<h3>Historial de mantenimientos ejecutados · ${ejecutados.length}</h3>
${tabla(['Código', 'Tipo', 'Mantenimiento', 'Apertura', 'Ejecución / cierre', 'Ejecutó', 'Comentarios de ejecución'],
  ejecutados.map(i => [
    txt(i.codigoDisplay || i.codigo),
    txt(i.category),
    txt(i['Título'] || i.titulo || i.sintoma),
    fecha(i['FECHA DE APERTURA'] || i.fecha_apertura || i.sourceDate),
    fecha(i['FECHA DE CIERRE'] || i.fecha_cierre),
    txt(i['TECNICO'] || i.tecnico_nombre || i.tecnico_asignado),
    txt(i['COMENTARIO DE EJECUCION'] || i.accion_realizada || i.observaciones)
  ]),
  'No hay mantenimientos ejecutados registrados para este equipo.')}

<footer>FIRPLAK · Hoja de vida ${txt(m.codigo_equipo)} · ${txt(m.nombre_equipo)}</footer>
<script>
  window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 400); });
</script>
</body></html>`;
}

export async function descargarHojaDeVidaEquipo(datos: DatosHojaDeVida) {
  // La ventana se abre antes de las consultas para que el navegador no la bloquee
  const ventana = window.open('', '_blank');
  if (!ventana) {
    alert('El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para localhost y vuelve a intentarlo.');
    return;
  }
  ventana.document.write('<p style="font-family:Arial;padding:24px">Generando hoja de vida del equipo…</p>');
  try {
    const [puestas, tarjetas, auditorias] = await Promise.all([
      cargarPuestasAPunto(datos.maquina),
      cargarTarjetasTpm(datos.maquina),
      cargarAuditoriasOptMa(datos.maquina)
    ]);
    ventana.document.open();
    ventana.document.write(construirHtml(datos, puestas, tarjetas, auditorias));
    ventana.document.close();
  } catch (err: any) {
    ventana.document.open();
    ventana.document.write(`<p style="font-family:Arial;padding:24px;color:#b91c1c;font-weight:bold">No se pudo generar la hoja de vida: ${esc(err?.message || err)}</p>`);
    ventana.document.close();
  }
}

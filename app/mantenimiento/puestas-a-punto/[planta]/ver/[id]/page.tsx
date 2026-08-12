import { supabase } from '@/lib/supabase';
import React from 'react';
import Link from 'next/link';
import { PrintActions } from '@/components/mtto-autonomo/PrintActions';
import BackButton from '@/components/mtto-autonomo/BackButton';

export const revalidate = 0;

interface TaskItem {
  equipo: string;
  revisar: string;
  criticidad: string;
  frecuencia: string;
  dias: Record<string, string>;
}

export default async function PuestaDetallePage({ params }: { params: Promise<{ planta: string, id: string }> }) {
  const resolvedParams = await params;
  const { planta, id } = resolvedParams;
  const decodedPlanta = decodeURIComponent(planta);

  const { data: enc, error: encError } = await supabase
    .from('puestas_a_punto_encabezado').select('*').eq('id_puesta_a_punto', id).single();
  const { data: det } = await supabase
    .from('puestas_a_punto_detalle').select('*').eq('id_puesta_a_punto', id);

  // Consultar si existen otras versiones
  let tieneHistorial = false;
  if (enc) {
    const { count } = await supabase
      .from('puestas_a_punto_encabezado')
      .select('*', { count: 'exact', head: true })
      .eq('proceso', enc.proceso)
      .eq('planta', enc.planta);
    tieneHistorial = (count || 0) > 1;
  }

  if (!enc) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#1A435B' }}>
        <h2>No se encontraron datos</h2>
        <p style={{ margin: '1rem 0', color: '#667A85' }}>{encError?.message}</p>
        <Link href={`/mantenimiento/puestas-a-punto/${planta}`} style={{ padding: '0.8rem 1.5rem', backgroundColor: '#1A435B', color: 'white', textDecoration: 'none', borderRadius: '8px' }}>
          Regresar
        </Link>
      </div>
    );
  }

  // ── Procesar datos ───────────────────────────────────────
  const groupedTasks: Record<string, TaskItem> = {};
  (det || []).forEach(row => {
    const eq  = (row.equipo_herramienta as string) || 'Generales';
    const rev = (row.punto_a_revisar   as string) || 'Sin especificar';
    const key = `${eq}|||${rev}`;
    if (!groupedTasks[key]) {
      groupedTasks[key] = { 
        equipo: eq, 
        revisar: rev, 
        criticidad: (row.criticidad as string) || 'Media', 
        frecuencia: (row.frecuencia as string) || 'Diaria',
        dias: {} 
      };
    }
    if (row.fecha_revision) {
      const part = (row.fecha_revision as string).split('-')[2];
      if (part) groupedTasks[key].dias[String(parseInt(part, 10))] = row.resultado as string;
    }
  });

  const items = Object.values(groupedTasks).sort((a, b) => a.equipo.localeCompare(b.equipo));

  // Calcular rowspans
  const rowSpans: number[] = new Array(items.length).fill(0) as number[];
  let cur: string | null = null;
  let si = 0;
  for (let i = 0; i < items.length; i++) {
    const eq = items[i]?.equipo ?? '';
    if (eq !== cur) { rowSpans[i] = 1; cur = eq; si = i; }
    else            { rowSpans[si] = (rowSpans[si] ?? 0) + 1; rowSpans[i] = 0; }
  }

  const clean = (v: any) => (!v || String(v).toUpperCase() === 'PENDIENTE' || String(v).toUpperCase() === 'N/A') ? '' : String(v);
  const nombre = enc.nombre_puesta_a_punto || enc.proceso || 'Puesta A Punto';
  const fecha  = enc.creado_en ? (enc.creado_en as string).split('T')[0] : new Date().toISOString().split('T')[0];

  // Colores criticidad
  const critColor = (c: string) => c === 'Alta' ? '#FDF0F0' : c === 'Media' ? '#FFF9EB' : '#EEF7F2';
  const critText  = (c: string) => c === 'Alta' ? '#D13438' : c === 'Media' ? '#B37D00' : '#105B3A';

  const thBase: React.CSSProperties = {
    border: '1px solid rgba(255,255,255,0.15)',
    backgroundColor: '#1A435B',
    color: 'white',
    fontWeight: 700,
    textAlign: 'center',
  };

  return (
    <div style={{ width: '95%', maxWidth: '1600px', margin: '0 auto', paddingBottom: '3rem' }}>

      <style dangerouslySetInnerHTML={{ __html: `
        .print-only { display: none; }
        @media print {
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            box-sizing: border-box !important; 
            transform: none !important; 
            transition: none !important; 
            box-shadow: none !important;
          }
          @page { 
            size: landscape; 
            margin: 0.5cm; 
          }
          html, body { 
            width: 100% !important; 
            height: auto !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background: #fff !important; 
            font-family: 'Helvetica', 'Arial', sans-serif !important; 
            overflow: visible !important; 
          }
          .screen-only, .no-print, header, footer, nav { display: none !important; }
          .print-only { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .hdt-container { width: 100% !important; color: #000 !important; background: #fff !important; }
          .hdt-table { width: 100% !important; border-collapse: collapse !important; border: 1.5pt solid #000 !important; table-layout: fixed !important; background: #fff !important; }
          .hdt-table td { border: 1pt solid #000 !important; padding: 3px 6px !important; vertical-align: middle !important; background: #fff !important; color: #000 !important; }
          .hdt-header-title { text-align: center !important; font-size: 11pt !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 0.3px !important; line-height: 1.2 !important; background: #fff !important; color: #000 !important; }
          .hdt-label { font-size: 6pt !important; font-weight: 800 !important; text-transform: uppercase !important; color: #333 !important; display: block !important; margin-bottom: 1px !important; line-height: 1 !important; }
          .hdt-value { font-size: 8.5pt !important; font-weight: 700 !important; color: #000 !important; display: block !important; line-height: 1.1 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
          .hdt-matrix-table { width: 100% !important; border-collapse: collapse !important; border: 1.5pt solid #000 !important; margin-top: -1pt !important; table-layout: fixed !important; page-break-inside: auto !important; }
          .hdt-matrix-table thead { display: table-header-group !important; }
          .hdt-matrix-table tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          .hdt-matrix-table th, .hdt-matrix-table td { border: 1pt solid #000 !important; padding: 2px 2px !important; text-align: center !important; font-size: 6.5pt !important; line-height: 1.1 !important; word-break: break-word !important; overflow-wrap: break-word !important; }
          .hdt-matrix-table th { background-color: #fff !important; font-weight: 800 !important; font-size: 6pt !important; color: #000 !important; }
          .pt-eq { font-size: 6.5pt !important; width: 14% !important; text-align: left !important; padding-left: 4px !important; font-weight: 700 !important; vertical-align: top !important; text-transform: uppercase !important; }
          .pt-rev { font-size: 6.5pt !important; width: 25% !important; text-align: left !important; padding-left: 4px !important; vertical-align: top !important; }
          .pt-frec { font-size: 6.5pt !important; width: 4% !important; text-align: center !important; font-weight: 700 !important; vertical-align: top !important; }
          .hdt-footer { margin-top: 6px !important; font-size: 6.5pt !important; text-align: center !important; font-style: italic !important; }
        }
      `}} />

      {/* VISTA DE PANTALLA */}
      <div className="screen-only">
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginBottom: '0.8rem', alignItems: 'center' }}>
          {tieneHistorial && (
            <Link href={`/mantenimiento/puestas-a-punto/${encodeURIComponent(planta)}/ver/${id}/historial`} style={{ padding: '0.5rem 1rem', backgroundColor: '#F8FAFB', color: '#1A435B', border: '1px solid #1A435B', borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
              📜 Historial
            </Link>
          )}
          <BackButton />
          <PrintActions />
        </div>

        <div style={{
          backgroundColor: '#1A435B', color: 'white', borderRadius: '12px', padding: '0.8rem 1.5rem', marginBottom: '1rem',
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800 }}>{nombre}</h2>
            <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: '15px', fontSize: '0.7rem' }}>V.{clean(enc.version_formato) || '1'}</span>
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div><span style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.7 }}>RESP.</span><br/><strong style={{ fontSize: '0.85rem' }}>{clean(enc.responsable) || '—'}</strong></div>
            <div><span style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.7 }}>SUP.</span><br/><strong style={{ fontSize: '0.85rem' }}>{clean(enc.supervisor) || '—'}</strong></div>
            <div><span style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.7 }}>FECHA</span><br/><strong style={{ fontSize: '0.85rem' }}>{fecha}</strong></div>
          </div>
        </div>

        <div style={{ borderRadius: '12px', border: '1px solid #E2E8EA', overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thBase, padding: '12px', width: '200px', textAlign: 'left' }}>EQUIPO</th>
                <th style={{ ...thBase, padding: '12px', textAlign: 'left' }}>PUNTO A REVISAR</th>
                <th style={{ ...thBase, padding: '12px', width: '130px' }}>FRECUENCIA</th>
                <th style={{ ...thBase, padding: '12px', width: '110px' }}>CRITICIDAD</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? 'white' : '#F9FBFC' }}>
                  {(rowSpans[idx] ?? 0) > 0 && (
                    <td rowSpan={rowSpans[idx] ?? 1} style={{ padding: '12px', fontWeight: 700, color: '#1A435B', borderRight: '1px solid #F1F5F9', verticalAlign: 'top' }}>{item.equipo}</td>
                  )}
                  <td style={{ padding: '12px', color: '#334155', fontSize: '0.9rem' }}>{item.revisar}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '0.85rem', color: '#475569' }}>{item.frecuencia}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ backgroundColor: critColor(item.criticidad), color: critText(item.criticidad), padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>{item.criticidad}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VISTA DE IMPRESIÓN */}
      <div className="print-only">
        <div className="hdt-container">
          <table className="hdt-table">
            <tbody>
              <tr>
                <td style={{ width: '18%', textAlign: 'center', padding: '4px' }} rowSpan={2}>
                  <img src="/logo_2.png" alt="FIRPLAK" style={{ maxHeight: '35px', maxWidth: '100%', filter: 'brightness(0)' }} />
                </td>
                <td className="hdt-header-title" rowSpan={2} style={{ width: '54%', padding: '4px 8px' }}>
                   {nombre.toUpperCase()}
                </td>
                <td style={{ width: '28%', padding: 0 }}>
                   <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                     <tbody>
                       <tr style={{ borderBottom: '1pt solid #000' }}><td style={{ border: 'none', padding: '2px 6px' }}><span className="hdt-label">CÓDIGO:</span><span className="hdt-value">SMA-{id.substring(0,6).toUpperCase()}</span></td></tr>
                       <tr style={{ borderBottom: '1pt solid #000' }}><td style={{ border: 'none', padding: '2px 6px' }}><span className="hdt-label">VERSIÓN:</span><span className="hdt-value">{clean(enc.version_formato) || '1'}</span></td></tr>
                       <tr><td style={{ border: 'none', padding: '2px 6px' }}><span className="hdt-label">FECHA:</span><span className="hdt-value">{fecha}</span></td></tr>
                     </tbody>
                   </table>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="hdt-table" style={{ marginTop: '-1pt' }}>
            <tbody>
              <tr>
                <td style={{ width: '25%' }}><div className="hdt-label">PLANTA</div><div className="hdt-value">{clean(enc.planta) || decodedPlanta}</div></td>
                <td style={{ width: '25%' }}><div className="hdt-label">PROCESO</div><div className="hdt-value">{clean(enc.proceso)}</div></td>
                <td style={{ width: '25%' }}><div className="hdt-label">RESPONSABLE</div><div className="hdt-value">{clean(enc.responsable) || '—'}</div></td>
                <td style={{ width: '25%' }}><div className="hdt-label">TURNO</div><div className="hdt-value">{enc.turno || '1'}</div></td>
              </tr>
              <tr>
                <td style={{ width: '25%' }}><div className="hdt-label">CREADO POR</div><div className="hdt-value">{clean(enc['Creado por']) || 'Jakeline Chaverra'}</div></td>
                <td style={{ width: '25%' }}><div className="hdt-label">MODIFICADO POR</div><div className="hdt-value">{clean(enc['Modificado por']) || 'N/A'}</div></td>
                <td style={{ width: '25%' }}><div className="hdt-label">SUPERVISOR</div><div className="hdt-value">{clean(enc.supervisor) || '—'}</div></td>
                <td style={{ width: '25%' }}><div className="hdt-label">ESTADO</div><div className="hdt-value">{clean(enc.estado_puesta_a_punto) || 'Abierta'}</div></td>
              </tr>
            </tbody>
          </table>

          <table className="hdt-matrix-table">
            <thead>
              <tr>
                <th className="pt-eq">EQUIPO / HERRAMIENTA</th>
                <th className="pt-rev">ACTIVIDAD A REVISAR</th>
                <th className="pt-frec">FREC.</th>
                {[...Array(31)].map((_, i) => (<th key={i} style={{ width: '1.83%' }}>{i + 1}</th>))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="pt-eq">{item.equipo}</td>
                  <td className="pt-rev">{item.revisar}</td>
                  <td className="pt-frec">{item.frecuencia ? item.frecuencia.charAt(0) : 'D'}</td>
                  {[...Array(31)].map((_, dia) => {
                    const v = item.dias[String(dia + 1)];
                    return (<td key={dia}>{v && v !== 'N/A' ? v.charAt(0).toUpperCase() : ''}</td>);
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="hdt-footer">Documento propiedad de FIRPLAK S.A. | {new Date().toLocaleDateString('es-CO')}</div>
        </div>
      </div>
    </div>
  );
}

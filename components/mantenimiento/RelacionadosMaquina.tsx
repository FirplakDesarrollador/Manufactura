'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardList, Tag } from 'lucide-react';
import { cargarAuditoriasOptMa, cargarTarjetasTpm } from '@/lib/mantenimiento/hojaDeVidaEquipo';

// Información de otros módulos ligada a la máquina: tarjetas TPM (falla / anomalía)
// y auditorías OPT de Mantenimiento Autónomo. Las mismas consultas alimentan la hoja de vida en PDF.
const fecha = (v: unknown) => {
  const s = String(v ?? '').trim();
  if (!s) return '—';
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function Encabezado({ icono, titulo, cantidad, cargando }: { icono: React.ReactNode; titulo: string; cantidad: number; cargando: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <h4 className="text-xs font-bold text-[#324354] uppercase tracking-wider flex items-center gap-1.5">
        {icono}
        <span>{titulo}</span>
      </h4>
      <span className="px-2.5 py-0.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-full text-xs font-bold">
        {cargando ? '...' : cantidad}
      </span>
    </div>
  );
}

const Vacio = ({ texto }: { texto: string }) => (
  <div className="p-4 bg-[#F6F3EE] rounded-xl text-center text-xs text-gray-500">{texto}</div>
);

const ErrorConsulta = ({ texto }: { texto: string }) => (
  <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-xs font-bold text-red-800 flex items-center gap-2">
    <AlertTriangle className="w-4 h-4 shrink-0" /> {texto}
  </div>
);

export default function RelacionadosMaquina({ maquina }: { maquina: any }) {
  const [tarjetas, setTarjetas] = useState<any[]>([]);
  const [auditorias, setAuditorias] = useState<any[]>([]);
  const [errTarjetas, setErrTarjetas] = useState<string | null>(null);
  const [errAuditorias, setErrAuditorias] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setErrTarjetas(null);
    setErrAuditorias(null);
    Promise.allSettled([cargarTarjetasTpm(maquina), cargarAuditoriasOptMa(maquina)]).then(([t, a]) => {
      if (!activo) return;
      if (t.status === 'fulfilled') setTarjetas(t.value); else { setTarjetas([]); setErrTarjetas(String(t.reason?.message || t.reason)); }
      if (a.status === 'fulfilled') setAuditorias(a.value); else { setAuditorias([]); setErrAuditorias(String(a.reason?.message || a.reason)); }
      setCargando(false);
    });
    return () => { activo = false; };
  }, [maquina?.id, maquina?.codigo_equipo, maquina?.nombre_equipo]);

  return (
    <>
      {/* Tarjetas TPM */}
      <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
        <Encabezado icono={<Tag className="w-4 h-4 text-[#7B8E90]" />} titulo="Tarjetas TPM (Falla / Anomalía)" cantidad={tarjetas.length} cargando={cargando} />
        {cargando ? <Vacio texto="Cargando tarjetas..." /> : errTarjetas ? <ErrorConsulta texto={errTarjetas} /> : tarjetas.length === 0 ? (
          <Vacio texto="Este equipo no tiene tarjetas TPM registradas." />
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto bg-white">
            {tarjetas.map((t, i) => (
              <div key={`${t.codigo_tarjeta || 'tpm'}_${i}`} className="p-3 flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 font-mono font-bold rounded text-[11px]">{t.codigo_tarjeta || 'TPM'}</span>
                  <span className="font-bold text-xs text-[#324354]">{t.descripcion_que || 'Sin descripción'}</span>
                  <span className="text-[10px] font-bold text-gray-500">{[t.tipo_tarjeta, t.tipo_aviso, t.prioridad].filter(Boolean).join(' · ')}</span>
                </div>
                <div className="text-[11px] text-gray-500">
                  Apertura: <strong>{fecha(t.fecha_apertura)}</strong>
                  {t.fecha_cierre && <> · Cierre: <strong>{fecha(t.fecha_cierre)}</strong></>}
                  {' · '}Detectó: <strong>{t.detectada_por || '—'}</strong>
                  {' · '}Estado: <strong>{t.estado || '—'}</strong>
                </div>
                {(t.accion_correctiva || t.accion_inmediata) && (
                  <p className="text-[10.5px] text-gray-600 italic">"{t.accion_correctiva || t.accion_inmediata}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auditorías OPT de Mantenimiento Autónomo */}
      <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
        <Encabezado icono={<ClipboardList className="w-4 h-4 text-[#7B8E90]" />} titulo="Auditorías OPT · Mantenimiento Autónomo" cantidad={auditorias.length} cargando={cargando} />
        {cargando ? <Vacio texto="Cargando auditorías..." /> : errAuditorias ? <ErrorConsulta texto={errAuditorias} /> : auditorias.length === 0 ? (
          <Vacio texto="Este equipo no tiene auditorías OPT de mantenimiento autónomo." />
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto bg-white">
            {auditorias.map((a, i) => {
              const pct = Number(a.percentage);
              return (
                <div key={a.id ?? i} className="p-3 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-gray-500 min-w-0">
                    <div className="font-bold text-xs text-[#324354]">{fecha(a.created_at)} · Evaluado: {a.persona_evaluada || '—'}</div>
                    Auditor: <strong>{a.user_email || '—'}</strong>
                    {a.responses?.CHECKLIST_ID?.comment && <> · Puesta a punto: <strong>{a.responses.CHECKLIST_ID.comment}</strong></>}
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black border shrink-0 bg-slate-50 text-[#324354] border-slate-200" title="Cumplimiento de la auditoría">
                    {isNaN(pct) ? '—' : `${pct.toFixed(0)}%`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

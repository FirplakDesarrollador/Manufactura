'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ControlVisualRotulo from '@/components/controles-visuales/ControlVisualRotulo';
import { ControlVisualPreview } from '@/components/controles-visuales/ControlVisualSheet';
import {
  CV_BASE_PATH,
  CV_TABLA,
  PX_POR_CM,
  type ControlVisual,
  esRotulo,
  rutaImprimirPliego,
  rutaPlanta,
  tamanoControl,
} from '@/lib/controles-visuales';

type Orientacion = 'landscape' | 'portrait';

const CARTA_CM = { ancho: 27.94, alto: 21.59 };
const MARGEN_CM = 1;
const SEPARACION_CM = 0.4;

// Neutraliza el layout de mantenimiento al imprimir; el tamaño de página se agrega aparte
const ESTILOS_IMPRESION = `
@media print {
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  .mtto-app { display: block !important; min-height: 0 !important; overflow: visible !important; background: #fff !important; }
  .mtto-app::before, .mtto-app::after { display: none !important; }
  .cv-no-print { display: none !important; }
  .cv-print-area { display: block !important; padding: 0 !important; background: #fff !important; min-height: 0 !important; }
  .cv-pliego { box-shadow: none !important; padding: 0 !important; width: auto !important; min-height: 0 !important; overflow: visible !important; max-width: none !important; }
}
`;

function ControlEnPliego({ c }: { c: ControlVisual }) {
  const { ancho, alto } = tamanoControl(c);
  if (esRotulo(c)) return <ControlVisualRotulo texto={c.texto_principal} anchoCm={ancho} altoCm={alto} />;
  return (
    <ControlVisualPreview
      ancho={ancho * PX_POR_CM}
      alto={alto * PX_POR_CM}
      sombra={false}
      textoPrincipal={c.texto_principal}
      datoDestacado={c.dato_destacado}
      textoSecundario={c.texto_secundario}
      icono={c.icono}
      area={c.area}
      codigo={c.codigo}
    />
  );
}

function ImprimirPliego() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ids = useMemo(() => (searchParams.get('ids') || '').split(',').filter(Boolean), [searchParams]);
  const [elegidos, setElegidos] = useState<ControlVisual[] | null>(null);
  const [disponibles, setDisponibles] = useState<ControlVisual[]>([]);
  const [copias, setCopias] = useState(1);
  const [orientacion, setOrientacion] = useState<Orientacion>('landscape');
  const [mensaje, setMensaje] = useState('Cargando controles...');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      if (ids.length === 0) {
        setMensaje('No se eligió ningún control para imprimir.');
        return;
      }
      const { data, error } = await supabase.from(CV_TABLA).select('*').in('id', ids);
      if (error || !data || data.length === 0) {
        setMensaje('No se encontraron los controles.');
        return;
      }
      // Respeta el orden en que se eligieron
      const porId = new Map((data as ControlVisual[]).map((c) => [c.id, c]));
      const lista = ids.map((id) => porId.get(id)).filter(Boolean) as ControlVisual[];
      setElegidos(lista);

      // Otros controles de la misma planta que se pueden agregar al pliego
      const { data: otros } = await supabase
        .from(CV_TABLA)
        .select('*')
        .eq('planta', lista[0].planta)
        .eq('activo', true)
        .eq('tipo', 'plantilla')
        .order('codigo');
      setDisponibles((otros || []) as ControlVisual[]);
    };
    init();
  }, [router, ids]);

  const cambiarIds = (nuevos: string[]) => router.replace(rutaImprimirPliego(nuevos));

  if (!elegidos) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center p-6 text-center text-[#324354]">
        <p>{mensaje}</p>
      </div>
    );
  }

  const repetidos = elegidos.flatMap((c) => Array.from({ length: copias }, (_, i) => ({ c, clave: `${c.id}-${i}` })));
  const planta = elegidos[0].planta;
  const hoja = orientacion === 'landscape' ? CARTA_CM : { ancho: CARTA_CM.alto, alto: CARTA_CM.ancho };
  const paraAgregar = disponibles.filter((d) => !ids.includes(d.id));

  return (
    <div className="cv-print-area min-h-screen bg-[#e9e5dd] p-6 flex flex-col items-center gap-4">
      <style>{ESTILOS_IMPRESION}</style>
      <style>{`@page { size: letter ${orientacion}; margin: ${MARGEN_CM}cm; }`}</style>

      <div className="cv-no-print flex w-full max-w-[1056px] flex-col gap-3 rounded-2xl bg-white p-4 text-sm text-[#324354]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            <strong>{elegidos.length} control{elegidos.length === 1 ? '' : 'es'}</strong> · {planta} · {repetidos.length} en total
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push(planta ? rutaPlanta(planta) : CV_BASE_PATH)}
              className="rounded-xl border border-[#324354] bg-white px-4 py-2 font-semibold"
            >
              Ir a la biblioteca
            </button>
            <button type="button" onClick={() => window.print()} className="rounded-xl bg-[#324354] px-4 py-2 font-semibold text-white">
              Imprimir / Guardar PDF
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            Copias de cada uno
            <input
              type="number"
              min={1}
              max={50}
              value={copias}
              onChange={(e) => setCopias(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
              className="w-16 rounded-lg border border-[#e2ded5] px-2 py-1.5"
            />
          </label>
          <label className="flex items-center gap-2">
            Hoja
            <select
              value={orientacion}
              onChange={(e) => setOrientacion(e.target.value as Orientacion)}
              className="rounded-lg border border-[#e2ded5] px-2 py-1.5"
            >
              <option value="landscape">Carta horizontal</option>
              <option value="portrait">Carta vertical</option>
            </select>
          </label>
          {paraAgregar.length > 0 && (
            <select
              value=""
              onChange={(e) => e.target.value && cambiarIds([...ids, e.target.value])}
              className="min-w-[240px] rounded-lg border border-[#e2ded5] px-2 py-1.5"
              aria-label="Agregar otro control al pliego"
            >
              <option value="">+ Agregar otro control de {planta}...</option>
              {paraAgregar.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.codigo} · {d.titulo} ({tamanoControl(d).ancho} x {tamanoControl(d).alto} cm)
                </option>
              ))}
            </select>
          )}
        </div>

        <ul className="flex flex-wrap gap-2">
          {elegidos.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-lg bg-[#F6F3EE] px-2 py-1 text-xs">
              <span className="font-semibold">{c.codigo}</span>
              <span>{tamanoControl(c).ancho} x {tamanoControl(c).alto} cm</span>
              {elegidos.length > 1 && (
                <button
                  type="button"
                  onClick={() => cambiarIds(ids.filter((id) => id !== c.id))}
                  className="font-bold text-red-700"
                  aria-label={`Quitar ${c.codigo} del pliego`}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>

        <p className="text-xs text-slate-500">
          En el diálogo deja tamaño Carta, la misma orientación y escala 100 % (Predeterminada) para que cada control salga con su medida real.
        </p>
      </div>

      {/* El pliego en pantalla tiene el tamaño de la hoja; al imprimir, el navegador reparte los controles en las páginas que hagan falta */}
      <div
        className="cv-pliego bg-white shadow-md"
        style={{ width: `${hoja.ancho}cm`, minHeight: `${hoja.alto}cm`, padding: `${MARGEN_CM}cm`, boxSizing: 'border-box', overflowX: 'auto', maxWidth: '100%' }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${SEPARACION_CM}cm`, alignItems: 'flex-start' }}>
          {repetidos.map(({ c, clave }) => (
            <ControlEnPliego key={clave} c={c} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ImprimirPliegoPage() {
  return (
    <Suspense fallback={null}>
      <ImprimirPliego />
    </Suspense>
  );
}

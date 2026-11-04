'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ControlVisualSheet, { HOJA_ALTO, HOJA_ANCHO } from '@/components/controles-visuales/ControlVisualSheet';
import {
  CV_BUCKET,
  CV_TABLA,
  type ControlVisual,
  esImagen,
  rutaImprimirPliego,
  rutaPlanta,
  vaEnPliego,
} from '@/lib/controles-visuales';

// La hoja mide exactamente una carta horizontal (1056 x 816 px); al imprimir se deja un margen
// de 0.25 in para la impresora y se reduce con zoom para que quepa completa en una sola página.
// El contenedor con scroll y el layout de mantenimiento se neutralizan: si no, el navegador
// imprime la hoja recortada y partida.
const ESTILOS_IMPRESION = `
@page { size: letter landscape; margin: 0.25in; }
@media print {
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  .mtto-app { display: block !important; min-height: 0 !important; overflow: visible !important; background: #fff !important; }
  .mtto-app::before, .mtto-app::after { display: none !important; }
  .cv-no-print { display: none !important; }
  .cv-print-area { display: block !important; padding: 0 !important; background: #fff !important; min-height: 0 !important; }
  .cv-print-scroll { overflow: visible !important; max-width: none !important; }
  .cv-hoja { box-shadow: none !important; zoom: 0.93; margin: 0 auto !important; break-inside: avoid; }
}
`;

export default function ImprimirControlPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [control, setControl] = useState<ControlVisual | null>(null);
  const [mensaje, setMensaje] = useState('Cargando control...');
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase.from(CV_TABLA).select('*').eq('id', params.id).single();
      if (error || !data) {
        setMensaje('No se encontró el control.');
        return;
      }
      const c = data as ControlVisual;

      // Rótulos y hojas de tamaño reducido se imprimen en el pliego, varios por página
      if (vaEnPliego(c)) {
        router.replace(rutaImprimirPliego([c.id]));
        return;
      }

      if (c.tipo === 'pdf') {
        if (!c.pdf_path) {
          setMensaje('Este control no tiene un archivo asociado.');
          return;
        }
        const { data: firmado, error: errUrl } = await supabase.storage.from(CV_BUCKET).createSignedUrl(c.pdf_path, 60 * 10);
        if (errUrl || !firmado) {
          setMensaje(`No se pudo abrir el archivo: ${errUrl?.message || 'error desconocido'}`);
          return;
        }
        if (esImagen(c)) {
          setImagenUrl(firmado.signedUrl);
          setControl(c);
          return;
        }
        // El visor de PDF del navegador tiene su propio botón de imprimir
        window.location.replace(firmado.signedUrl);
        return;
      }

      setControl(c);
    };
    init();
  }, [router, params.id]);

  // Abrir el diálogo de impresión cuando la fuente ya cargó
  useEffect(() => {
    if (!control) return;
    let cancelado = false;
    document.fonts.ready.then(() => {
      if (!cancelado) setTimeout(() => window.print(), 300);
    });
    return () => {
      cancelado = true;
    };
  }, [control]);

  if (!control) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center p-6 text-center text-[#324354]">
        <p>{mensaje}</p>
      </div>
    );
  }

  return (
    <div className="cv-print-area min-h-screen bg-[#e9e5dd] p-6 flex flex-col items-center gap-4">
      <style>{ESTILOS_IMPRESION}</style>

      <div className="cv-no-print flex w-full max-w-[1056px] flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#324354]">
          <strong>{control.codigo}</strong> · {control.planta} · v{control.version}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push(rutaPlanta(control.planta))}
            className="rounded-xl border border-[#324354] bg-white px-4 py-2 text-sm font-semibold text-[#324354]"
          >
            Ir a la biblioteca
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-[#324354] px-4 py-2 text-sm font-semibold text-white"
          >
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>
      <p className="cv-no-print text-xs text-slate-600">
        En el diálogo elige tamaño Carta, orientación Horizontal y activa &quot;Gráficos de fondo&quot; para que salgan los bloques negros.
      </p>

      <div className="cv-print-scroll" style={{ overflowX: 'auto', maxWidth: '100%' }}>
        {imagenUrl ? (
          <div className="cv-hoja" style={{ width: HOJA_ANCHO, height: HOJA_ALTO, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagenUrl} alt={control.titulo} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
        ) : (
          <ControlVisualSheet
            textoPrincipal={control.texto_principal}
            datoDestacado={control.dato_destacado}
            textoSecundario={control.texto_secundario}
            icono={control.icono}
            area={control.area}
            codigo={control.codigo}
          />
        )}
      </div>
    </div>
  );
}

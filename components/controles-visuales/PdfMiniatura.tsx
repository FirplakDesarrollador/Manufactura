'use client';

import { useEffect, useRef, useState } from 'react';

/** Miniatura de la primera página de un PDF, dibujada en el navegador con pdf.js. */
export default function PdfMiniatura({ url, ancho, alto }: { url: string; ancho: number; alto: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');

  useEffect(() => {
    // Sin URL todavía (se está firmando): se queda en "cargando"
    if (!url) return;
    let cancelado = false;
    let destruir: (() => void) | undefined;

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        const tarea = pdfjs.getDocument(url);
        destruir = () => tarea.destroy();
        const doc = await tarea.promise;
        const pagina = await doc.getPage(1);
        const base = pagina.getViewport({ scale: 1 });
        // Se dibuja al doble de resolución para que se vea nítida
        const escala = Math.min(ancho / base.width, alto / base.height) * 2;
        const viewport = pagina.getViewport({ scale: escala });
        const canvas = canvasRef.current;
        if (cancelado || !canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pagina.render({ canvas, viewport }).promise;
        if (!cancelado) setEstado('listo');
      } catch (err) {
        console.error('No se pudo previsualizar el PDF:', err);
        if (!cancelado) setEstado('error');
      }
    })();

    return () => {
      cancelado = true;
      destruir?.();
    };
  }, [url, ancho, alto]);

  return (
    <div style={{ width: ancho, height: alto }} className="relative flex items-center justify-center bg-white">
      <canvas
        ref={canvasRef}
        style={{ maxWidth: '100%', maxHeight: '100%', display: estado === 'listo' ? 'block' : 'none' }}
      />
      {estado !== 'listo' && (
        <div className="flex flex-col items-center gap-1 text-[#324354]">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" />
          </svg>
          <span className="text-[10px] font-semibold tracking-widest">{estado === 'cargando' ? 'CARGANDO...' : 'PDF'}</span>
        </div>
      )}
    </div>
  );
}

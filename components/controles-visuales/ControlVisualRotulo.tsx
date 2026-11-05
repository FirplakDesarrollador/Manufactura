'use client';

import { useLayoutEffect, useRef } from 'react';
import { PX_POR_CM, TAMANO_DEFECTO } from '@/lib/controles-visuales';

const FUENTE = "var(--font-montserrat), 'Montserrat', Arial, sans-serif";

interface RotuloProps {
  texto?: string | null;
  /** Tamaño real del recuadro en cm (por defecto 11.8 x 3.1 cm) */
  anchoCm?: number;
  altoCm?: number;
}

/**
 * Rótulo en blanco y negro: borde negro y texto en negrilla centrado. El recuadro toma el
 * tamaño pedido y la letra (siempre Montserrat) se ajusta sola para llenarlo sin salirse.
 */
export default function ControlVisualRotulo({
  texto,
  anchoCm = TAMANO_DEFECTO.rotulo.ancho,
  altoCm = TAMANO_DEFECTO.rotulo.alto,
}: RotuloProps) {
  const contenido = (texto || '').trim().toUpperCase();
  const cajaRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const caja = cajaRef.current;
    if (!caja) return;
    let cancelado = false;
    const ajustar = () => {
      if (cancelado) return;
      // Empieza en el 72 % del alto y baja hasta que el texto quepa en el recuadro
      let tamano = Math.floor(altoCm * PX_POR_CM * 0.72);
      caja.style.fontSize = `${tamano}px`;
      while (tamano > 6 && (caja.scrollHeight > caja.clientHeight || caja.scrollWidth > caja.clientWidth)) {
        tamano -= 1;
        caja.style.fontSize = `${tamano}px`;
      }
    };
    ajustar();
    // Volver a medir cuando Montserrat termine de cargar
    document.fonts?.ready.then(ajustar);
    return () => {
      cancelado = true;
    };
  }, [contenido, anchoCm, altoCm]);

  return (
    <div
      ref={cajaRef}
      className="cv-rotulo"
      style={{
        width: `${anchoCm}cm`,
        height: `${altoCm}cm`,
        boxSizing: 'border-box',
        border: '3px solid #000000',
        background: '#FFFFFF',
        color: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.1cm 0.3cm',
        overflow: 'hidden',
        textAlign: 'center',
        fontFamily: FUENTE,
        fontWeight: 800,
        lineHeight: 1.05,
        overflowWrap: 'normal',
        breakInside: 'avoid',
        flexShrink: 0,
      }}
    >
      {contenido}
    </div>
  );
}

/** Vista previa del rótulo reducida para que quepa en el ancho disponible de la pantalla. */
export function ControlVisualRotuloPreview({ ancho, ...props }: RotuloProps & { ancho: number }) {
  const anchoCm = props.anchoCm ?? TAMANO_DEFECTO.rotulo.ancho;
  const altoCm = props.altoCm ?? TAMANO_DEFECTO.rotulo.alto;
  const escala = Math.min(1, ancho / (anchoCm * PX_POR_CM));
  return (
    <div style={{ width: anchoCm * PX_POR_CM * escala, height: altoCm * PX_POR_CM * escala, overflow: 'hidden', position: 'relative' }}>
      <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
        <ControlVisualRotulo {...props} />
      </div>
    </div>
  );
}

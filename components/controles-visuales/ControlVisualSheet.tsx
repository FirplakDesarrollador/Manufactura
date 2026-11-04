'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { IconoControl } from '@/lib/controles-visuales';

/** Hoja carta horizontal: 11in x 8.5in = 1056 x 816 px a 96 dpi. */
export const HOJA_ANCHO = 1056;
export const HOJA_ALTO = 816;

export interface ControlVisualSheetProps {
  textoPrincipal?: string | null;
  datoDestacado?: string | null;
  textoSecundario?: string | null;
  icono?: IconoControl | string | null;
  area?: string | null;
  codigo?: string | null;
  /** Alto de diseño en px (a 1056 px de ancho); permite proporciones distintas a la carta */
  altoDiseno?: number;
}

const FUENTE = "var(--font-montserrat), 'Montserrat', Arial, sans-serif";
const NEGRO = '#000000';
const BLANCO = '#FFFFFF';

function tamanoPorLargo(texto: string, escalas: [number, number][], minimo: number): number {
  const largo = texto.trim().length;
  for (const [maxCaracteres, tamano] of escalas) {
    if (largo <= maxCaracteres) return tamano;
  }
  return minimo;
}

function LogoFirplak({ color = BLANCO }: { color?: string }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'baseline', fontFamily: FUENTE, fontSize: 38, fontWeight: 600, lineHeight: 1, color }}
      aria-label="FIRPLAK"
      role="img"
    >
      <span style={{ letterSpacing: 4 }}>FIRPL</span>
      <svg viewBox="0 0 100 100" style={{ width: 30, height: 27, marginRight: 4 }} aria-hidden="true">
        <polygon points="34,0 66,0 100,100 79,100 50,20 21,100 0,100" fill={color} />
        <polygon points="50,60 60,100 40,100" fill={color} />
      </svg>
      <span>K</span>
    </div>
  );
}

function IconoSvg({ icono, size }: { icono: string; size: number }) {
  const trazo = { fill: 'none', stroke: NEGRO, strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  let contenido: ReactNode = null;
  switch (icono) {
    case 'bascula':
      contenido = (
        <g {...trazo}>
          <path d="M14 20h36l8 36H6z" />
          <circle cx="32" cy="12" r="6" />
          <path d="M32 30v10" />
          <path d="M26 44a6 6 0 0 1 12 0" />
        </g>
      );
      break;
    case 'alerta':
      contenido = (
        <g {...trazo}>
          <path d="M32 6L60 56H4z" />
          <path d="M32 24v16" />
          <circle cx="32" cy="48" r="1.5" fill={NEGRO} />
        </g>
      );
      break;
    case 'casco':
      contenido = (
        <g {...trazo}>
          <path d="M6 46h52" />
          <path d="M12 46a20 20 0 0 1 40 0" />
          <path d="M26 27v-9h12v9" />
          <path d="M8 52h48" />
        </g>
      );
      break;
    case 'pare':
      contenido = (
        <g {...trazo}>
          <path d="M22 4h20l18 18v20L42 60H22L4 42V22z" />
          <path d="M20 32h24" />
        </g>
      );
      break;
    case 'check':
      contenido = (
        <g {...trazo}>
          <circle cx="32" cy="32" r="26" />
          <path d="M20 33l8 8 16-18" />
        </g>
      );
      break;
    default:
      return null;
  }
  return (
    <svg viewBox="0 0 64 64" style={{ width: size, height: size, flexShrink: 0 }} aria-hidden="true">
      {contenido}
    </svg>
  );
}

/** La hoja del control visual, en blanco y negro, según el manual de marca. */
export default function ControlVisualSheet({
  textoPrincipal,
  datoDestacado,
  textoSecundario,
  icono,
  area,
  codigo,
  altoDiseno = HOJA_ALTO,
}: ControlVisualSheetProps) {
  const principal = (textoPrincipal || '').toUpperCase();
  const destacado = (datoDestacado || '').toUpperCase();
  const secundario = (textoSecundario || '').toUpperCase();

  const tPrincipal = tamanoPorLargo(principal, [[12, 72], [20, 58], [32, 46], [48, 38]], 32);
  const tDestacado = tamanoPorLargo(destacado, [[4, 260], [6, 230], [8, 180], [12, 130], [18, 96]], 72);
  const tSecundario = tamanoPorLargo(secundario, [[40, 40], [70, 34], [110, 28]], 22);
  const tIcono = Math.round(tPrincipal * 1.05);

  const hoja: CSSProperties = {
    width: HOJA_ANCHO,
    height: altoDiseno,
    boxSizing: 'border-box',
    padding: 32,
    background: BLANCO,
    color: NEGRO,
    fontFamily: FUENTE,
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
  };

  return (
    <div style={hoja} className="cv-hoja">
      <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: `8px solid ${NEGRO}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: NEGRO, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '22px 40px' }}>
          <LogoFirplak />
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '24px 48px',
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          {principal && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {icono && icono !== 'ninguno' && <IconoSvg icono={icono} size={tIcono} />}
              <div style={{ fontSize: tPrincipal, fontWeight: 800, letterSpacing: 2, lineHeight: 1.05 }}>{principal}</div>
            </div>
          )}
          {!principal && icono && icono !== 'ninguno' && <IconoSvg icono={icono} size={96} />}

          {destacado && (
            <div style={{ fontSize: tDestacado, fontWeight: 800, letterSpacing: tDestacado > 150 ? -6 : -2, lineHeight: 0.95 }}>
              {destacado}
            </div>
          )}

          {secundario && (
            <div
              style={{
                background: NEGRO,
                color: BLANCO,
                padding: '20px 36px',
                marginTop: 12,
                fontSize: tSecundario,
                fontWeight: 700,
                letterSpacing: 1,
                lineHeight: 1.2,
                whiteSpace: 'pre-line',
                maxWidth: '100%',
              }}
            >
              {secundario}
            </div>
          )}
        </div>

        <div
          style={{
            borderTop: `4px solid ${NEGRO}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 40px',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 2,
          }}
        >
          <span>ÁREA: {area ? area.toUpperCase() : '______________________'}</span>
          {codigo && <span>{codigo}</span>}
        </div>
      </div>
    </div>
  );
}

/**
 * Hoja escalada a un tamaño dado (pantalla o pliego de impresión). Se escala todo junto,
 * así el logo y la tipografía conservan sus proporciones. Sin alto, usa la proporción carta.
 */
export function ControlVisualPreview({
  ancho,
  alto,
  sombra = true,
  ...props
}: Omit<ControlVisualSheetProps, 'altoDiseno'> & { ancho: number; alto?: number; sombra?: boolean }) {
  const escala = ancho / HOJA_ANCHO;
  const altoFinal = alto ?? HOJA_ALTO * escala;
  return (
    <div
      style={{
        width: ancho,
        height: altoFinal,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: sombra ? '0 4px 20px rgba(50,67,84,0.08)' : 'none',
        background: BLANCO,
        breakInside: 'avoid',
      }}
    >
      <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
        <ControlVisualSheet {...props} altoDiseno={altoFinal / escala} />
      </div>
    </div>
  );
}

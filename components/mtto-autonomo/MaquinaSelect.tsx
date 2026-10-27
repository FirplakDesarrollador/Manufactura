'use client';
import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import FotoCompleta from './FotoCompleta';

// Máquina del catálogo del Gestor de Mantenimiento (mantenimiento_maquinas_equipos)
export interface MaquinaCatalogo {
  id: number;
  codigo_equipo: string | null;
  nombre_equipo: string;
  planta: string | null;
  proceso: string | null;
  estado: string | null;
  fotos: string | null;
}

// El campo fotos puede venir como JSON array, lista separada por comas o una sola URL
export function primeraFoto(fotos: string | null | undefined): string | null {
  if (!fotos) return null;
  let lista: string[] = [];
  if (fotos.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(fotos);
      if (Array.isArray(parsed)) lista = parsed.filter(Boolean);
    } catch {}
  }
  if (lista.length === 0) lista = fotos.split(',').map(s => s.trim()).filter(Boolean);
  return lista.find(u => /^(https?:\/\/|\/|data:)/.test(u)) || null;
}

interface CatalogoState {
  maquinas: MaquinaCatalogo[];
  loading: boolean;
  error: string | null;
}

let catalogoCache: Promise<MaquinaCatalogo[]> | null = null;

async function fetchCatalogo(): Promise<MaquinaCatalogo[]> {
  const all: MaquinaCatalogo[] = [];
  const step = 1000;
  for (let from = 0; ; from += step) {
    const { data, error } = await supabase
      .from('mantenimiento_maquinas_equipos')
      .select('id, codigo_equipo, nombre_equipo, planta, proceso, estado, fotos')
      .order('nombre_equipo', { ascending: true })
      .range(from, from + step - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as MaquinaCatalogo[]));
    if (data.length < step) break;
  }
  return all;
}

// Carga el catálogo una sola vez por sesión y lo comparte entre todos los selectores
export function useMaquinasCatalogo(): CatalogoState {
  const [state, setState] = useState<CatalogoState>({ maquinas: [], loading: true, error: null });
  useEffect(() => {
    if (!catalogoCache) {
      catalogoCache = fetchCatalogo();
      catalogoCache.catch(() => { catalogoCache = null; });
    }
    let active = true;
    catalogoCache
      .then((list) => { if (active) setState({ maquinas: list, loading: false, error: null }); })
      .catch((err) => {
        console.error('Error cargando máquinas:', err);
        if (active) setState({ maquinas: [], loading: false, error: err?.message || 'Error desconocido' });
      });
    return () => { active = false; };
  }, []);
  return state;
}

const normalize = (s: string | null | undefined) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Devuelve la máquina cuyo nombre coincide exactamente, solo si es única en el catálogo
export function maquinaPorNombre<T extends { nombre_equipo: string }>(maquinas: T[], nombre: string): T | null {
  const n = normalize(nombre);
  const matches = maquinas.filter(m => normalize(m.nombre_equipo) === n);
  return matches.length === 1 ? matches[0]! : null;
}

interface MaquinaSelectProps {
  nombre: string;
  idMaquina: number | null;
  catalogo: CatalogoState;
  onChange: (val: { nombre: string; id_maquina: number | null }) => void;
  placeholder?: string;
}

// Campo de equipo como lista desplegable: se elige una máquina del catálogo del Gestor de
// Mantenimiento y su nombre queda fijo (no editable). Los equipos que no son máquinas
// (ej: "PERMISOS DE ALTURA") se agregan desde la misma lista como "equipo libre".
export default function MaquinaSelect({ nombre, idMaquina, catalogo, onChange, placeholder = 'Seleccione una máquina...' }: MaquinaSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [verFoto, setVerFoto] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { maquinas, loading, error } = catalogo;

  const seleccionada = useMemo(() => maquinas.find(m => m.id === idMaquina) || null, [maquinas, idMaquina]);

  // Items guardados sin id_maquina (columna aún no creada o datos antiguos): si el nombre
  // coincide exactamente con una sola máquina del catálogo, se relaciona automáticamente
  useEffect(() => {
    if (idMaquina || !nombre.trim() || maquinas.length === 0) return;
    const m = maquinaPorNombre(maquinas, nombre);
    if (m) onChange({ nombre: m.nombre_equipo, id_maquina: m.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idMaquina, nombre, maquinas]);

  // Todas las palabras buscadas deben aparecer en código, nombre, planta o proceso
  const filtradas = useMemo(() => {
    const palabras = normalize(busqueda).split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return maquinas.slice(0, 80);
    const res: MaquinaCatalogo[] = [];
    for (const m of maquinas) {
      const texto = normalize(`${m.codigo_equipo} ${m.nombre_equipo} ${m.planta} ${m.proceso}`);
      if (palabras.every(p => texto.includes(p))) {
        res.push(m);
        if (res.length >= 80) break;
      }
    }
    return res;
  }, [busqueda, maquinas]);

  const abrir = () => {
    // Arranca buscando por el nombre actual del equipo, para sugerir coincidencias
    setBusqueda(seleccionada ? '' : nombre);
    setIsOpen(true);
  };

  // El dropdown se pinta en un portal porque las tarjetas de la tabla tienen overflow hidden
  useLayoutEffect(() => {
    if (!isOpen) return;
    const update = () => wrapperRef.current && setRect(wrapperRef.current.getBoundingClientRect());
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const t = event.target as Node;
      if (wrapperRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fotoSeleccionada = primeraFoto(seleccionada?.fotos);
  const textoLibre = busqueda.trim();

  return (
    <div ref={wrapperRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
      {idMaquina ? (
        <>
          <div
            title="Nombre tomado del catálogo de máquinas (no editable)"
            style={{ width: '100%', border: '1px solid #105B3A', backgroundColor: '#F8FAFB', borderRadius: '12px', padding: '10px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#1A445B', userSelect: 'text' }}
          >
            {seleccionada?.nombre_equipo || nombre}
          </div>
          {fotoSeleccionada && (
            <img
              src={fotoSeleccionada} alt={seleccionada?.nombre_equipo || 'Máquina'} title="Ver foto completa"
              onClick={() => setVerFoto(true)}
              style={{ width: '100%', maxWidth: '140px', height: '90px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #E2E8F0', cursor: 'zoom-in' }}
            />
          )}
          {verFoto && fotoSeleccionada && (
            <FotoCompleta src={fotoSeleccionada} alt={seleccionada?.nombre_equipo || nombre} onClose={() => setVerFoto(false)} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#105B3A', backgroundColor: '#E7F5EE', borderRadius: '6px', padding: '3px 8px' }}>
              🔗 {seleccionada?.codigo_equipo || `ID ${idMaquina}`}
            </span>
            <button
              type="button" onClick={abrir} title="Cambiar máquina"
              style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1A445B', backgroundColor: 'white', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '2px 6px', cursor: 'pointer' }}
            >
              Cambiar
            </button>
          </div>
        </>
      ) : (
        <button
          type="button" onClick={abrir}
          style={{ width: '100%', minHeight: '46px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', border: '1px solid #CBD5E1', backgroundColor: 'white', borderRadius: '12px', padding: '10px 12px', fontSize: '0.85rem', fontWeight: nombre ? 700 : 500, color: nombre ? '#1A445B' : '#94A3B8', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
        >
          <span>{nombre || placeholder}</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▼</span>
        </button>
      )}
      {!idMaquina && nombre && (
        <span title="Equipo sin máquina del catálogo" style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8' }}>Equipo libre</span>
      )}

      {isOpen && rect && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 380), maxHeight: '340px', display: 'flex', flexDirection: 'column', backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 12px 30px rgba(0,0,0,0.2)', zIndex: 2000, overflow: 'hidden' }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid #F1F5F9' }}>
            <input
              type="text" autoFocus value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código, nombre, planta o proceso..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '0.85rem', color: '#1A445B', backgroundColor: '#F8FAFC' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '5px' }}>
            {loading ? (
              <div style={{ padding: '14px', fontSize: '0.8rem', color: '#94A3B8', textAlign: 'center' }}>Cargando máquinas...</div>
            ) : error ? (
              <div style={{ padding: '14px', fontSize: '0.8rem', color: '#D13438', textAlign: 'center' }}>No se pudo cargar el catálogo de máquinas: {error}</div>
            ) : maquinas.length === 0 ? (
              <div style={{ padding: '14px', fontSize: '0.8rem', color: '#D13438', textAlign: 'center' }}>El catálogo de máquinas llegó vacío. Verifique que la sesión esté iniciada.</div>
            ) : filtradas.length > 0 ? filtradas.map(m => {
              const foto = primeraFoto(m.fotos);
              return (
              <div
                key={m.id}
                onClick={() => { onChange({ nombre: m.nombre_equipo, id_maquina: m.id }); setIsOpen(false); }}
                style={{ padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: m.id === idMaquina ? '#F0F9FF' : 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = m.id === idMaquina ? '#F0F9FF' : 'transparent'}
              >
                {foto ? (
                  <img src={foto} alt="" loading="lazy" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>⚙️</div>
                )}
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1px 6px', flexShrink: 0 }}>{m.codigo_equipo || '—'}</span>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1A445B' }}>{m.nombre_equipo}</span>
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{[m.planta, m.proceso].filter(Boolean).join(' · ')}</span>
                </div>
                {m.estado && normalize(m.estado) !== 'activo' && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', flexShrink: 0 }}>{m.estado}</span>
                )}
              </div>
              );
            }) : (
              <div style={{ padding: '14px', fontSize: '0.8rem', color: '#94A3B8', textAlign: 'center' }}>
                No hay máquinas que coincidan con &quot;{busqueda}&quot;. Pruebe con otra palabra o el código.
              </div>
            )}
          </div>
          {textoLibre && (
            <div
              onClick={() => { onChange({ nombre: textoLibre.toUpperCase(), id_maquina: null }); setIsOpen(false); }}
              style={{ padding: '10px 14px', borderTop: '1px solid #F1F5F9', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: '#1A445B', backgroundColor: '#F8FAFC' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEF2F5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
            >
              ➕ Usar &quot;{textoLibre.toUpperCase()}&quot; como equipo libre (sin máquina)
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

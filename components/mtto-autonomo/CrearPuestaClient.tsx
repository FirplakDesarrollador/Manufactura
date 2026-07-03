'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { supabaseTalentoHumano as supabaseTH } from '@/lib/supabase_talento_humano';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import React from 'react';
import { generateConsecutivo } from '../lib/utils';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent as DragEndEventType } from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';

interface Item {
  id: string | number;
  label: string;
}

// COMPONENTE: SearchableSelect (Estilo Premium para Header)
function SearchableSelect({ label, options, value, onChange, placeholder, style }: { label: string; options: Item[]; value: string; onChange: (val: string) => void; placeholder: string; style?: React.CSSProperties; }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div ref={wrapperRef} style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', flex: 1, ...style }}>
      {label && <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '10px 14px', 
          borderRadius: '10px', 
          border: '1px solid rgba(255,255,255,0.15)', 
          backgroundColor: 'rgba(255,255,255,0.08)', 
          cursor: 'pointer', 
          fontSize: '0.9rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          color: 'white', 
          minHeight: '44px',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(4px)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.25)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)';
          }
        }}
      >
        <span style={{ opacity: value ? 1 : 0.5, fontWeight: value ? 600 : 400 }}>{value || placeholder}</span>
        <span style={{ fontSize: '0.7rem', opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>▼</span>
      </div>
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', marginTop: '8px', zIndex: 1000, boxShadow: '0 12px 30px rgba(0,0,0,0.2)', maxHeight: '280px', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'fadeInDown 0.2s ease-out' }}>
          <style>{`
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div style={{ padding: '10px', borderBottom: '1px solid #F1F5F9' }}>
            <input
              type="text" autoFocus placeholder="Filtrar opciones..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '0.9rem', color: '#1A445B', backgroundColor: '#F8FAFC', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '5px' }}>
            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
              <div 
                key={opt.id} 
                onClick={() => { onChange(opt.label); setIsOpen(false); setSearchTerm(''); }} 
                style={{ 
                  padding: '10px 14px', 
                  borderRadius: '6px',
                  cursor: 'pointer', 
                  fontSize: '0.9rem', 
                  color: '#1A445B', 
                  backgroundColor: value === opt.label ? '#F0F9FF' : 'transparent',
                  transition: 'background-color 0.2s ease',
                  fontWeight: value === opt.label ? 600 : 400
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = value === opt.label ? '#E0F2FE' : '#F8FAFC'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === opt.label ? '#F0F9FF' : 'transparent'}
              >
                {opt.label}
              </div>
            )) : <div style={{ padding: '20px', fontSize: '0.85rem', color: '#94A3B8', textAlign: 'center' }}>No existen resultados</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CrearPuestaClient({ planta: plantaUrl }: { planta: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorDb, setErrorDb] = useState<string | null>(null);

  const [empleados, setEmpleados] = useState<Item[]>([]);
  const [plantas, setPlantas] = useState<Item[]>([]);

  const [nombrePuesta, setNombrePuesta] = useState('PUESTA A PUNTO PULIDO');
  const [proceso, setProceso] = useState('PULIDO');
  const [plantaSeleccionada, setPlantaSeleccionada] = useState(decodeURIComponent(plantaUrl));
  const [responsables, setResponsables] = useState<string[]>(['']);
  const [supervisores, setSupervisores] = useState<string[]>(['']);
  const [version, setVersion] = useState('1');
  const [fechaCreacion, setFechaCreacion] = useState(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState('1');
  const [creadoPor, setCreadoPor] = useState('Jakeline Chaverra Soto');

  const [maquinas, setMaquinas] = useState<any[]>([
    { id: uuidv4(), nombre: '', puntos: [{ id: uuidv4(), revisar: '', criticidad: 'Media', frecuencia: 'Diaria' }] }
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    async function load() {
      const { data: emps } = await supabaseTH.from('empleados').select('id, nombreCompleto').eq('activo', true).order('nombreCompleto');
      if (emps) setEmpleados(emps.map(e => ({ id: e.id, label: e.nombreCompleto })));
      const { data: plats } = await supabaseTH.from('plantas').select('id, planta').order('planta');
      if (plats) setPlantas(plats.map(p => ({ id: p.id, label: p.planta })));
    }
    load();
  }, []);

  const addMaquina = () => setMaquinas([...maquinas, { id: uuidv4(), nombre: '', puntos: [{ id: uuidv4(), revisar: '', criticidad: 'Media', frecuencia: 'Cada turno' }] }]);
  const removeMaquina = (mId: string) => setMaquinas(maquinas.filter(m => m.id !== mId));
  const updateMaquinaName = (mId: string, val: string) => {
    setMaquinas(maquinas.map(m => m.id === mId ? { ...m, nombre: val } : m));
  };
  const addPunto = (mId: string) => {
    setMaquinas(maquinas.map(m => m.id === mId ? { ...m, puntos: [...m.puntos, { id: uuidv4(), revisar: '', criticidad: 'Media', frecuencia: 'Cada turno' }] } : m));
  };
  const removePunto = (mId: string, pId: string) => {
    const maquina = maquinas.find(m => m.id === mId);
    if (!maquina) return;
    if (maquina.puntos.length === 1) removeMaquina(mId);
    else {
      setMaquinas(maquinas.map(m => m.id === mId ? { ...m, puntos: m.puntos.filter((p: any) => p.id !== pId) } : m));
    }
  };
  const updatePunto = (mId: string, pId: string, field: string, val: any) => {
    setMaquinas(maquinas.map(m => m.id === mId ? {
      ...m,
      puntos: m.puntos.map((p: any) => p.id === pId ? { ...p, [field]: val } : p)
    } : m));
  };

  const handleDragEndMachine = (event: DragEndEventType) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMaquinas((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragEndPunto = (mId: string, event: DragEndEventType) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMaquinas((prevMaquinas) => prevMaquinas.map(m => {
        if (m.id === mId) {
          const oldIndex = m.puntos.findIndex((p: any) => p.id === active.id);
          const newIndex = m.puntos.findIndex((p: any) => p.id === over.id);
          return { ...m, puntos: arrayMove(m.puntos, oldIndex, newIndex) };
        }
        return m;
      }));
    }
  };

  const handleSubmit = async (e: any) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const dateObj = new Date(fechaCreacion + 'T12:00:00'); // Use mid-day to avoid TZ issues
      const conn = await generateConsecutivo(proceso, dateObj);

      const mesNum = dateObj.getMonth() + 1;
      const anioVal = dateObj.getFullYear();

      const { data: enc, error: err1 } = await supabase.from('puestas_a_punto_encabezado').insert([{
        consecutivo: conn,
        nombre_puesta_a_punto: nombrePuesta,
        proceso,
        planta: plantaSeleccionada,
        responsable: responsables.filter(r => r.trim() !== '').join(' / '),
        supervisor: supervisores.filter(s => s.trim() !== '').join(' / '),
        version_formato: version,
        mes: mesNum,
        anio: anioVal,
        turno: parseInt(turno, 10) || 1,
        creado_en: fechaCreacion,
        estado_puesta_a_punto: 'Abierta',
        'Creado por': creadoPor,
        'Modificado por': 'N/A'
      }]).select().single();
      if (err1) throw err1;

      const details: any[] = [];
      let counter = 1;
      maquinas.forEach(m => {
        m.puntos.forEach((p: any) => {
          if (m.nombre || p.revisar) {
            details.push({
              id_puesta_a_punto: enc.id_puesta_a_punto,
              numero_item: counter++,
              equipo_herramienta: m.nombre,
              punto_a_revisar: p.revisar,
              criticidad: p.criticidad,
              frecuencia: p.frecuencia,
              fecha_revision: fechaCreacion,
              resultado: 'N/A'
            });
          }
        });
      });

      if (details.length > 0) {
        const { error: err2 } = await supabase.from('puestas_a_punto_detalle').insert(details);
        if (err2) throw err2;
      }
      router.push(`/puestas-a-punto/${encodeURIComponent(plantaSeleccionada)}`);
    } catch (err: any) { setErrorDb(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ width: '98%', maxWidth: '1800px', margin: '0 auto', paddingBottom: '2.5rem' }}>

      {errorDb && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', padding: '1rem 1.5rem', borderRadius: '12px', backgroundColor: '#FDF0F0', color: '#D13438', border: '1px solid #D13438', zIndex: 10000 }}>
          ⚠️ {errorDb}
        </div>
      )}

      {/* Header Actions - Icon Based - Compact Margin */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginBottom: '0.6rem', alignItems: 'center' }}>
        <button
          onClick={() => router.back()}
          title="Cancelar"
          style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'white', color: '#586B77', border: '1px solid #D1D9E0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path></svg>
        </button>

        <button 
          onClick={handleSubmit} 
          disabled={loading} 
          title="Guardar"
          style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            backgroundColor: 'white', 
            color: '#1A445B', 
            border: 'none', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '1.2rem', 
            transition: 'all 0.2s',
            padding: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {loading ? '...' : '💾'}
        </button>
      </div>

      {/* Metadata Header */}
      <div style={{ 
        backgroundColor: '#1A445B', 
        color: 'white', 
        borderRadius: '20px', 
        padding: '0.8rem 1.2rem', 
        marginBottom: '1rem', 
        display: 'flex', 
        flexDirection: 'column',
        gap: '0.8rem',
        boxShadow: '0 12px 30px rgba(26,68,91,0.12)',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #27556C, #1A445B, #27556C)' }}></div>
        
        {/* Row 1: Title and Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <label style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>NOMBRE DEL FORMATO</label>
            <input 
              value={nombrePuesta} 
              onChange={(e) => setNombrePuesta(e.target.value)} 
              placeholder="Ej: Puesta a Punto..." 
              style={{ backgroundColor: 'transparent', border: 'none', borderBottom: '2px solid rgba(255,255,255,0.3)', color: 'white', fontSize: '1.2rem', fontWeight: 900, outline: 'none', width: '100%', padding: '1px 0', transition: 'border-bottom-color 0.3s ease' }} 
              onFocus={(e) => e.target.style.borderBottomColor = 'white'}
              onBlur={(e) => e.target.style.borderBottomColor = 'rgba(255,255,255,0.3)'}
            />
          </div>
          <div style={{ paddingLeft: '1.5rem', display: 'flex', alignItems: 'center' }}>
            <Image src="/logo_2.png" alt="Logo" width={90} height={28} style={{ objectFit: 'contain', opacity: 0.9, position: 'relative', zIndex: 1 }} />
          </div>
        </div>

        {/* Row 2: Main Selectors */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <SearchableSelect label="PLANTA" options={plantas} value={plantaSeleccionada} onChange={setPlantaSeleccionada} placeholder="Seleccione..." style={{ flex: '1 1 200px' }} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '120px' }}>
            <label style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>PROCESO</label>
            <input 
              value={proceso} 
              onChange={(e) => setProceso(e.target.value)} 
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 10px', color: 'white', fontSize: '0.8rem', outline: 'none', minHeight: '34px', fontWeight: 600 }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '80px' }}>
            <label style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>VERSIÓN</label>
            <input 
              value={version} 
              onChange={(e) => setVersion(e.target.value)} 
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 10px', color: 'white', fontSize: '0.8rem', outline: 'none', minHeight: '34px', textAlign: 'center', fontWeight: 600 }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '130px' }}>
            <label style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>FECHA CREACIÓN</label>
            <input 
              type="date" 
              value={fechaCreacion} 
              onChange={(e) => setFechaCreacion(e.target.value)} 
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 10px', color: 'white', fontSize: '0.8rem', outline: 'none', minHeight: '34px', cursor: 'pointer' }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '70px' }}>
            <label style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>TURNO</label>
            <select 
              value={turno} 
              onChange={(e) => setTurno(e.target.value)} 
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 10px', color: 'white', fontSize: '0.8rem', outline: 'none', cursor: 'pointer', minHeight: '34px', fontWeight: 600, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '12px' }}
            >
              <option value="1" style={{ color: '#1A445B' }}>1</option>
              <option value="2" style={{ color: '#1A445B' }}>2</option>
              <option value="3" style={{ color: '#1A445B' }}>3</option>
            </select>
          </div>

          <SearchableSelect label="CREADO POR" options={empleados} value={creadoPor} onChange={setCreadoPor} placeholder="Creado por..." style={{ flex: '1 1 200px' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RESPONSABLES</label>
              {responsables.length < 3 && (
                <button 
                  onClick={()=>setResponsables([...responsables, ''])} 
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 900, borderRadius: '6px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>+</span> AÑADIR
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {responsables.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <SearchableSelect label="" options={empleados} value={r} onChange={(v)=>{
                    const n = [...responsables]; n[i] = v; setResponsables(n);
                  }} placeholder={`Responsable ${i+1}`} style={{ minHeight: '38px' }} />
                  {responsables.length > 1 && (
                    <button onClick={()=>setResponsables(responsables.filter((_, idx)=>idx !== i))} style={{ background: 'rgba(209, 52, 56, 0.1)', border: 'none', color: '#FF4D4D', cursor: 'pointer', fontSize: '1.1rem', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SUPERVISORES</label>
              {supervisores.length < 3 && (
                <button 
                  onClick={()=>setSupervisores([...supervisores, ''])} 
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 900, borderRadius: '6px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>+</span> AÑADIR
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {supervisores.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <SearchableSelect label="" options={empleados} value={s} onChange={(v)=>{
                    const n = [...supervisores]; n[i] = v; setSupervisores(n);
                  }} placeholder={`Supervisor ${i+1}`} style={{ minHeight: '38px' }} />
                  {supervisores.length > 1 && (
                    <button onClick={()=>setSupervisores(supervisores.filter((_, idx)=>idx !== i))} style={{ background: 'rgba(209, 52, 56, 0.1)', border: 'none', color: '#FF4D4D', cursor: 'pointer', fontSize: '1.1rem', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Table Header (Once) */}
      <div style={{ backgroundColor: '#1A445B', color: 'white', borderRadius: '16px 16px 0 0', overflow: 'hidden', marginBottom: '-1px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '180px' }} />
            <col />
            <col style={{ width: '150px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '50px' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EQUIPO / MÁQUINA</th>
              <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 800, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTIVIDAD A REVISAR</th>
              <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FRECUENCIA</th>
              <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CRITICIDAD</th>
              <th style={{ padding: '16px', fontSize: '0.75rem' }}></th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Unified Table Content as Sortable Sections */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndMachine}>
        <SortableContext items={maquinas.map(m => m.id)} strategy={verticalListSortingStrategy}>
          {maquinas.map((maquina) => (
            <SortableMachineSection 
              key={maquina.id} 
              maquina={maquina} 
              updateMaquinaName={updateMaquinaName}
              addPunto={addPunto}
              updatePunto={updatePunto}
              removePunto={removePunto}
              handleDragEndPunto={handleDragEndPunto}
              sensors={sensors}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button 
        onClick={addMaquina} 
        style={{ 
          width: '100%', 
          padding: '1.25rem', 
          backgroundColor: 'white', 
          border: '2px dashed #CBD5E1', 
          borderRadius: '24px', 
          color: '#64748B', 
          fontWeight: 700, 
          fontSize: '1rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#1A445B';
          e.currentTarget.style.backgroundColor = '#F8FAFC';
          e.currentTarget.style.color = '#1A445B';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#CBD5E1';
          e.currentTarget.style.backgroundColor = 'white';
          e.currentTarget.style.color = '#64748B';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <span style={{ fontSize: '1.5rem' }}>+</span> AÑADIR NUEVO EQUIPO O MÁQUINA
      </button>
    </div>
  );
}

// --- COMPONENTES PARA DRAG & DROP ---

function SortableMachineSection({ maquina, updateMaquinaName, addPunto, updatePunto, removePunto, handleDragEndPunto, sensors }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: maquina.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginBottom: '1rem',
    backgroundColor: 'white',
    borderRadius: '24px',
    boxShadow: isDragging ? '0 20px 40px rgba(0,0,0,0.15)' : '0 10px 40px rgba(0,0,0,0.06)',
    overflow: 'hidden',
    position: 'relative' as const,
    zIndex: isDragging ? 100 : 1
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag Handle para Maquina */}
      <div 
        {...attributes} {...listeners} 
        style={{ 
          position: 'absolute', top: '10px', left: '10px', cursor: 'grab', padding: '5px', color: '#CBD5E1', zIndex: 10
        }}
        title="Arrastrar Máquina"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-12a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/></svg>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '180px' }} />
          <col />
          <col style={{ width: '150px' }} />
          <col style={{ width: '150px' }} />
          <col style={{ width: '50px' }} />
        </colgroup>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEndPunto(maquina.id, e)}>
          <SortableContext items={maquina.puntos.map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {maquina.puntos.map((punto: any, pIdx: number) => (
                <SortablePuntoRow 
                  key={punto.id} 
                  punto={punto} 
                  pIdx={pIdx} 
                  mId={maquina.id}
                  rowSpan={maquina.puntos.length}
                  maquinaNombre={maquina.nombre}
                  updateMaquinaName={updateMaquinaName}
                  addPunto={addPunto}
                  updatePunto={updatePunto}
                  removePunto={removePunto}
                />
              ))}
            </tbody>
          </SortableContext>
        </DndContext>
      </table>
    </div>
  );
}

function SortablePuntoRow({ punto, pIdx, mId, rowSpan, maquinaNombre, updateMaquinaName, addPunto, updatePunto, removePunto }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: punto.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? '#F1F5F9' : 'transparent',
    zIndex: isDragging ? 20 : 1,
    position: 'relative' as const,
    borderBottom: '1px solid #F1F5F9'
  };

  return (
    <tr ref={setNodeRef} style={style}>
      {pIdx === 0 && (
        <td rowSpan={rowSpan} style={{ padding: '20px', verticalAlign: 'middle', backgroundColor: '#F8FAFB', borderRight: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <textarea 
              value={maquinaNombre} 
              onChange={(e) => updateMaquinaName(mId, e.target.value)} 
              placeholder="Nombre del equipo..." 
              style={{ 
                width: '100%', border: '1px solid #E2E8F0', backgroundColor: 'white', borderRadius: '12px', padding: '12px', textAlign: 'center', fontSize: '0.95rem', fontWeight: 700, color: '#1A445B', outline: 'none', resize: 'none', height: '80px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s ease'
              }} 
              onFocus={(e) => { e.target.style.borderColor = '#1A445B'; e.target.style.boxShadow = '0 0 0 3px rgba(26,68,91,0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
            />
            <button 
              onClick={() => addPunto(mId)} 
              style={{ 
                backgroundColor: '#E2E8F0', color: '#1A445B', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A445B'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#E2E8F0'; e.currentTarget.style.color = '#1A445B'; }}
            >
              <span>+</span> AÑADIR ITEM
            </button>
          </div>
        </td>
      )}
      <td style={{ padding: '16px', position: 'relative' }}>
        {/* Drag Handle para Punto */}
        <div 
          {...attributes} {...listeners} 
          style={{ position: 'absolute', left: '2px', top: '50%', transform: 'translateY(-50%)', cursor: 'grab', color: '#CBD5E1', padding: '4px' }}
          title="Arrastrar Item"
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-12a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/></svg>
        </div>

        <textarea 
          value={punto.revisar} 
          onChange={(e) => updatePunto(mId, punto.id, 'revisar', e.target.value)} 
          placeholder="Punto de inspección o actividad..." 
          style={{ 
            width: '100%', 
            padding: '12px 16px 12px 24px', 
            border: '1px solid #E2E8F0', 
            borderRadius: '12px', 
            fontSize: '0.9rem', 
            color: '#334155', 
            outline: 'none',
            minHeight: '80px',
            resize: 'none',
            backgroundColor: '#F8FAFC',
            transition: 'all 0.2s',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
            fontFamily: 'inherit'
          }} 
          onFocus={(e) => e.target.style.borderColor = '#1A445B'}
          onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
        />
      </td>
      <td style={{ padding: '16px' }}>
        <select 
          value={punto.frecuencia} 
          onChange={(e) => updatePunto(mId, punto.id, 'frecuencia', e.target.value)} 
          style={{ width: '100%', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '0.9rem', color: '#334155', backgroundColor: 'white', cursor: 'pointer', outline: 'none' }}
        >
          <option value="Cada turno">🔄 Cada turno</option>
          <option value="Diario">📅 Diario</option>
          <option value="Semanal">🗓️ Semanal</option>
          <option value="Quincenal">📆 Quincenal</option>
          <option value="Mensual">🌙 Mensual</option>
        </select>
      </td>
      <td style={{ padding: '16px' }}>
        <select 
          value={punto.criticidad} 
          onChange={(e) => updatePunto(mId, punto.id, 'criticidad', e.target.value)} 
          style={{ 
            width: '100%', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, color: punto.criticidad === 'Alta' ? '#D13438' : punto.criticidad === 'Media' ? '#F59E0B' : '#105B3A', backgroundColor: 'white', cursor: 'pointer', outline: 'none'
          }}
        >
          <option value="Alta">🔴 Alta</option>
          <option value="Media">🟡 Media</option>
          <option value="Baja">🟢 Baja</option>
        </select>
      </td>
      <td style={{ padding: '16px', textAlign: 'center' }}>
        <button 
          onClick={() => removePunto(mId, punto.id)} 
          style={{ background: '#FEE2E2', border: 'none', color: '#D13438', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FECACA'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
        >
          ×
        </button>
      </td>
    </tr>
  );
}

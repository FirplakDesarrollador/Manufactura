'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { supabaseTH } from '../../../../../lib/supabaseTH';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
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
function SearchableSelect({ label, options, value, onChange, placeholder }: { label: string; options: Item[]; value: string; onChange: (val: string) => void; placeholder: string; }) {
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
    <div ref={wrapperRef} style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative', flex: 1 }}>
      {label && <label style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>{label}</label>}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', minHeight: '34px' }}
      >
        <span style={{ opacity: value ? 1 : 0.6 }}>{value || placeholder}</span>
        <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>▼</span>
      </div>
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #D1D9E0', borderRadius: '8px', marginTop: '4px', zIndex: 1000, boxShadow: '0 8px 20px rgba(0,0,0,0.15)', maxHeight: '250px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #EEF2F5' }}>
            <input
              type="text" autoFocus placeholder="Buscar..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #D1D9E0', outline: 'none', fontSize: '0.85rem', color: '#1A445B' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
              <div key={opt.id} onClick={() => { onChange(opt.label); setIsOpen(false); setSearchTerm(''); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem', color: '#1A445B', backgroundColor: value === opt.label ? '#F0F9FF' : 'transparent' }}>{opt.label}</div>
            )) : <div style={{ padding: '12px', fontSize: '0.8rem', color: '#9AA6AE', textAlign: 'center' }}>No existen resultados</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModificarPuestaClient({ planta, id, encabezadoInicial, detallesIniciales }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ t: 's' | 'e', m: string } | null>(null);

  const [empleados, setEmpleados] = useState<Item[]>([]);
  const [plantas, setPlantas] = useState<Item[]>([]);
  const [enc, setEnc] = useState(encabezadoInicial);
  
  // Estados para múltiples responsables y supervisores
  const [responsables, setResponsables] = useState<string[]>(
    encabezadoInicial.responsable ? encabezadoInicial.responsable.split(' / ') : ['']
  );
  const [supervisores, setSupervisores] = useState<string[]>(
    encabezadoInicial.supervisor ? encabezadoInicial.supervisor.split(' / ') : ['']
  );
  const [creadoPor, setCreadoPor] = useState(encabezadoInicial.creado_por || 'Jakeline Chaverra Soto');
  const [modificadoPor, setModificadoPor] = useState('Jakeline Chaverra Soto');

  // Grouped state initialization
  const initialGroups: any[] = [];
  const sortedDetails = [...detallesIniciales].sort((a: any, b: any) => a.numero_item - b.numero_item);
  sortedDetails.forEach((d: any) => {
    const existing = initialGroups.find(g => g.equipo === d.equipo_herramienta);
    if (existing) {
      existing.items.push({ id: uuidv4(), id_detalle: d.id_detalle, punto_a_revisar: d.punto_a_revisar, criticidad: d.criticidad, frecuencia: d.frecuencia || 'Cada turno' });
    } else {
      initialGroups.push({
        id: uuidv4(),
        equipo: d.equipo_herramienta,
        items: [{ id: uuidv4(), id_detalle: d.id_detalle, punto_a_revisar: d.punto_a_revisar, criticidad: d.criticidad, frecuencia: d.frecuencia || 'Cada turno' }]
      });
    }
  });

  const [groups, setGroups] = useState<any[]>(initialGroups.length > 0 ? initialGroups : [{ id: uuidv4(), equipo: '', items: [{ id: uuidv4(), punto_a_revisar: '', criticidad: 'Media', frecuencia: 'Cada turno' }] }]);

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

  const updateEnc = (field: string, val: any) => setEnc({ ...enc, [field]: val });
  const addGroup = () => setGroups([...groups, { id: uuidv4(), equipo: '', items: [{ id: uuidv4(), punto_a_revisar: '', criticidad: 'Media', frecuencia: 'Cada turno' }] }]);
  const removeGroup = (gId: string) => setGroups(groups.filter(g => g.id !== gId));
  const updateGroupEquipo = (gId: string, val: string) => {
    setGroups(groups.map(g => g.id === gId ? { ...g, equipo: val } : g));
  };
  const addItem = (gId: string) => {
    setGroups(groups.map(g => g.id === gId ? { ...g, items: [...g.items, { id: uuidv4(), punto_a_revisar: '', criticidad: 'Media', frecuencia: 'Diaria' }] } : g));
  };
  const removeItem = (gId: string, itemId: string) => {
    const group = groups.find(g => g.id === gId);
    if (!group) return;
    if (group.items.length === 1) removeGroup(gId);
    else {
      setGroups(groups.map(g => g.id === gId ? { ...g, items: g.items.filter((it: any) => it.id !== itemId) } : g));
    }
  };
  const updateItem = (gId: string, itemId: string, field: string, val: any) => {
    setGroups(groups.map(g => g.id === gId ? {
      ...g,
      items: g.items.map((it: any) => it.id === itemId ? { ...it, [field]: val } : it)
    } : g));
  };

  const handleDragEndGroup = (event: DragEndEventType) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setGroups((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragEndItem = (gId: string, event: DragEndEventType) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setGroups((prevGroups) => prevGroups.map(g => {
        if (g.id === gId) {
          const oldIndex = g.items.findIndex((it: any) => it.id === active.id);
          const newIndex = g.items.findIndex((it: any) => it.id === over.id);
          return { ...g, items: arrayMove(g.items, oldIndex, newIndex) };
        }
        return g;
      }));
    }
  };

  async function handleSave(versionNueva: boolean = false) {
    setLoading(true);
    setMsg(null);
    try {
      const flatDetails: any[] = [];
      let counter = 1;
      groups.forEach(g => {
        g.items.forEach((it: any) => {
          flatDetails.push({
            equipo_herramienta: g.equipo,
            punto_a_revisar: it.punto_a_revisar,
            criticidad: it.criticidad,
            frecuencia: it.frecuencia || 'Cada turno',
            numero_item: counter++,
            fecha_revision: new Date().toISOString().split('T')[0],
            resultado: 'N/A'
          });
        });
      });

      if (versionNueva) {
        const nextVersion = (parseInt(enc.version_formato || '1') + 1).toString();
        
        const dataToInsert = { 
          ...enc, 
          id_puesta_a_punto: undefined, 
          version_formato: nextVersion, 
          creado_en: new Date().toISOString().split('T')[0], 
          estado_puesta_a_punto: 'Abierta',
          responsable: responsables.filter(r => r.trim() !== '').join(' / '),
          supervisor: supervisores.filter(s => s.trim() !== '').join(' / '),
          'Creado por': creadoPor,
          'Modificado por': modificadoPor
        };

        const { data: newEnc, error: e1 } = await supabase.from('puestas_a_punto_encabezado').insert([dataToInsert]).select().single();
        if (e1) throw e1;
        const rows = flatDetails.map(d => ({ ...d, id_puesta_a_punto: newEnc.id_puesta_a_punto }));
        const { error: e2 } = await supabase.from('puestas_a_punto_detalle').insert(rows);
        if (e2) throw e2;
        setMsg({ t: 's', m: `Nueva versión creada.` });
        setTimeout(() => router.push(`/puestas-a-punto/${encodeURIComponent(planta)}/ver/${newEnc.id_puesta_a_punto}`), 1500);
      } else {
        const dataToUpdate = { 
          nombre_puesta_a_punto: enc.nombre_puesta_a_punto, 
          proceso: enc.proceso, 
          planta: enc.planta, 
          version_formato: enc.version_formato,
          responsable: responsables.filter(r => r.trim() !== '').join(' / '),
          supervisor: supervisores.filter(s => s.trim() !== '').join(' / '),
          'Creado por': creadoPor,
          'Modificado por': modificadoPor
        };

        const { error: e1 } = await supabase.from('puestas_a_punto_encabezado').update(dataToUpdate).eq('id_puesta_a_punto', id);
        if (e1) throw e1;
        await supabase.from('puestas_a_punto_detalle').delete().eq('id_puesta_a_punto', id);
        const rows = flatDetails.map(d => ({ ...d, id_puesta_a_punto: id }));
        const { error: e3 } = await supabase.from('puestas_a_punto_detalle').insert(rows);
        if (e3) throw e3;
        setMsg({ t: 's', m: "Base de datos actualizada." });
        setTimeout(() => router.push(`/puestas-a-punto/${encodeURIComponent(planta)}/ver/${id}`), 1500);
      }
    } catch (e: any) { setMsg({ t: 'e', m: e.message }); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '5rem' }}>
      {msg && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', padding: '1rem 1.5rem', borderRadius: '12px', backgroundColor: msg.t === 's' ? '#F0F9FF' : '#FDF0F0', color: msg.t === 's' ? '#1A445B' : '#D13438', border: `1px solid ${msg.t === 's' ? '#1A445B' : '#D13438'}`, boxShadow: '0 8px 30px rgba(0,0,0,0.1)', zIndex: 10000, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>{msg.t === 's' ? '✅' : '❌'}</span> {msg.m}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginBottom: '0.6rem', alignItems: 'center' }}>
        <button
          onClick={() => router.back()}
          title="Cancelar"
          style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'white', color: '#586B77', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path></svg>
        </button>
        <button 
          onClick={() => handleSave(false)} 
          disabled={loading} 
          title="Guardar Cambios"
          style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'white', color: '#1A445B', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', transition: 'all 0.2s', padding: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        >
          {loading ? '...' : '💾'}
        </button>
        <button 
          onClick={() => handleSave(true)} 
          disabled={loading} 
          title="Crear Nueva Versión"
          style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'white', color: '#1A445B', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', transition: 'all 0.2s', padding: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        >
          🆕
        </button>
      </div>

      <div style={{ backgroundColor: '#1A445B', color: 'white', borderRadius: '16px', padding: '0.6rem 1rem', marginBottom: '0.8rem', display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 8px 25px rgba(26,68,91,0.08)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 300px' }}>
          <label style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>NOMBRE DEL FORMATO</label>
          <input value={enc.nombre_puesta_a_punto} onChange={(e) => updateEnc('nombre_puesta_a_punto', e.target.value)} style={{ backgroundColor: 'transparent', border: 'none', borderBottom: '2px solid rgba(255,255,255,0.2)', color: 'white', fontSize: '1.1rem', fontWeight: 800, outline: 'none', width: '100%', padding: '2px 0' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', flex: '2 1 600px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <SearchableSelect label="PLANTA" options={plantas} value={enc.planta} onChange={(v) => updateEnc('planta', v)} placeholder="Planta" />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100px' }}>
            <label style={{ fontSize: '0.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>PROCESO</label>
            <input value={enc.proceso} onChange={(e) => updateEnc('proceso', e.target.value)} style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '4px 8px', color: 'white', fontSize: '0.75rem', outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>RESPONSABLES</label>
              {responsables.length < 3 && <button onClick={()=>setResponsables([...responsables, ''])} style={{ background: 'none', border: 'none', color: '#1A445B', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: 'white', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>}
            </div>
            {responsables.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <SearchableSelect label="" options={empleados} value={r} onChange={(v)=>{
                  const n = [...responsables]; n[i] = v; setResponsables(n);
                }} placeholder={`Resp ${i+1}`} />
                {responsables.length > 1 && <button onClick={()=>setResponsables(responsables.filter((_, idx)=>idx !== i))} style={{ background: 'none', border: 'none', color: '#D13438', cursor: 'pointer', fontSize: '1rem' }}>×</button>}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>SUPERVISORES</label>
              {supervisores.length < 3 && <button onClick={()=>setSupervisores([...supervisores, ''])} style={{ background: 'none', border: 'none', color: '#1A445B', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: 'white', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>}
            </div>
            {supervisores.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <SearchableSelect label="" options={empleados} value={s} onChange={(v)=>{
                  const n = [...supervisores]; n[i] = v; setSupervisores(n);
                }} placeholder={`Sup ${i+1}`} />
                {supervisores.length > 1 && <button onClick={()=>setSupervisores(supervisores.filter((_, idx)=>idx !== i))} style={{ background: 'none', border: 'none', color: '#D13438', cursor: 'pointer', fontSize: '1rem' }}>×</button>}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
             <label style={{ fontSize: '0.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>CREADO POR</label>
             <SearchableSelect label="" options={empleados} value={creadoPor} onChange={setCreadoPor} placeholder="Creado por" />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
             <label style={{ fontSize: '0.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>MODIFICADO POR</label>
             <SearchableSelect label="" options={empleados} value={modificadoPor} onChange={setModificadoPor} placeholder="Modificado por" />
          </div>
        </div>
        <Image src="/logo_2.png" alt="Logo" width={70} height={22} style={{ objectFit: 'contain' }} />
      </div>

      {/* Unified Table Header (Once) */}
      <div style={{ backgroundColor: '#1A445B', color: 'white', borderRadius: '16px 16px 0 0', overflow: 'hidden', marginBottom: '-1px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ backgroundColor: '#1A445B', color: 'white' }}>
              <th style={{ padding: '14px', fontSize: '0.8rem', width: '160px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>EQUIPO / MÁQUINA</th>
              <th style={{ padding: '14px', fontSize: '0.8rem', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)' }}>ACTIVIDAD A REVISAR</th>
              <th style={{ padding: '14px', fontSize: '0.8rem', width: '130px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>FRECUENCIA</th>
              <th style={{ padding: '14px', fontSize: '0.8rem', width: '130px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>CRITICIDAD</th>
              <th style={{ padding: '14px', fontSize: '0.8rem', width: '40px' }}></th>
            </tr>
          </thead>
        </table>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndGroup}>
        <SortableContext items={groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
          {groups.map((group) => (
            <SortableGroupSection 
              key={group.id} 
              group={group} 
              updateGroupEquipo={updateGroupEquipo}
              addItem={addItem}
              updateItem={updateItem}
              removeItem={removeItem}
              handleDragEndItem={handleDragEndItem}
              sensors={sensors}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button onClick={addGroup} style={{ marginTop: '1.5rem', width: '100%', padding: '1.2rem', backgroundColor: 'transparent', border: '2px dashed #D1D9E0', borderRadius: '16px', color: '#586B77', fontWeight: 700, cursor: 'pointer' }}>➕ Añadir Nuevo Equipo</button>
    </div>
  );
}

// --- COMPONENTES PARA DRAG & DROP ---

function SortableGroupSection({ group, updateGroupEquipo, addItem, updateItem, removeItem, handleDragEndItem, sensors }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginBottom: '1rem',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: isDragging ? '0 15px 30px rgba(0,0,0,0.12)' : '0 4px 20px rgba(0,0,0,0.04)',
    overflow: 'hidden',
    position: 'relative' as const,
    zIndex: isDragging ? 100 : 1,
    border: '1px solid #E2E8EA'
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div 
        {...attributes} {...listeners} 
        style={{ 
          position: 'absolute', top: '8px', left: '8px', cursor: 'grab', padding: '4px', color: '#CBD5E1', zIndex: 10
        }}
        title="Arrastrar Máquina"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-12a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/></svg>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '160px' }} />
          <col />
          <col style={{ width: '130px' }} />
          <col style={{ width: '130px' }} />
          <col style={{ width: '40px' }} />
        </colgroup>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEndItem(group.id, e)}>
          <SortableContext items={group.items.map((it: any) => it.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {group.items.map((item: any, iIdx: number) => (
                <SortableItemRow 
                  key={item.id} 
                  item={item} 
                  iIdx={iIdx} 
                  gId={group.id}
                  rowSpan={group.items.length}
                  equipo={group.equipo}
                  updateGroupEquipo={updateGroupEquipo}
                  addItem={addItem}
                  updateItem={updateItem}
                  removeItem={removeItem}
                />
              ))}
            </tbody>
          </SortableContext>
        </DndContext>
      </table>
    </div>
  );
}

function SortableItemRow({ item, iIdx, gId, rowSpan, equipo, updateGroupEquipo, addItem, updateItem, removeItem }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? '#F8FAFB' : 'transparent',
    zIndex: isDragging ? 20 : 1,
    position: 'relative' as const,
    borderBottom: '1px solid #EEF2F5'
  };

  return (
    <tr ref={setNodeRef} style={style}>
      {iIdx === 0 && (
        <td rowSpan={rowSpan} style={{ padding: '15px', verticalAlign: 'middle', borderRight: '1px solid #EEF2F5', backgroundColor: '#F8FAFB', textAlign: 'center' }}>
          <textarea 
            value={equipo} 
            onChange={(e) => updateGroupEquipo(gId, e.target.value)} 
            placeholder="Equipo..." 
            style={{ 
              width: '90%', border: 'none', backgroundColor: 'transparent', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#1A445B', outline: 'none', resize: 'none', height: '60px' 
            }} 
          />
          <div style={{ marginTop: '5px' }}>
            <button onClick={() => addItem(gId)} style={{ backgroundColor: '#1A445B', color: 'white', border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '0.65rem', cursor: 'pointer' }}>+ Item</button>
          </div>
        </td>
      )}
      <td style={{ padding: '10px 15px', borderRight: '1px solid #EEF2F5', position: 'relative' }}>
        <div 
          {...attributes} {...listeners} 
          style={{ position: 'absolute', left: '2px', top: '50%', transform: 'translateY(-50%)', cursor: 'grab', color: '#CBD5E1', padding: '4px' }}
          title="Arrastrar Item"
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-12a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/></svg>
        </div>

        <textarea 
          value={item.punto_a_revisar} 
          onChange={(e) => updateItem(gId, item.id, 'punto_a_revisar', e.target.value)} 
          style={{ 
            width: '100%', 
            padding: '8px 12px 8px 24px', 
            border: '1px solid #D1D9E0', 
            borderRadius: '6px', 
            fontSize: '0.9rem', 
            color: '#27556C', 
            outline: 'none',
            minHeight: '40px',
            resize: 'none',
            fontFamily: 'inherit'
          }} 
        />
      </td>
      <td style={{ padding: '12px 15px', borderRight: '1px solid #EEF2F5' }}>
        <select value={item.frecuencia} onChange={(e) => updateItem(gId, item.id, 'frecuencia', e.target.value)} style={{ width: '100%', padding: '8px 6px', border: '1px solid #D1D9E0', borderRadius: '6px', fontSize: '0.85rem' }}>
          <option value="Cada turno">🔄 Cada turno</option>
          <option value="Diario">📅 Diario</option>
          <option value="Semanal">🗓️ Semanal</option>
          <option value="Quincenal">📆 Quincenal</option>
          <option value="Mensual">🌙 Mensual</option>
        </select>
      </td>
      <td style={{ padding: '12px 15px', borderRight: '1px solid #EEF2F5', textAlign: 'center' }}>
        <select value={item.criticidad} onChange={(e) => updateItem(gId, item.id, 'criticidad', e.target.value)} style={{ width: '100%', padding: '8px 6px', border: '1px solid #D1D9E0', borderRadius: '6px', fontSize: '0.85rem' }}>
          <option value="Alta">🔴 Alta</option>
          <option value="Media">🟡 Media</option>
          <option value="Baja">🟢 Baja</option>
        </select>
      </td>
      <td style={{ padding: '12px 5px', textAlign: 'center' }}>
        <button onClick={() => removeItem(gId, item.id)} style={{ background: 'none', border: 'none', color: '#9AA6AE', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
      </td>
    </tr>
  );
}

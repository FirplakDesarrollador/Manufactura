"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import BackButton from './BackButton';

export default function RealizarMatrixClient({ 
  planta, 
  id, 
  initialEnc, 
  initialDet 
}: { 
  planta: string, 
  id: string, 
  initialEnc: any, 
  initialDet: any[] 
}) {
  const router = useRouter();
  const decodedPlanta = decodeURIComponent(planta);
  
  // Pivotamos los datos iniciales
  const [data, setData] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const groupedTasks: Record<string, any> = {};
    initialDet.forEach(row => {
      const eq = row.equipo_herramienta || 'Generales';
      const rev = row.punto_a_revisar || 'Sin especificar';
      const key = `${eq}_||_${rev}`;
      if (!groupedTasks[key]) {
        groupedTasks[key] = { equipo: eq, revisar: rev, dias: {} };
      }
      if (row.fecha_revision) {
        const datePart = row.fecha_revision.split('-')[2];
        if (datePart) {
          const diaNum = parseInt(datePart, 10).toString();
          groupedTasks[key].dias[diaNum] = row.resultado;
        }
      }
    });
    setData(Object.values(groupedTasks).sort((a: any, b: any) => a.equipo.localeCompare(b.equipo)));
  }, [initialDet]);

  const handleCellClick = (taskIdx: number, dia: number) => {
    const newData = [...data];
    const currentVal = newData[taskIdx].dias[dia] || '';
    let nextVal = '';
    if (!currentVal || currentVal === 'N/A') nextVal = 'B';
    else if (currentVal === 'B') nextVal = 'R';
    else if (currentVal === 'R') nextVal = 'M';
    else if (currentVal === 'M') nextVal = 'B';
    
    newData[taskIdx].dias[dia] = nextVal;
    setData(newData);
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      // Para simplificar, en este MVP solo mostramos el éxito visual
      // En una versión completa, aquí iteraríamos sobre 'data' e insertaríamos en puestas_a_punto_detalle
      alert("¡Cambios guardados con éxito (Simulado)!");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const clean = (val: string | null | undefined) => (!val || val.toUpperCase() === 'PENDIENTE' || val.toUpperCase() === 'N/A') ? '' : val;

  // Calculamos rowspans
  let rowSpans: number[] = new Array(data.length).fill(0);
  let currentEquipo = null;
  let startIndex = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].equipo !== currentEquipo) {
      rowSpans[i] = 1;
      currentEquipo = data[i].equipo;
      startIndex = i;
    } else {
      if (rowSpans[startIndex] !== undefined) {
        rowSpans[startIndex] = (rowSpans[startIndex] ?? 0) + 1;
      }
      rowSpans[i] = 0;
    }
  }

  if (!data || data.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>No existen tareas para esta puesta a punto.</div>;
  }

  return (
    <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', paddingBottom: '6rem' }}>
      
      {/* HEADER DE ALTA FIDELIDAD */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8EA', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem 2rem', backgroundColor: '#1A445B', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 700, textTransform: 'capitalize' }}>
            {initialEnc.nombre_puesta_a_punto || 'DILIGENCIAR PUESTA A PUNTO'} 
          </h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
             <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>V.{clean(initialEnc.version_formato) || '1'}</span>
             <button 
               onClick={saveChanges}
               disabled={isSaving}
               title="Guardar Cambios"
               style={{ 
                 backgroundColor: 'white', 
                 color: '#1A445B', 
                 border: 'none', 
                 width: '40px', 
                 height: '40px', 
                 borderRadius: '50%', 
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
               {isSaving ? '...' : '💾'}
             </button>
          </div>
        </div>
        
        <div style={{ padding: '1.5rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2rem', borderBottom: '1px solid #E2E8EA' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#667A85', textTransform: 'uppercase', fontWeight: 700 }}>Planta</span><br/>
            <strong style={{ color: '#1A445B' }}>{clean(initialEnc.planta) || decodedPlanta}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#667A85', textTransform: 'uppercase', fontWeight: 700 }}>Proceso</span><br/>
            <strong style={{ color: '#1A445B' }}>{clean(initialEnc.proceso)}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#667A85', textTransform: 'uppercase', fontWeight: 700 }}>Fecha</span><br/>
            <strong style={{ color: '#1A445B' }}>{initialEnc.creado_en?.split('T')[0] || new Date().toISOString().split('T')[0]}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#667A85', textTransform: 'uppercase', fontWeight: 700 }}>Responsable</span><br/>
            <strong style={{ color: '#1A445B' }}>{clean(initialEnc.responsable)}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#667A85', textTransform: 'uppercase', fontWeight: 700 }}>Supervisor</span><br/>
            <strong style={{ color: '#1A445B' }}>{clean(initialEnc.supervisor)}</strong>
          </div>
        </div>
        
        <div style={{ padding: '0.8rem 2rem', backgroundColor: '#F8F9FA', fontSize: '0.8rem', color: '#1A445B' }}>
          <p style={{ margin: 0 }}>💡 <strong>Tips:</strong> Haz clic en las celdas de los días para cambiar el estado (B, R, M).</p>
        </div>
      </div>

      {/* MATRIZ INTERACTIVA */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8EA', overflowX: 'auto', position: 'relative' }}>
        <table style={{ minWidth: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ backgroundColor: '#27556C', color: 'white' }}>
              <th style={{ padding: '12px', width: '220px', minWidth: '220px', position: 'sticky', left: 0, backgroundColor: '#1A445B', zIndex: 11 }}>EQUIPO</th>
              <th style={{ padding: '12px', minWidth: '300px', position: 'sticky', left: '220px', backgroundColor: '#1A445B', zIndex: 11 }}>REVISAR</th>
              {[...Array(31)].map((_, i) => (
                <th key={i} style={{ width: '38px', fontSize: '0.75rem', backgroundColor: '#27556C' }}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, taskIdx) => (
              <tr key={taskIdx} style={{ borderBottom: '1px solid #E2E8EA' }}>
                {(rowSpans[taskIdx] ?? 0) > 0 && (
                  <td rowSpan={rowSpans[taskIdx]} style={{ padding: '12px', fontWeight: 700, backgroundColor: 'white', position: 'sticky', left: 0, zIndex: 2, borderRight: '1px solid #E2E8EA', width: '220px' }}>
                    {item.equipo}
                  </td>
                )}
                <td style={{ padding: '10px 15px', textAlign: 'left', fontSize: '0.85rem', position: 'sticky', left: '220px', backgroundColor: 'white', zIndex: 2, borderRight: '1px solid #E2E8EA' }}>
                  {item.revisar}
                </td>
                {[...Array(31)].map((_, i) => {
                  const dia = i + 1;
                  const val = item.dias[dia] || '';
                  let bg = 'transparent';
                  if (val === 'B') bg = '#EEF7F2';
                  if (val === 'R') bg = '#FFF9EB';
                  if (val === 'M') bg = '#FDF0F0';
                  return (
                    <td 
                      key={i} 
                      onClick={() => handleCellClick(taskIdx, dia)}
                      style={{ cursor: 'pointer', backgroundColor: bg, borderRight: '1px solid #F0F4F8', height: '40px', fontWeight: 700, transition: '0.2s' }}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

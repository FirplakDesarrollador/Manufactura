"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/mtto-autonomo/supabase';
import { supabaseTH } from '@/lib/mtto-autonomo/supabaseTH';
import { useRouter } from 'next/navigation';
import BackButton from './BackButton';
import SearchableSelect from './SearchableSelect';
import Image from 'next/image';

export default function DailyChecklistClient({ 
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [responsable, setResponsable] = useState(initialEnc.responsable || '');
  const [turno, setTurno] = useState(String(initialEnc.turno || '1'));
  const [results, setResults] = useState<Record<string, { status: string, obs: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [empleados, setEmpleados] = useState<{ id: string|number; label: string }[]>([]);

  useEffect(() => {
    async function load() {
      const { data: emps } = await supabaseTH.from('empleados').select('id, nombreCompleto').eq('activo', true).order('nombreCompleto');
      if (emps) setEmpleados(emps.map(e => ({ id: e.id, label: e.nombreCompleto })));
    }
    load();
  }, []);

  // Fetch existing results for the selected date
  useEffect(() => {
    async function fetchResults() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('puestas_a_punto_seguimiento')
          .select('*')
          .eq('id_puesta_a_punto', id)
          .eq('fecha', selectedDate);
        
        if (error) throw error;

        const newResults: Record<string, { status: string, obs: string }> = {};
        data?.forEach(row => {
          newResults[row.id_detalle] = { status: row.resultado, obs: row.observaciones || '' };
        });
        setResults(newResults);
      } catch (err) {
        console.error('Error fetching daily results:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchResults();
  }, [id, selectedDate]);

  const handleStatusChange = (detalleId: string, status: string) => {
    setResults(prev => {
      const current = prev[detalleId] || { status: '', obs: '' };
      const newStatus = current.status === status ? '' : status;
      // Si cambia a B, limpiamos observaciones
      const newObs = (newStatus === 'B') ? '' : current.obs;
      return {
        ...prev,
        [detalleId]: { ...current, status: newStatus, obs: newObs }
      };
    });
  };

  const handleObsChange = (detalleId: string, obs: string) => {
    setResults(prev => {
      const current = prev[detalleId] || { status: '', obs: '' };
      return {
        ...prev,
        [detalleId]: { ...current, obs }
      };
    });
  };

  const handleSave = async () => {
    // Validar que R y M tengan observaciones
    const pendingItems = initialDet.filter(item => {
      const res = results[item.id_detalle];
      if (res && (res.status === 'R' || res.status === 'M')) {
        return !res.obs || res.obs.trim() === '';
      }
      return false;
    });

    if (pendingItems.length > 0) {
      alert(`⚠️ Por favor, agregue una observación para los ítems marcados como R o M (${pendingItems.length} pendientes).`);
      return;
    }

    setIsSaving(true);
    try {
      // Upsert results
      const trackingData = initialDet.map(item => ({
        id_puesta_a_punto: id,
        id_detalle: item.id_detalle,
        fecha: selectedDate,
        turno: parseInt(turno, 10),
        resultado: results[item.id_detalle]?.status || 'N/A',
        observaciones: results[item.id_detalle]?.obs || '',
        realizado_por: responsable || 'N/A'
      }));

      // In a real scenario, we'd use a more sophisticated upsert or a stored procedure.
      // For now, we'll delete existing entries for this date/id and insert new ones.
      const { error: delError } = await supabase
        .from('puestas_a_punto_seguimiento')
        .delete()
        .eq('id_puesta_a_punto', id)
        .eq('fecha', selectedDate);

      if (delError) throw delError;

      const { error: insError } = await supabase
        .from('puestas_a_punto_seguimiento')
        .insert(trackingData);

      if (insError) throw insError;
      
      // Update header as well to persist responsable/turno changes
      await supabase
        .from('puestas_a_punto_encabezado')
        .update({ 
          responsable: responsable,
          turno: parseInt(turno, 10)
        })
        .eq('id_puesta_a_punto', id);

      alert('¡Seguimiento guardado correctamente!');
    } catch (err) {
      console.error('Error saving tracking data:', err);
      alert('Error al guardar el seguimiento. Asegúrese de que la tabla puestas_a_punto_seguimiento exista.');
    } finally {
      setIsSaving(false);
    }
  };

  // Group items by Equipo
  const groups: Record<string, any[]> = {};
  initialDet.forEach(item => {
    const eq = item.equipo_herramienta || 'GENERAL';
    if (!groups[eq]) groups[eq] = [];
    groups[eq].push(item);
  });

  return (
    <div style={{ width: '98%', maxWidth: '1800px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* ULTRA-COMPACT HEADER */}
      <div style={{ backgroundColor: '#1A445B', color: 'white', borderRadius: '20px', padding: '0.8rem 1.5rem', marginBottom: '1rem', boxShadow: '0 10px 30px rgba(26,68,91,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <BackButton />
             <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800 }}>{initialEnc.nombre_puesta_a_punto}</h2>
             <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '15px', fontSize: '0.75rem', fontWeight: 600 }}>V.{initialEnc.version_formato || '1'}</span>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800 }}>FECHA SEGUIMIENTO</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '6px 12px', color: 'white', fontSize: '0.85rem', outline: 'none' }} />
            </div>
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              style={{ 
                backgroundColor: 'white', 
                color: '#1A445B', 
                border: 'none', 
                width: '40px',
                height: '40px',
                borderRadius: '50%', 
                cursor: 'pointer', 
                fontSize: '1.2rem', 
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Guardar Seguimiento"
            >
              {isSaving ? '...' : '💾'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '150px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>PLANTA</span><br/>
            <strong style={{ fontSize: '0.9rem' }}>{initialEnc.planta}</strong>
          </div>
          <div style={{ minWidth: '150px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>PROCESO</span><br/>
            <strong style={{ fontSize: '0.9rem' }}>{initialEnc.proceso}</strong>
          </div>
          <div style={{ flex: 2, minWidth: '250px' }}>
            <SearchableSelect 
              label="RESPONSABLE" 
              options={empleados} 
              value={responsable} 
              onChange={setResponsable} 
              placeholder="Seleccione responsable..." 
              labelStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem' }} 
              style={{ backgroundColor: 'transparent' }}
            />
          </div>
          <div style={{ width: '150px' }}>
            <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800, display: 'block', marginBottom: '4px' }}>TURNO</label>
            <select 
              value={turno} 
              onChange={(e) => setTurno(e.target.value)} 
              style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '10px', color: 'white', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '14px' }}
            >
              <option value="1" style={{ color: '#1A445B' }}>Turno 1</option>
              <option value="2" style={{ color: '#1A445B' }}>Turno 2</option>
              <option value="3" style={{ color: '#1A445B' }}>Turno 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* DAILY CHECKLIST TABLE */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8EA', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', marginBottom: '5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFB', color: '#1A445B', borderBottom: '2px solid #E2E8EA' }}>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', width: '200px' }}>EQUIPO</th>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>ACTIVIDAD A REVISAR</th>
              <th style={{ padding: '12px 10px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', width: '60px' }}>B</th>
              <th style={{ padding: '12px 10px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', width: '60px' }}>R</th>
              <th style={{ padding: '12px 10px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', width: '60px' }}>M</th>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', width: '300px' }}>OBSERVACIONES</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groups).map(([eqName, items], gIdx) => (
              <React.Fragment key={gIdx}>
                {items.map((item, iIdx) => (
                  <tr key={item.id_detalle} style={{ borderBottom: '1px solid #EEF2F5', backgroundColor: isLoading ? '#FAFAFA' : 'transparent' }}>
                    {iIdx === 0 && (
                      <td rowSpan={items.length} style={{ padding: '15px 20px', fontWeight: 700, color: '#1A445B', backgroundColor: '#F8FAFB', borderRight: '1px solid #EEF2F5', verticalAlign: 'top', fontSize: '0.85rem' }}>
                        {eqName}
                      </td>
                    )}
                    <td style={{ padding: '12px 20px', fontSize: '0.9rem', color: '#334155' }}>
                      {item.punto_a_revisar}
                    </td>
                      {['B', 'R', 'M'].map(status => {
                        const itemResult = results[item.id_detalle] || { status: '', obs: '' };
                        const isActive = itemResult.status === status;
                        const colors: Record<string, string> = { B: '#1A445B', R: '#F59E0B', M: '#DC2626' };
                        return (
                          <td key={status} style={{ padding: '10px 5px', textAlign: 'center' }}>
                            <button 
                              onClick={() => handleStatusChange(item.id_detalle, status)}
                              style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%', 
                                border: `2px solid ${isActive ? colors[status] : '#CBD5E1'}`,
                                backgroundColor: isActive ? colors[status] : 'transparent',
                                color: isActive ? 'white' : '#CBD5E1',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '0.8rem'
                              }}
                            >
                              {status}
                            </button>
                          </td>
                        );
                      })}
                    <td style={{ padding: '10px 20px' }}>
                      {(() => {
                        const res = results[item.id_detalle] || { status: '', obs: '' };
                        const isRequired = (res.status === 'R' || res.status === 'M') && !res.obs.trim();
                        const isDisabled = res.status === 'B';
                        
                        return (
                          <textarea 
                            value={res.obs}
                            disabled={isDisabled}
                            onChange={(e) => handleObsChange(item.id_detalle, e.target.value)}
                            placeholder=""
                            style={{ 
                              width: '100%', 
                              borderRadius: '8px', 
                              border: `1px solid ${isRequired ? '#DC2626' : '#E2E8EA'}`, 
                              padding: '6px 10px', 
                              fontSize: '0.85rem', 
                              outline: 'none', 
                              resize: 'vertical', 
                              minHeight: '38px', 
                              backgroundColor: isDisabled ? '#F3F4F6' : (isRequired ? '#FEF2F2' : '#F9FBFC'),
                              boxShadow: isRequired ? '0 0 0 3px rgba(220, 38, 38, 0.1)' : 'none',
                              transition: 'all 0.2s',
                              opacity: isDisabled ? 0.6 : 1,
                              cursor: isDisabled ? 'not-allowed' : 'text'
                            }}
                          />
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

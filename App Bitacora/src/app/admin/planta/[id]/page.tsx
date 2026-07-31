"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Trash2, Save, ChevronLeft, Loader2, Clock, 
  Calendar, MessageSquare, CheckCircle2, Info 
} from "lucide-react";
import { ProcessIcon } from "@/components/ProcessIcon";

interface Actividad {
  id?: string;
  horario: string;
  actividad: string;
  entregable: string;
  puntos_clave: string;
  tiempo_min: number;
  periodicidad: string;
  lunes: boolean;
  martes: boolean;
  miercoles: boolean;
  jueves: boolean;
  viernes: boolean;
  sub_proceso?: string | null;
}

interface Planta {
  id: string;
  nombre: string;
}

const parseHorarioToMinutes = (horario: string): number => {
  const startTime = horario.split('-')[0].trim();
  const parts = startTime.split(':');
  if (parts.length < 2) return 0;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes)) return 0;
  
  if (hours >= 1 && hours < 6) {
    hours += 12;
  }
  
  return hours * 60 + minutes;
};

export default function PlantaEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: plantaId } = use(params);
  const [planta, setPlanta] = useState<Planta | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subSelection, setSubSelection] = useState<'MS_FV' | 'MBL_CEFI' | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: p } = await supabase.from('plantas').select('*').eq('id', plantaId).single();
      setPlanta(p);

      if (p?.nombre === 'Calidad' && !subSelection) {
        setActividades([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('plantillas_actividades')
        .select('*')
        .eq('id_planta', plantaId);

      if (p?.nombre === 'Calidad') {
        if (subSelection === 'MS_FV') {
          query = query.or('sub_proceso.eq.MS_FV,sub_proceso.is.null');
        } else if (subSelection === 'MBL_CEFI') {
          query = query.eq('sub_proceso', 'MBL_CEFI');
        }
      }

      const { data: acts } = await query.order('horario', { ascending: true });
      
      if (acts) {
        const sortedActs = [...acts].sort((a, b) => {
          return parseHorarioToMinutes(a.horario) - parseHorarioToMinutes(b.horario);
        });
        setActividades(sortedActs);
      }
      setLoading(false);
    }
    fetchData();
  }, [plantaId, subSelection]);

  const addActividad = () => {
    const newAct: Actividad = {
      horario: "06:00",
      actividad: "",
      entregable: "",
      puntos_clave: "",
      tiempo_min: 15,
      periodicidad: "Diaria",
      lunes: true,
      martes: true,
      miercoles: true,
      jueves: true,
      viernes: true,
      ...(planta?.nombre === 'Calidad' ? { sub_proceso: subSelection } : {})
    };
    setActividades([...actividades, newAct]);
  };

  const removeActividad = async (index: number) => {
    const act = actividades[index];
    if (act.id) {
      const confirmed = confirm("¿Estás seguro de eliminar esta actividad? Esta acción no se puede deshacer.");
      if (!confirmed) return;
      await supabase.from('plantillas_actividades').delete().eq('id', act.id);
    }
    const newActs = [...actividades];
    newActs.splice(index, 1);
    setActividades(newActs);
  };

  const handleUpdate = (index: number, field: keyof Actividad, value: any) => {
    const newActs = [...actividades];
    (newActs[index] as any)[field] = value;
    setActividades(newActs);
  };

  const saveAll = async () => {
    setSaving(true);
    const toUpsert = actividades.map(a => ({
      ...a,
      id_planta: plantaId,
      sub_proceso: planta?.nombre === 'Calidad' ? subSelection : null
    }));

    const { error } = await supabase.from('plantillas_actividades').upsert(toUpsert);
    
    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      let query = supabase
        .from('plantillas_actividades')
        .select('*')
        .eq('id_planta', plantaId);

      if (planta?.nombre === 'Calidad') {
        if (subSelection === 'MS_FV') {
          query = query.or('sub_proceso.eq.MS_FV,sub_proceso.is.null');
        } else if (subSelection === 'MBL_CEFI') {
          query = query.eq('sub_proceso', 'MBL_CEFI');
        }
      }

      const { data } = await query.order('horario', { ascending: true });
      if (data) {
        const sortedActs = [...data].sort((a, b) => {
          return parseHorarioToMinutes(a.horario) - parseHorarioToMinutes(b.horario);
        });
        setActividades(sortedActs);
      }
      alert("¡Cambios guardados con éxito!");
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
      <Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} size={40} />
    </div>
  );

  // Sub-selección para Calidad en el Panel de Administración
  if (planta?.nombre === 'Calidad' && !subSelection) {
    return (
      <div className="container animate-fade-in">
        <header style={{ marginBottom: '40px' }}>
          <button 
            onClick={() => router.push('/admin')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', 
              background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 700, 
              cursor: 'pointer', marginBottom: '12px', padding: 0
            }}
          >
            <ChevronLeft size={18} /> Volver a Plantas
          </button>
          <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 700, margin: 0 }}>Calidad - Administración</h1>
          <p style={{ color: '#666', fontSize: '1.1rem', marginTop: '8px' }}>Selecciona la bitácora que deseas configurar</p>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', paddingTop: '20px', maxWidth: '700px', margin: '0 auto' }}>
          <button 
            onClick={() => setSubSelection('MS_FV')} 
            className="card" 
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #e5e7eb', borderTop: '8px solid var(--header-bg)', borderRadius: '24px', transition: 'all 0.3s ease', background: 'white', padding: '32px 20px' }} 
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1)'; }} 
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; }}
          >
            <div style={{ background: 'var(--header-bg)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '20px' }}>
              <ProcessIcon name="MS_FV" size={52} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', margin: 0 }}>MS y FV</h2>
          </button>
          <button 
            onClick={() => setSubSelection('MBL_CEFI')} 
            className="card" 
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #e5e7eb', borderTop: '8px solid var(--primary)', borderRadius: '24px', transition: 'all 0.3s ease', background: 'white', padding: '32px 20px' }} 
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1)'; }} 
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; }}
          >
            <div style={{ background: 'var(--primary)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '20px' }}>
              <ProcessIcon name="MBL_CEFI" size={52} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', margin: 0 }}>MBL y CEFI</h2>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <button 
            onClick={() => {
              if (planta?.nombre === 'Calidad' && subSelection) {
                setSubSelection(null);
              } else {
                router.push('/admin');
              }
            }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', 
              background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 700, 
              cursor: 'pointer', marginBottom: '12px', padding: 0
            }}
          >
            <ChevronLeft size={18} />
            {planta?.nombre === 'Calidad' && subSelection ? "Volver a Selección" : "Volver a Plantas"}
          </button>
          <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 700, marginBottom: '8px' }}>
            Configuración de Actividades
          </h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Proceso: <strong style={{ color: 'var(--primary)' }}>
              {planta?.nombre === 'Calidad' 
                ? `Calidad - ${subSelection === 'MS_FV' ? 'MS y FV' : 'MBL y CEFI'}` 
                : planta?.nombre}
            </strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" onClick={addActividad} style={{ background: 'var(--accent)' }}>
            <Plus size={20} />
            Añadir Actividad
          </button>
          <button className="btn-primary" onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Guardar Cambios
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {actividades.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
            No hay actividades configuradas. Haz clic en "Añadir Actividad" para comenzar.
          </div>
        ) : (
          actividades.map((act, index) => (
            <div key={act.id || `new-${index}`} className="card" style={{ borderLeft: '8px solid var(--primary)', position: 'relative' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 3fr auto', gap: '32px' }}>
                
                {/* Panel Lateral: Configuración */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8f9fa', padding: '16px', borderRadius: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#777', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> Horario
                    </label>
                    <input 
                      type="time" 
                      value={act.horario || ''} 
                      onChange={(e) => handleUpdate(index, 'horario', e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '1rem', fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#777', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Tiempo (Minutos)</label>
                    <input 
                      type="number" 
                      value={act.tiempo_min || ''} 
                      onChange={(e) => handleUpdate(index, 'tiempo_min', parseInt(e.target.value))}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#777', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Periodicidad</label>
                    <select 
                      value={act.periodicidad || 'Diaria'} 
                      onChange={(e) => handleUpdate(index, 'periodicidad', e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontWeight: 600 }}
                    >
                      <option value="Diaria">Diaria</option>
                      <option value="Semanal">Semanal</option>
                      <option value="Quincenal">Quincenal</option>
                      <option value="Mensual">Mensual</option>
                    </select>
                  </div>
                </div>

                {/* Contenido Principal */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#777', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>¿Qué se debe hacer?</label>
                    <input 
                      type="text" 
                      value={act.actividad || ''} 
                      onChange={(e) => handleUpdate(index, 'actividad', e.target.value)}
                      placeholder="Ej: Verificación de parámetros de inyección"
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)' }}
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#777', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Entregable / Evidencia</label>
                      <input 
                        type="text" 
                        value={act.entregable || ''} 
                        onChange={(e) => handleUpdate(index, 'entregable', e.target.value)}
                        placeholder="Ej: Registro físico o digital"
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#777', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> Días que se realiza
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {['lun', 'mar', 'mie', 'jue', 'vie'].map((day, dIdx) => {
                          const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
                          const field = days[dIdx] as keyof Actividad;
                          const active = act[field];
                          return (
                            <button
                              key={day}
                              onClick={() => handleUpdate(index, field, !active)}
                              title={days[dIdx]}
                              style={{
                                flex: 1,
                                height: '36px',
                                borderRadius: '10px',
                                border: 'none',
                                background: active ? 'var(--primary)' : '#eee',
                                color: active ? 'white' : '#999',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                                transition: 'all 0.2s'
                              }}
                            >
                              {day.charAt(0)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#777', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Puntos Clave / Instrucciones</label>
                    <textarea 
                      value={act.puntos_clave || ''} 
                      onChange={(e) => handleUpdate(index, 'puntos_clave', e.target.value)}
                      placeholder="Escribe los puntos críticos que el supervisor debe revisar..."
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', minHeight: '100px', resize: 'vertical' }}
                    />
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button 
                    onClick={() => removeActividad(index)}
                    title="Eliminar Actividad"
                    style={{ background: '#fff1f1', color: '#dc2626', border: 'none', padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#ffe4e4'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#fff1f1'}
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '48px', padding: '32px', background: 'white', borderRadius: '24px', border: '2px dashed var(--primary)', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ background: 'rgba(118, 149, 152, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', margin: '0 auto 20px' }}>
          <Info size={30} />
        </div>
        <h3 style={{ color: 'var(--accent)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Guardar Configuración</h3>
        <p style={{ color: '#666', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
          Asegúrate de guardar todos los cambios para que se reflejen en la bitácora diaria de <strong>{planta?.nombre === 'Calidad' ? `Calidad - ${subSelection === 'MS_FV' ? 'MS y FV' : 'MBL y CEFI'}` : planta?.nombre}</strong>.
        </p>
        <button className="btn-primary" onClick={saveAll} disabled={saving} style={{ padding: '16px 40px', fontSize: '1.1rem' }}>
          {saving ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
          Finalizar y Guardar Todo
        </button>
      </div>
    </div>
  );
}

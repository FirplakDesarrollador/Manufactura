"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  CheckCircle2, Circle, Clock, Loader2, Factory, 
  ChevronLeft, MessageSquare, Calendar, User, Save, Check, 
  LayoutDashboard, LogOut, Info, ChevronDown, ChevronUp
} from "lucide-react";
import { ProcessIcon } from "@/components/ProcessIcon";

interface Actividad {
  id: string;
  horario: string;
  actividad: string;
  entregable: string;
  puntos_clave: string;
  tiempo_min: number;
  periodicidad: string;
}

interface Planta {
  id: string;
  nombre: string;
}

interface Supervisor {
  id: number;
  nombre: string;
  uuid?: string;
}

interface Seguimiento {
  id_actividad: string;
  completado: boolean;
  observaciones: string;
  id_supervisor: number;
}

const shouldHideObservations = (activityName: string): boolean => {
  const name = activityName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/['`´’]/g, "")
    .trim();
    
  const keywordsToHide = [
    "comunicaciones",
    "puesta a punto",
    "recurso para el inicio",
    "recursos para el inicio",
    "acompanamiento frecuente",
    "desayuno",
    "rrc",
    "seguimiento a parametros",
    "rejilla",
    "ronda",
    "5s",
    "almuerzo",
    "entrenamiento",
    "cierre de turno",
    "fin de turno"
  ];
  
  return keywordsToHide.some(keyword => name.includes(keyword));
};

export default function BitacoraPage() {
  const router = useRouter();
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [selectedPlanta, setSelectedPlanta] = useState<Planta | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [completados, setCompletados] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [autorias, setAutorias] = useState<Record<string, number>>({}); 
  
  const [loading, setLoading] = useState(true);
  const [loadingActs, setLoadingActs] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const [subSelection, setSubSelection] = useState<'MS_FV' | 'MBL_CEFI' | null>(null);
  const todayDate = new Date().toISOString().split('T')[0];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    async function checkAuthAndFetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // 1. Buscar perfil por UUID
      let { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, nombre, uuid')
        .eq('uuid', session.user.id)
        .single();

      // 2. Si no encontró, buscar por correo (primer login de responsable nuevo)
      if (userError || !userData) {
        const { data: byEmail } = await supabase
          .from('usuarios')
          .select('id, nombre, uuid')
          .eq('correo', session.user.email)
          .is('uuid', null)
          .single();

        if (byEmail) {
          await supabase
            .from('usuarios')
            .update({ uuid: session.user.id })
            .eq('id', byEmail.id);
          userData = { ...byEmail, uuid: session.user.id };
        }
      }

      if (!userData) {
        console.error("No se encontró el perfil de usuario");
        setLoading(false);
        return;
      }

      setSelectedSupervisor(userData);

      // 3. Cargar el resto de datos
      const { data: plantasData } = await supabase.from('plantas').select('id, nombre').order('nombre');
      if (plantasData) setPlantas(plantasData);

      const { data: superData } = await supabase.from('usuarios').select('id, nombre')
        .or('rol.eq.supervisor,rol.eq.calidad,rol.eq.desarrollador').order('nombre');
      if (superData) setSupervisores(superData);

      setLoading(false);
    }
    checkAuthAndFetchData();
  }, [router]);


  useEffect(() => {
    if (!selectedPlanta || !selectedSupervisor) return;
    if (selectedPlanta.nombre === 'Calidad' && !subSelection) return;

    async function fetchActividades() {
      if (!selectedPlanta) return;
      setLoadingActs(true);
      const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const today = dayNames[new Date().getDay()];
      
      if (today === 'sabado' || today === 'domingo') {
        setActividades([]);
        setLoadingActs(false);
        return;
      }

      let query = supabase.from('plantillas_actividades').select('*')
        .eq('id_planta', selectedPlanta.id).eq(today, true);

      if (selectedPlanta.nombre === 'Calidad') {
        if (subSelection === 'MS_FV') {
          query = query.or('sub_proceso.eq.MS_FV,sub_proceso.is.null');
        } else if (subSelection === 'MBL_CEFI') {
          query = query.eq('sub_proceso', 'MBL_CEFI');
        }
      }

      const { data: acts } = await query.order('horario', { ascending: true });

      if (acts) {
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

        const sortedActs = [...acts].sort((a, b) => {
          return parseHorarioToMinutes(a.horario) - parseHorarioToMinutes(b.horario);
        });

        setActividades(sortedActs);
      }

      const { data: progress } = await supabase.from('seguimiento_bitacora').select('id_actividad, completado, observaciones, id_supervisor')
        .eq('fecha', todayDate);

      if (progress) {
        const statusMap: Record<string, boolean> = {};
        const obsMap: Record<string, string> = {};
        const authMap: Record<string, number> = {};
        progress.forEach((item: Seguimiento) => {
          statusMap[item.id_actividad] = item.completado;
          obsMap[item.id_actividad] = item.observaciones || '';
          authMap[item.id_actividad] = item.id_supervisor;
        });
        setCompletados(statusMap);
        setObservaciones(obsMap);
        setAutorias(authMap);
      }
      setLoadingActs(false);
    }
    fetchActividades();
  }, [selectedPlanta, subSelection, todayDate, selectedSupervisor]);

  const toggleLocalCompletado = (actividadId: string) => {
    const newStatus = !completados[actividadId];
    setCompletados(prev => ({ ...prev, [actividadId]: newStatus }));
    setPendingChanges(prev => new Set(prev).add(actividadId));
    setSaveStatus('idle');
  };

  const updateLocalObservacion = (actividadId: string, text: string) => {
    setObservaciones(prev => ({ ...prev, [actividadId]: text }));
    setPendingChanges(prev => new Set(prev).add(actividadId));
    setSaveStatus('idle');
  };

  const handleSaveAll = async () => {
    if (pendingChanges.size === 0 || !selectedSupervisor) return;
    setSyncing(true);
    setSaveStatus('saving');

    const changesToSave = Array.from(pendingChanges).map(id => ({
      id_actividad: id,
      fecha: todayDate,
      id_supervisor: selectedSupervisor.id,
      completado: completados[id] || false,
      observaciones: observaciones[id] || ''
    }));

    try {
      const { error } = await supabase.from('seguimiento_bitacora').upsert(changesToSave, { onConflict: 'id_actividad, fecha' });
      if (!error) {
        setPendingChanges(new Set());
        setSaveStatus('success');
        const newAuthMap = { ...autorias };
        changesToSave.forEach(c => newAuthMap[c.id_actividad] = selectedSupervisor.id);
        setAutorias(newAuthMap);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        alert("Error al guardar: " + error.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getSupervisorName = (id: number) => supervisores.find(s => s.id === id)?.nombre || "Desconocido";

  const totalActividades = actividades.length;
  const completadas = actividades.filter(a => completados[a.id]).length;
  const porcentaje = totalActividades > 0 ? Math.round((completadas / totalActividades) * 100) : 0;

  if (loading) return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
      <Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} size={40} />
    </div>
  );

  if (!selectedSupervisor) return (
    <div className="container" style={{ textAlign: 'center', padding: '100px' }}>
      <p>Cargando perfil de usuario...</p>
    </div>
  );

  // Pantalla de Selección de Planta
  if (!selectedPlanta) {
    return (
      <div className="container animate-fade-in">
        <header style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}><LogOut size={16} /> Cerrar Sesión</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 600 }}><User size={18} /> {selectedSupervisor.nombre}</div>
          </div>
          <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 700, marginBottom: '8px' }}>Selecciona tu Proceso</h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>Elige la planta o área para hoy</p>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {plantas.map((planta) => (
            <div key={planta.id} className="card" onClick={() => setSelectedPlanta(planta)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', transition: 'transform 0.2s', borderTop: '5px solid var(--primary)' }} onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')} onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
              <div style={{ background: 'rgba(118, 149, 152, 0.1)', padding: '16px', borderRadius: '50%', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px' }}><ProcessIcon name={planta.nombre} size={48} /></div>
              <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.3rem', fontWeight: 700 }}>{planta.nombre}</h3>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Sub-selección para Calidad
  if (selectedPlanta.nombre === 'Calidad' && !subSelection) {
    return (
      <div className="container animate-fade-in">
        <header style={{ marginBottom: '40px' }}>
          <button onClick={() => setSelectedPlanta(null)} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', marginBottom: '12px', padding: 0 }}><ChevronLeft size={18} /> Volver a Procesos</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 700, margin: 0 }}>Calidad</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 600 }}><User size={18} /> {selectedSupervisor.nombre}</div>
          </div>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', paddingTop: '20px', maxWidth: '700px', margin: '0 auto' }}>
          <button onClick={() => setSubSelection('MS_FV')} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #e5e7eb', borderTop: '8px solid var(--header-bg)', borderRadius: '24px', transition: 'all 0.3s ease', background: 'white', padding: '32px 20px' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; }}>
            <div style={{ background: 'var(--header-bg)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '20px' }}><ProcessIcon name="MS_FV" size={52} /></div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', margin: 0 }}>MS y FV</h2>
          </button>
          <button onClick={() => setSubSelection('MBL_CEFI')} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #e5e7eb', borderTop: '8px solid var(--primary)', borderRadius: '24px', transition: 'all 0.3s ease', background: 'white', padding: '32px 20px' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; }}>
            <div style={{ background: 'var(--primary)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '20px' }}><ProcessIcon name="MBL_CEFI" size={52} /></div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', margin: 0 }}>MBL y CEFI</h2>
          </button>
        </div>
      </div>
    );
  }

  // Lista de Actividades
  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '140px' }}>
      <header style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <button onClick={() => { setSelectedPlanta(null); setSubSelection(null); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}><ChevronLeft size={18} /> Volver a Selección</button>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}><LogOut size={16} /> Cerrar Sesión</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 800, marginBottom: '4px' }}>Bitácora de Hoy</h1>
            <p style={{ color: '#666', fontSize: '1.1rem' }}>Proceso: <strong style={{ color: 'var(--primary)' }}>{subSelection || selectedPlanta.nombre}</strong></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem' }}><User size={20} /> {selectedSupervisor.nombre}</div>
            <div style={{ fontSize: '0.8rem', color: '#999' }}>Responsable</div>
          </div>
        </div>
      </header>

      {/* Progress Summary */}
      <div className="card" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '24px', background: 'var(--header-bg)', color: 'white' }}>
        <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg style={{ transform: 'rotate(-90deg)', width: '80px', height: '80px' }}>
            <circle cx="40" cy="40" r="35" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            <circle cx="40" cy="40" r="35" fill="transparent" stroke="var(--primary)" strokeWidth="8" strokeDasharray={220} strokeDashoffset={220 - (220 * porcentaje) / 100} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
          </svg>
          <span style={{ position: 'absolute', fontWeight: 800, fontSize: '1.2rem' }}>{porcentaje}%</span>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Progreso Diario</h3>
          <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>{completadas} de {totalActividades} actividades completadas</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Calendar size={24} style={{ opacity: 0.5, marginBottom: '8px' }} />
          <div style={{ fontWeight: 600 }}>{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
        </div>
      </div>

      {loadingActs ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} size={32} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {actividades.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: '#999', fontStyle: 'italic' }}>No hay actividades programadas.</div>
          ) : (
            actividades.map((item) => {
              const isDone = completados[item.id];
              const isPending = pendingChanges.has(item.id);
              const autorId = autorias[item.id];
              const hideObs = shouldHideObservations(item.actividad);
              const isExpanded = !!expanded[item.id];
              
              return (
                <div 
                  key={item.id} 
                  className="card animate-fade-in" 
                  onClick={() => toggleExpanded(item.id)}
                  style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    alignItems: 'center', 
                    padding: '10px 18px', 
                    borderLeft: isDone ? '5px solid var(--success)' : '5px solid #eee', 
                    borderRight: isPending ? '4px solid var(--primary)' : 'none', 
                    transition: 'all 0.2s ease', 
                    position: 'relative',
                    cursor: 'pointer',
                    background: isExpanded ? '#ffffff' : 'rgba(255, 255, 255, 0.95)',
                    boxShadow: isExpanded ? '0 8px 16px -4px rgba(0, 0, 0, 0.08)' : '0 2px 4px -1px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  {isPending && <div style={{ position: 'absolute', top: '4px', right: '10px', fontSize: '0.55rem', background: 'var(--primary)', color: 'white', padding: '1px 6px', borderRadius: '3px', fontWeight: 800 }}>CAMBIO SIN GUARDAR</div>}
                  
                  <div style={{ minWidth: '95px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <div style={{ background: isDone ? '#f0f0f0' : 'rgba(118, 149, 152, 0.1)', color: isDone ? '#999' : 'var(--primary)', padding: '4px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', width: '100%' }}><Clock size={12} />{item.horario}</div>
                    <div style={{ fontSize: '0.6rem', color: '#999', fontWeight: 800 }}>{item.tiempo_min} MIN</div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: isDone ? '#999' : 'var(--accent)', textDecoration: isDone ? 'line-through' : 'none', fontWeight: 700, marginBottom: isExpanded ? '4px' : '0' }}>{item.actividad}</h3>
                    {isExpanded && (
                      <>
                        {item.puntos_clave && (
                          <div style={{ fontSize: '0.75rem', color: isDone ? '#ccc' : '#555', marginBottom: '4px', marginTop: '4px', lineHeight: 1.3 }}>
                            {item.puntos_clave.split('•').filter(p => p.trim()).map((point, i) => (
                              <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '1px' }}><span style={{ color: 'var(--primary)' }}>•</span><span>{point.trim()}</span></div>
                            ))}
                          </div>
                        )}
                        {!hideObs && (
                          <div style={{ background: '#f8f9fa', padding: '6px 10px', borderRadius: '8px', marginTop: '4px' }} onClick={(e) => e.stopPropagation()}>
                            <textarea placeholder="Añadir observaciones..." value={observaciones[item.id] || ''} onChange={(e) => updateLocalObservacion(item.id, e.target.value)} style={{ width: '100%', minHeight: '36px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '6px', fontSize: '0.8rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                          </div>
                        )}
                        {autorId && (
                          <div style={{ marginTop: '4px', fontSize: '0.65rem', color: '#999', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Info size={10} /> Guardado por: <strong>{getSupervisorName(autorId)}</strong>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
                    {isExpanded ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <button onClick={() => toggleLocalCompletado(item.id)} style={{ background: isDone ? 'var(--success)' : 'white', color: isDone ? 'white' : '#ddd', border: isDone ? 'none' : '2px solid #eee', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                          {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                        </button>
                        <span style={{ fontSize: '0.55rem', fontWeight: 800, color: isDone ? 'var(--success)' : '#ccc' }}>{isDone ? 'LISTO' : 'PENDIENTE'}</span>
                      </div>
                    ) : (
                      isDone && <CheckCircle2 size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    )}
                    <div style={{ color: '#ccc', display: 'flex', alignItems: 'center' }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Floating Save Bar */}
      {pendingChanges.size > 0 && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: '500px', background: 'var(--header-bg)', borderRadius: '24px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.5)', zIndex: 1000, border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ color: 'white' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Cambios detectados</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{pendingChanges.size} por guardar</div>
          </div>
          <button onClick={handleSaveAll} disabled={syncing} style={{ background: saveStatus === 'success' ? 'var(--success)' : 'var(--primary)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}>
            {syncing ? <Loader2 className="animate-spin" size={16} /> : saveStatus === 'success' ? <Check size={16} /> : <Save size={16} />}
            {syncing ? 'Guardando...' : saveStatus === 'success' ? '¡Listo!' : 'Guardar'}
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {saveStatus === 'success' && pendingChanges.size === 0 && (
        <div style={{ position: 'fixed', top: '100px', left: '50%', transform: 'translateX(-50%)', background: 'var(--success)', color: 'white', padding: '12px 24px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)', zIndex: 1001, animation: 'fadeIn 0.3s ease-out' }}>
          <CheckCircle2 size={18} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Bitácora actualizada correctamente</span>
        </div>
      )}
    </div>
  );
}

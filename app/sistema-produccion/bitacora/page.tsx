'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  CheckCircle2, Circle, Clock, Loader2, Factory, 
  ChevronLeft, MessageSquare, Calendar, User, Save, Check, 
  LayoutDashboard, LogOut, Info, ChevronDown, ChevronUp
} from 'lucide-react'
import { ProcessIcon } from '@/components/ProcessIcon'
import Header from '@/components/opt-sistemica/Header'

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
  const [userEmail, setUserEmail] = useState('');

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
      
      setUserEmail(session.user.email || '');

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#324354] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F6F3EE]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F3EE] font-sans text-[#000000] relative overflow-x-hidden selection:bg-[#324354] selection:text-white bitacora-scope">
      
      {/* Background Subtle Gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-slate-200/40 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#324354]/5 blur-[120px]" />
      </div>

      {/* Dynamic Header */}
      <Header
        title="Bitácora"
        subtitle={selectedPlanta ? `${selectedPlanta.nombre} ${subSelection ? `- ${subSelection}` : ''}` : "Módulo Operativo"}
        userEmail={userEmail}
        showLogout={true}
        onLogout={handleLogout}
      />

      {/* Styles Scoping */}
      <style dangerouslySetInnerHTML={{ __html: `
        .bitacora-scope {
          --primary: #7B8E90;
          --primary-hover: #5d777a;
          --header-bg: #324354;
          --accent: #324354;
          --background: #F6F3EE;
          --foreground: #000000;
          --card-bg: rgba(255, 255, 255, 0.8);
          --glass-border: rgba(255, 255, 255, 0.2);
          --error: #d14747;
          --success: #59a96a;
        }
        .bitacora-scope .card {
          background: white;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 25px rgba(50,67,84,0.05);
          border: 1px solid #e2ded5;
          transition: all 0.3s ease;
        }
        .bitacora-scope .animate-fade-in {
          animation: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col justify-start p-6 md:p-12 pt-28 max-w-7xl mx-auto w-full">
        
        {/* Pantalla de Selección de Planta */}
        {!selectedPlanta && (
          <div className="w-full animate-fade-in">
            <header className="mb-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => router.push('/sistema-produccion')} 
                  className="flex items-center gap-2 text-[#324354] hover:text-[#324354]/80 font-bold text-sm transition cursor-pointer"
                >
                  <ChevronLeft size={18} />
                  <span>Volver a Sistema de Producción</span>
                </button>
              </div>
              <h2 className="text-3xl font-display font-light text-[#324354] tracking-widest uppercase mt-4">Selecciona tu Proceso</h2>
              <p className="text-slate-500 font-medium text-base">Elige la planta o área de producción que deseas consultar hoy.</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {plantas.map((planta) => (
                <div 
                  key={planta.id} 
                  className="card cursor-pointer flex flex-col items-center gap-6 text-center hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(50,67,84,0.1)] hover:border-[#324354] transition-all duration-300" 
                  onClick={() => setSelectedPlanta(planta)}
                >
                  <div className="w-20 h-20 bg-[#324354]/5 rounded-full flex items-center justify-center text-[#324354]">
                    <ProcessIcon name={planta.nombre} size={44} />
                  </div>
                  <h3 className="text-lg font-bold text-[#324354]">{planta.nombre}</h3>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sub-selección para Calidad */}
        {selectedPlanta && selectedPlanta.nombre === 'Calidad' && !subSelection && (
          <div className="w-full animate-fade-in">
            <header className="mb-10 flex flex-col gap-2">
              <button 
                onClick={() => setSelectedPlanta(null)} 
                className="flex items-center gap-2 text-[#324354] hover:text-[#324354]/80 font-bold text-sm transition cursor-pointer"
              >
                <ChevronLeft size={18} />
                <span>Volver a Procesos</span>
              </button>
              <h2 className="text-3xl font-display font-light text-[#324354] tracking-widest uppercase mt-4">Calidad</h2>
              <p className="text-slate-500 font-medium text-base">Selecciona el sub-proceso de calidad correspondiente.</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto w-full pt-4">
              <button 
                onClick={() => setSubSelection('MS_FV')} 
                className="card cursor-pointer flex flex-col items-center justify-center gap-6 hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(50,67,84,0.1)] hover:border-[#324354] transition-all duration-300 bg-white"
              >
                <div className="w-20 h-20 bg-[#324354]/5 rounded-full flex items-center justify-center text-[#324354]">
                  <ProcessIcon name="MS_FV" size={44} />
                </div>
                <h3 className="text-xl font-bold text-[#324354]">MS y FV</h3>
              </button>

              <button 
                onClick={() => setSubSelection('MBL_CEFI')} 
                className="card cursor-pointer flex flex-col items-center justify-center gap-6 hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(50,67,84,0.1)] hover:border-[#324354] transition-all duration-300 bg-white"
              >
                <div className="w-20 h-20 bg-[#324354]/5 rounded-full flex items-center justify-center text-[#324354]">
                  <ProcessIcon name="MBL_CEFI" size={44} />
                </div>
                <h3 className="text-xl font-bold text-[#324354]">MBL y CEFI</h3>
              </button>
            </div>
          </div>
        )}

        {/* Lista de Actividades de la Planta seleccionada */}
        {selectedPlanta && (selectedPlanta.nombre !== 'Calidad' || subSelection) && (
          <div className="w-full animate-fade-in pb-28">
            <header className="mb-8 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => { setSelectedPlanta(null); setSubSelection(null); }} 
                  className="flex items-center gap-2 text-[#324354] hover:text-[#324354]/80 font-bold text-sm transition cursor-pointer"
                >
                  <ChevronLeft size={18} />
                  <span>Volver a Selección</span>
                </button>
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
                <div>
                  <h2 className="text-3xl font-display font-light text-[#324354] tracking-widest uppercase">Bitácora de Hoy</h2>
                  <p className="text-slate-500 font-medium text-base mt-1">
                    Proceso activo: <strong className="text-[#7B8E90]">{subSelection || selectedPlanta.nombre}</strong>
                  </p>
                </div>
                <div className="bg-[#324354]/5 border border-[#e2ded5] rounded-2xl px-5 py-3 flex items-center gap-3">
                  <Calendar className="text-[#324354]" size={20} />
                  <div className="text-sm font-bold text-[#324354]">
                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                </div>
              </div>
            </header>

            {/* Progress summary card */}
            <div className="card bg-[#324354] text-white flex flex-col sm:flex-row items-center gap-6 mb-8 shadow-lg border-none relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-20 h-20 -rotate-90">
                  <circle cx="40" cy="40" r="35" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                  <circle 
                    cx="40" 
                    cy="40" 
                    r="35" 
                    fill="transparent" 
                    stroke="#7B8E90" 
                    strokeWidth="6" 
                    strokeDasharray={220} 
                    strokeDashoffset={220 - (220 * porcentaje) / 100} 
                    strokeLinecap="round" 
                    style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }} 
                  />
                </svg>
                <span className="absolute font-bold text-lg">{porcentaje}%</span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-bold mb-1">Progreso Diario</h3>
                <p className="text-white/80 text-sm font-medium">{completadas} de {totalActividades} tareas programadas completadas para hoy.</p>
              </div>
            </div>

            {/* Activity list */}
            {loadingActs ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="animate-spin text-[#324354]" size={36} />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {actividades.length === 0 ? (
                  <div className="card text-center text-slate-400 italic py-10">No hay actividades programadas para este día.</div>
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
                        className="card overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer border border-[#e2ded5] relative"
                        onClick={() => toggleExpanded(item.id)}
                        style={{
                          borderLeft: isDone ? '6px solid #59a96a' : '6px solid #e2ded5',
                          borderRight: isPending ? '4px solid #7B8E90' : '1px solid #e2ded5',
                          background: isExpanded ? '#ffffff' : 'rgba(255, 255, 255, 0.9)'
                        }}
                      >
                        {isPending && (
                          <div className="absolute top-2 right-12 text-[9px] bg-[#7B8E90] text-white px-2 py-0.5 rounded font-bold tracking-wider">
                            CAMBIO PENDIENTE
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* Clock and schedule info */}
                            <div className="flex flex-col items-center bg-[#324354]/5 rounded-xl py-2 px-3 min-w-[90px] shrink-0 text-center">
                              <span className="text-xs font-bold text-[#324354] flex items-center gap-1"><Clock size={12} />{item.horario}</span>
                              <span className="text-[10px] font-semibold text-slate-500 mt-0.5">{item.tiempo_min} MIN</span>
                            </div>

                            {/* Task name */}
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-base font-bold text-[#324354] transition-all truncate ${isDone ? 'line-through text-slate-400' : ''}`}>
                                {item.actividad}
                              </h4>
                              {isExpanded && item.entregable && (
                                <p className="text-xs text-[#7B8E90] mt-1 font-medium italic">
                                  Entregable: {item.entregable}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                            {isExpanded ? (
                              <button 
                                onClick={() => toggleLocalCompletado(item.id)} 
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 border cursor-pointer ${
                                  isDone 
                                    ? 'bg-[#59a96a] border-[#59a96a] text-white' 
                                    : 'bg-white border-[#e2ded5] text-slate-300 hover:border-[#324354] hover:text-[#324354]'
                                }`}
                              >
                                {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                              </button>
                            ) : (
                              isDone && <CheckCircle2 className="text-[#59a96a] shrink-0" size={22} />
                            )}
                            <div className="text-slate-400 shrink-0">
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded detail box */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-[#e2ded5] flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                            {item.puntos_clave && (
                              <div className="bg-[#324354]/5 rounded-2xl p-4 text-sm text-[#324354]">
                                <h5 className="font-bold mb-2 uppercase tracking-wider text-xs text-[#7B8E90]">Puntos Clave:</h5>
                                <div className="flex flex-col gap-1.5 font-medium">
                                  {item.puntos_clave.split('•').filter(p => p.trim()).map((point, i) => (
                                    <div key={i} className="flex gap-2 items-start">
                                      <span className="text-[#7B8E90] font-bold">•</span>
                                      <span>{point.trim()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {!hideObs && (
                              <div className="flex flex-col gap-1.5">
                                <span className="font-bold text-xs uppercase tracking-wider text-[#7B8E90]">Observaciones del Turno:</span>
                                <textarea 
                                  placeholder="Añade algún comentario o incidente..." 
                                  value={observaciones[item.id] || ''} 
                                  onChange={(e) => updateLocalObservacion(item.id, e.target.value)} 
                                  className="w-full min-h-[70px] border border-[#e2ded5] rounded-xl p-3 text-sm outline-none focus:border-[#324354] transition bg-[#F6F3EE] resize-vertical" 
                                />
                              </div>
                            )}

                            {autorId && (
                              <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mt-1">
                                <Info size={12} /> Última actualización por: <strong className="text-slate-500">{getSupervisorName(autorId)}</strong>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Floating save bar */}
        {pendingChanges.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[500px] bg-[#324354] text-white rounded-3xl p-4 flex items-center justify-between shadow-2xl border border-white/10 z-50 animate-bounce">
            <div className="flex flex-col">
              <span className="font-bold text-sm">Cambios pendientes</span>
              <span className="text-xs text-white/70 font-semibold">{pendingChanges.size} tareas por registrar</span>
            </div>
            <button 
              onClick={handleSaveAll} 
              disabled={syncing}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition flex items-center gap-2 ${
                saveStatus === 'success' ? 'bg-[#59a96a] text-white' : 'bg-[#7B8E90] hover:bg-[#7B8E90]/90 text-white'
              }`}
            >
              {syncing ? <Loader2 className="animate-spin" size={16} /> : saveStatus === 'success' ? <Check size={16} /> : <Save size={16} />}
              {syncing ? 'Guardando...' : saveStatus === 'success' ? '¡Guardado!' : 'Guardar Cambios'}
            </button>
          </div>
        )}

        {/* Toast Alert */}
        {saveStatus === 'success' && pendingChanges.size === 0 && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-[#59a96a] text-white py-3.5 px-6 rounded-full flex items-center gap-2 shadow-xl z-50 font-bold text-sm tracking-wide">
            <CheckCircle2 size={18} />
            <span>Bitácora guardada exitosamente</span>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} Firplak. Todos los derechos reservados.
      </footer>
    </div>
  );
}

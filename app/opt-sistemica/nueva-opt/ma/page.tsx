'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import Header from '@/components/opt-sistemica/Header';
import FirplakLogo from '@/components/opt-sistemica/FirplakLogo';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { createExternalClient } from '@/lib/supabase/external';
import { Wrench, Search, Upload, Info, CheckCircle2, AlertTriangle, XCircle, Eye } from 'lucide-react';

interface Machine {
  id: string | number;
  nombre_equipo: string;
  nombre_alterno: string | null;
  planta: string | null;
  proceso: string | null;
  codigo_equipo: string | null;
}

interface ChecklistHeader {
  id_puesta_a_punto: string;
  nombre_puesta_a_punto: string;
  proceso: string | null;
  planta: string | null;
}

interface ChecklistItem {
  id_detalle: string;
  equipo_herramienta: string;
  punto_a_revisar: string;
  criticidad: string;
  frecuencia: string;
  numero_item: number;
}

export default function MantenimientoAutonomoPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persona a quien se le realiza la OPT
  const [personas, setPersonas] = useState<string[]>([]);
  const [personaEvaluada, setPersonaEvaluada] = useState('');

  // Data sources
  const [machines, setMachines] = useState<Machine[]>([]);
  const [checklists, setChecklists] = useState<ChecklistHeader[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  // Selection states
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>('');
  const [machineSearch, setMachineSearch] = useState('');
  const [showMachineDropdown, setShowMachineDropdown] = useState(false);

  // File uploading mock state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Dynamic responses state for checklist items
  const [chkResponses, setChkResponses] = useState<Record<string, { value: 'B' | 'R' | 'M' | 'N/A' | null, comment: string, text: string }>>({});

  // Static responses state
  // 3.1: Tablero
  // 4.1: Reporte
  // 5.1: Estado general (Campo abierto)
  // 6.1: Operario conoce
  // 7.1: Recepcion maquina (Campo abierto)
  // 8.1: Operario entrenado
  // 9.1: HILU
  const [staticResponses, setStaticResponses] = useState({
    '3.1': { value: null as 'SI' | 'NO' | 'N/A' | null, comment: '' },
    '4.1': { value: null as 'SI' | 'NO' | 'N/A' | null, comment: '' },
    '5.1': { value: '', comment: '' }, // Campo abierto
    '6.1': { value: null as 'SI' | 'NO' | 'N/A' | null, comment: '' },
    '7.1': { value: '', comment: '' }, // Campo abierto
    '8.1': { value: null as 'SI' | 'NO' | 'N/A' | null, comment: '' },
    '9.1': { value: null as 'SI' | 'NO' | 'N/A' | null, comment: '' },
  });

  const [actionPlans, setActionPlans] = useState('');

  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        loadInitialData();
      }
    });
  }, [router]);

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const externalSupabase = createExternalClient();
        const { data, error: err } = await externalSupabase
          .from('empleados')
          .select('nombreCompleto')
          .eq('activo', true)
          .order('nombreCompleto', { ascending: true });
        if (!err && data) {
          setPersonas(data.map((d: any) => d.nombreCompleto));
        }
      } catch (err) {
        console.error('Error fetching empleados:', err);
      }
    };
    fetchPersonas();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch machines
      const { data: machData, error: machErr } = await supabase
        .from('maquinas_equipos')
        .select('id, nombre_equipo, nombre_alterno, planta, proceso, codigo_equipo')
        .order('nombre_equipo', { ascending: true });

      if (machErr) throw machErr;
      setMachines(machData || []);

      // 2. Fetch checklist headers
      const { data: chkData, error: chkErr } = await supabase
        .from('puestas_a_punto_encabezado')
        .select('id_puesta_a_punto, nombre_puesta_a_punto, proceso, planta');

      if (chkErr) throw chkErr;
      setChecklists(chkData || []);
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Error al cargar máquinas y checklists desde la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered machines for search dropdown
  const filteredMachines = useMemo(() => {
    const query = machineSearch.toLowerCase().trim();
    if (!query) return machines;
    return machines.filter(m => 
      (m.nombre_equipo || '').toLowerCase().includes(query) ||
      (m.nombre_alterno || '').toLowerCase().includes(query) ||
      (m.codigo_equipo || '').toLowerCase().includes(query)
    );
  }, [machines, machineSearch]);

  const handleSelectMachine = (machine: Machine) => {
    setSelectedMachineId(String(machine.id));
    setMachineSearch(machine.nombre_alterno || machine.nombre_equipo);
    setShowMachineDropdown(false);

    // Auto-match checklist based on name / process
    const machineName = (machine.nombre_alterno || machine.nombre_equipo || '').toLowerCase();
    const machineProcess = (machine.proceso || '').toLowerCase();

    const matched = checklists.find(c => {
      const cName = (c.nombre_puesta_a_punto || '').toLowerCase();
      const cProc = (c.proceso || '').toLowerCase();
      return (
        machineName.includes(cName) || 
        cName.includes(machineName) || 
        (machineProcess && cProc && (machineProcess.includes(cProc) || cProc.includes(machineProcess)))
      );
    });

    if (matched) {
      setSelectedChecklistId(matched.id_puesta_a_punto);
    } else {
      setSelectedChecklistId('');
    }
  };

  // Load checklist items when selected checklist changes
  useEffect(() => {
    if (!selectedChecklistId) {
      setChecklistItems([]);
      setChkResponses({});
      return;
    }

    const loadItems = async () => {
      try {
        const { data, error: err } = await supabase
          .from('puestas_a_punto_detalle')
          .select('*')
          .eq('id_puesta_a_punto', selectedChecklistId)
          .order('numero_item', { ascending: true });

        if (err) throw err;

        setChecklistItems(data || []);

        const initial: typeof chkResponses = {};
        (data || []).forEach(item => {
          initial[item.id_detalle] = { 
            value: null, 
            comment: '', 
            text: `${item.equipo_herramienta || 'GENERAL'} - ${item.punto_a_revisar}` 
          };
        });
        setChkResponses(initial);
      } catch (err) {
        console.error('Error fetching checklist items:', err);
        setError('Error al cargar ítems del checklist.');
      }
    };

    loadItems();
  }, [selectedChecklistId]);

  const handleChecklistStatusChange = (id: string, value: 'B' | 'R' | 'M' | 'N/A') => {
    setChkResponses(prev => {
      const current = prev[id];
      if (!current) return prev;
      const newValue = current.value === value ? null : value;
      return {
        ...prev,
        [id]: { ...current, value: newValue }
      };
    });
  };

  const handleChecklistCommentChange = (id: string, comment: string) => {
    setChkResponses(prev => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: { ...current, comment }
      };
    });
  };

  const handleStaticStatusChange = (key: keyof typeof staticResponses, value: 'SI' | 'NO' | 'N/A') => {
    setStaticResponses(prev => {
      const current = prev[key];
      const newValue = current.value === value ? null : value;
      return {
        ...prev,
        [key]: { ...current, value: newValue }
      };
    });
  };

  const handleStaticCommentChange = (key: keyof typeof staticResponses, comment: string) => {
    setStaticResponses(prev => ({
      ...prev,
      [key]: { ...prev[key], comment }
    }));
  };

  const handleStaticValueChange = (key: '5.1' | '7.1', value: string) => {
    setStaticResponses(prev => ({
      ...prev,
      [key]: { ...prev[key], value }
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
    }
  };

  // Grade calculation
  const percentage = useMemo(() => {
    let totalPoints = 0;
    let evaluatedCount = 0;

    // 1. Evaluate checklist items
    Object.values(chkResponses).forEach(r => {
      if (r.value !== null && r.value !== 'N/A') {
        evaluatedCount++;
        if (r.value === 'B') totalPoints += 1;
        else if (r.value === 'R') totalPoints += 0.5;
      }
    });

    // 2. Evaluate static questions (3.1, 4.1, 6.1, 8.1, 9.1)
    const evaluatedKeys: (keyof typeof staticResponses)[] = ['3.1', '4.1', '6.1', '8.1', '9.1'];
    evaluatedKeys.forEach(key => {
      const r = staticResponses[key];
      if (r.value !== null && r.value !== 'N/A') {
        evaluatedCount++;
        if (r.value === 'SI') totalPoints += 1;
      }
    });

    if (evaluatedCount === 0) return '0.00';
    return ((totalPoints / evaluatedCount) * 100).toFixed(2);
  }, [chkResponses, staticResponses]);

  const handleSave = async () => {
    if (!personaEvaluada) {
      setError('Por favor selecciona la persona a quien se le realiza la OPT.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!selectedMachineId) {
      setError('Por favor selecciona una máquina antes de guardar.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate that checklist is loaded and completely answered
    if (checklistItems.length > 0) {
      const unansweredChk = Object.entries(chkResponses).filter(([_, r]) => r.value === null);
      if (unansweredChk.length > 0) {
        setError(`Por favor califica todos los puntos del checklist del Autónomo (${unansweredChk.length} pendientes).`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Check R & M require comments
      const pendingComments = Object.entries(chkResponses).filter(([_, r]) => 
        (r.value === 'R' || r.value === 'M') && (!r.comment || !r.comment.trim())
      );
      if (pendingComments.length > 0) {
        setError(`Por favor agregue una observación para cada punto marcado como Regular (R) o Malo (M) en el checklist.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // Validate static questions are answered
    const unansweredStatic = ['3.1', '4.1', '6.1', '8.1', '9.1'].filter(key => 
      staticResponses[key as keyof typeof staticResponses].value === null
    );
    if (unansweredStatic.length > 0) {
      setError(`Por favor responde todas las preguntas del formulario (${unansweredStatic.length} pendientes).`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate open fields
    if (!staticResponses['5.1'].value.trim()) {
      setError('Por favor describe el estado general y de limpieza de la máquina.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!staticResponses['7.1'].value.trim()) {
      setError('Por favor describe cómo el operario recibe la máquina del turno anterior.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Map all responses together
      const responses: Record<string, { value: string | null, comment: string, text?: string }> = {};
      
      // Store dynamic checklist responses
      Object.entries(chkResponses).forEach(([id, r]) => {
        responses[`CHK_${id}`] = { 
          value: r.value, 
          comment: r.comment, 
          text: `[Checklist Autónomo] ${r.text}` 
        };
      });

      // Store static responses
      responses['3.1'] = { value: staticResponses['3.1'].value, comment: staticResponses['3.1'].comment, text: "Verificar si se está llenando el tablero de autónomo de la máquina (Ver foto)" };
      responses['4.1'] = { value: staticResponses['4.1'].value, comment: staticResponses['4.1'].comment, text: "Verificar si tiene reporte de observaciones" };
      responses['5.1'] = { value: 'Campo Abierto', comment: staticResponses['5.1'].value, text: "Verificar estado general y de limpieza de la máquina (Campo Abierto)" };
      responses['6.1'] = { value: staticResponses['6.1'].value, comment: staticResponses['6.1'].comment, text: "¿El operario del puesto ha realizado el mantenimiento autónomo y lo conoce?" };
      responses['7.1'] = { value: 'Campo Abierto', comment: staticResponses['7.1'].value, text: "¿Cómo está recibiendo la máquina diariamente del turno anterior?" };
      responses['8.1'] = { value: staticResponses['8.1'].value, comment: staticResponses['8.1'].comment, text: "¿El operario está entrenado para realizar el mantenimiento autónomo?" };
      responses['9.1'] = { value: staticResponses['9.1'].value, comment: staticResponses['9.1'].comment, text: "Verificar si en la HILU está validada la casilla de Mantenimiento Autónomo" };

      // Machine metadata
      const machObj = machines.find(m => String(m.id) === selectedMachineId);
      responses['MAQUINA_ID'] = { value: selectedMachineId, comment: machObj ? (machObj.nombre_alterno || machObj.nombre_equipo) : '' };
      if (selectedChecklistId) {
        const chkObj = checklists.find(c => c.id_puesta_a_punto === selectedChecklistId);
        responses['CHECKLIST_ID'] = { value: selectedChecklistId, comment: chkObj ? chkObj.nombre_puesta_a_punto : '' };
      }

      const { error: insertError } = await supabase
        .from('opt_registros')
        .insert({
          user_id: session.user.id,
          user_email: session.user.email,
          modulo_tipo: 'MA',
          persona_evaluada: personaEvaluada,
          percentage: parseFloat(percentage),
          responses: responses,
          action_plans: actionPlans
        });

      if (insertError) throw insertError;

      // Automatically update status in scheduled planning if matches
      const todayStr = new Date().toISOString().split('T')[0];
      await supabase
        .from('opt_planificacion')
        .update({ estado: 'EJECUTADA' })
        .eq('responsable_email', session.user.email)
        .eq('modulo_tipo', 'MA')
        .eq('fecha_programada', todayStr)
        .eq('estado', 'PENDIENTE');

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      setError('Error al guardar el registro de Mantenimiento Autónomo. Inténtalo nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#324354] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F6F3EE]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F3EE] font-sans text-[#000000] selection:bg-[#324354] selection:text-white w-full pb-20">
      <Header
        title="Mantenimiento Autónomo"
        subtitle="Registro de Auditoría"
        backUrl="/opt-sistemica/nueva-opt"
        userEmail={session?.user?.email || ''}
      />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 pt-28">
        
        {/* Banner de Calificación Flotante */}
        <div className="bg-white rounded-3xl p-6 border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl">
              <Wrench size={32} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[#324354]">Mantenimiento Autónomo (MA)</h1>
              <p className="text-sm text-slate-500 font-medium">Calificación en tiempo real basada en respuestas del auditor</p>
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Cumplimiento</span>
            <span className="text-3xl md:text-4xl font-extrabold text-[#324354]">{percentage}%</span>
          </div>
        </div>

        {/* Notificaciones */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 font-medium text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-2xl mb-6 font-medium text-sm flex items-center gap-3">
            <CheckCircle2 className="text-emerald-600" />
            <div>
              <strong className="block text-emerald-900 font-bold">¡Registro Guardado!</strong>
              El reporte de Mantenimiento Autónomo ha sido persistido con éxito en el historial de la OPT Sistémica.
            </div>
          </div>
        )}

        {/* Sección 0: Persona a quien se le realiza la OPT */}
        <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] p-6 md:p-8 mb-8">
          <h2 className="text-lg font-bold text-[#324354] mb-4 flex items-center gap-2">
            <span className="bg-[#324354]/5 w-8 h-8 rounded-full flex items-center justify-center text-xs">0</span>
            Persona a quien se le realiza la OPT
          </h2>
          <SearchableSelect
            name="persona_evaluada"
            options={personas}
            placeholder="Buscar y seleccionar persona..."
            required={true}
            defaultValue={personaEvaluada}
            onValueChange={setPersonaEvaluada}
          />
        </div>

        {/* Sección 1: Selección de Máquina */}
        <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] p-6 md:p-8 mb-8 relative">
          <h2 className="text-lg font-bold text-[#324354] mb-4 flex items-center gap-2">
            <span className="bg-[#324354]/5 w-8 h-8 rounded-full flex items-center justify-center text-xs">1</span>
            Identificación de la Máquina o Equipo
          </h2>

          <div className="relative">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Máquina / Equipo</label>
            <div className="relative">
              <input 
                type="text" 
                value={machineSearch}
                onChange={(e) => {
                  setMachineSearch(e.target.value);
                  setShowMachineDropdown(true);
                }}
                onFocus={() => setShowMachineDropdown(true)}
                placeholder="Busca y selecciona una máquina..." 
                className="w-full bg-[#fcfbfa] border border-[#d8d3c5] rounded-2xl py-3.5 pl-11 pr-4 text-base font-medium outline-none focus:border-[#324354] transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>

            {showMachineDropdown && filteredMachines.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-[#e2ded5] rounded-2xl shadow-xl max-h-60 overflow-y-auto z-50">
                {filteredMachines.map(m => (
                  <button 
                    key={m.id}
                    onClick={() => handleSelectMachine(m)}
                    className="w-full px-5 py-3.5 text-left font-medium hover:bg-slate-50 border-b border-slate-100 last:border-none flex justify-between items-center transition-colors"
                  >
                    <div>
                      <span className="text-[#324354] block">{m.nombre_alterno || m.nombre_equipo}</span>
                      <span className="text-xs text-slate-400 block mt-0.5">{m.codigo_equipo || 'Sin Código'} • {m.proceso || 'Sin Proceso'}</span>
                    </div>
                    <span className="text-xs font-bold text-[#7B8E90] bg-[#7B8E90]/5 px-2.5 py-1 rounded-full uppercase tracking-wider">{m.planta || 'Planta'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedMachineId && (
            <div className="mt-6 p-4 rounded-2xl bg-[#F6F3EE]/50 border border-[#e2ded5] flex flex-wrap gap-6 items-center">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Checklist Autónomo Cargado</span>
                <div className="mt-1">
                  {selectedChecklistId ? (
                    <select 
                      value={selectedChecklistId}
                      onChange={(e) => setSelectedChecklistId(e.target.value)}
                      className="bg-transparent border-b-2 border-slate-300 py-1 font-bold text-slate-700 outline-none text-base cursor-pointer focus:border-[#324354] transition-all"
                    >
                      {checklists.map(c => (
                        <option key={c.id_puesta_a_punto} value={c.id_puesta_a_punto}>{c.nombre_puesta_a_punto}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-slate-500 font-bold flex items-center gap-2">
                      <AlertTriangle className="text-amber-500" size={16} />
                      No se detectó un checklist directo. 
                      <select 
                        value={selectedChecklistId}
                        onChange={(e) => setSelectedChecklistId(e.target.value)}
                        className="bg-[#fcfbfa] border border-[#d8d3c5] rounded-xl py-1 px-3 ml-2 text-sm text-slate-700 outline-none font-bold"
                      >
                        <option value="">-- Seleccionar checklist manual --</option>
                        {checklists.map(c => (
                          <option key={c.id_puesta_a_punto} value={c.id_puesta_a_punto}>{c.nombre_puesta_a_punto}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sección 2: Checklist dinámico */}
        {selectedChecklistId && checklistItems.length > 0 && (
          <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] p-6 md:p-8 mb-8">
            <h2 className="text-lg font-bold text-[#324354] mb-2 flex items-center gap-2">
              <span className="bg-[#324354]/5 w-8 h-8 rounded-full flex items-center justify-center text-xs">2</span>
              Checklist de Verificación del Autónomo (Máquina)
            </h2>
            <p className="text-slate-400 text-xs font-medium mb-6">Audita las actividades operativas de la máquina y califica según estado</p>

            <div className="space-y-6">
              {checklistItems.map((item, idx) => {
                const response = chkResponses[item.id_detalle] || { value: null, comment: '' };
                const isCommentRequired = response.value === 'R' || response.value === 'M';

                return (
                  <div key={item.id_detalle} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <span className="text-xs font-bold text-[#7B8E90] uppercase tracking-wider block mb-1">
                          {item.equipo_herramienta || 'COMPONENTE'} • Item {item.numero_item || (idx + 1)}
                        </span>
                        <h4 className="text-[15px] font-bold text-[#324354] leading-relaxed">{item.punto_a_revisar}</h4>
                      </div>
                      
                      {/* B, R, M Toggles */}
                      <div className="flex items-center gap-2">
                        {[
                          { val: 'B', label: 'B', color: 'bg-emerald-600 border-emerald-600', text: 'Bueno' },
                          { val: 'R', label: 'R', color: 'bg-amber-500 border-amber-500', text: 'Regular' },
                          { val: 'M', label: 'M', color: 'bg-red-600 border-red-600', text: 'Malo' },
                          { val: 'N/A', label: 'N/A', color: 'bg-slate-500 border-slate-500', text: 'N/A' },
                        ].map(opt => {
                          const isActive = response.value === opt.val;
                          return (
                            <button
                              key={opt.val}
                              onClick={() => handleChecklistStatusChange(item.id_detalle, opt.val as any)}
                              className={`w-11 h-11 rounded-full font-extrabold border-2 transition-all flex items-center justify-center text-sm cursor-pointer ${
                                isActive 
                                  ? `${opt.color} text-white shadow-md scale-105` 
                                  : 'border-slate-300 text-slate-400 bg-white hover:border-slate-400'
                              }`}
                              title={opt.text}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Observaciones (obligatoria si R o M) */}
                    <div>
                      <input 
                        type="text" 
                        value={response.comment}
                        onChange={(e) => handleChecklistCommentChange(item.id_detalle, e.target.value)}
                        placeholder={isCommentRequired ? "⚠️ Se requiere comentario describiendo el hallazgo..." : "Observaciones adicionales..."}
                        className={`w-full bg-white border rounded-xl py-2 px-4 text-sm font-medium outline-none transition-all ${
                          isCommentRequired && !response.comment.trim() 
                            ? 'border-red-300 focus:border-red-500 bg-red-50/10 placeholder-red-400' 
                            : 'border-slate-200 focus:border-slate-400'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sección 3: Preguntas de Auditoría */}
        <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] p-6 md:p-8 mb-8">
          <h2 className="text-lg font-bold text-[#324354] mb-6 flex items-center gap-2">
            <span className="bg-[#324354]/5 w-8 h-8 rounded-full flex items-center justify-center text-xs">3</span>
            Verificaciones y Preguntas Prácticas
          </h2>

          <div className="space-y-8">
            
            {/* 3.1: Tablero Autónomo */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <span className="text-xs font-bold text-[#7B8E90] uppercase tracking-wider block mb-1">Verificación 3.1</span>
                  <h4 className="text-[15px] font-bold text-[#324354] leading-relaxed">
                    ¿Se está llenando el tablero de autónomo de la máquina?
                  </h4>
                  <div className="flex items-center gap-4 mt-2">
                    <button 
                      onClick={() => setShowPhotoModal(true)}
                      className="text-xs font-bold text-[#324354] hover:underline flex items-center gap-1.5 cursor-pointer bg-[#324354]/5 px-3 py-1.5 rounded-full"
                    >
                      <Eye size={14} /> Ver Foto de Referencia
                    </button>
                    
                    <label className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer bg-[#7B8E90]/10 px-3 py-1.5 rounded-full">
                      <Upload size={14} /> {uploadedFileName ? "Foto Adjunta" : "Adjuntar Foto"}
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                  {uploadedFileName && (
                    <span className="text-xs font-bold text-emerald-600 block mt-2">✓ Imagen cargada: {uploadedFileName}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {[
                    { val: 'SI', label: 'SI', color: 'bg-[#324354] border-[#324354]' },
                    { val: 'NO', label: 'NO', color: 'bg-red-600 border-red-600' },
                    { val: 'N/A', label: 'N/A', color: 'bg-slate-500 border-slate-500' },
                  ].map(opt => {
                    const isActive = staticResponses['3.1'].value === opt.val;
                    return (
                      <button
                        key={opt.val}
                        onClick={() => handleStaticStatusChange('3.1', opt.val as any)}
                        className={`w-14 h-11 rounded-xl font-bold border-2 transition-all flex items-center justify-center text-[13px] cursor-pointer ${
                          isActive 
                            ? `${opt.color} text-white shadow-md` 
                            : 'border-slate-300 text-slate-400 bg-white hover:border-slate-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <input 
                type="text" 
                value={staticResponses['3.1'].comment}
                onChange={(e) => handleStaticCommentChange('3.1', e.target.value)}
                placeholder="Comentarios sobre el tablero autónomo..."
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm outline-none focus:border-slate-400"
              />
            </div>

            {/* 4.1: Reporte de Observaciones */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <span className="text-xs font-bold text-[#7B8E90] uppercase tracking-wider block mb-1">Verificación 4.1</span>
                  <h4 className="text-[15px] font-bold text-[#324354] leading-relaxed">
                    ¿Tiene reporte de observaciones?
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  {[
                    { val: 'SI', label: 'SI', color: 'bg-[#324354] border-[#324354]' },
                    { val: 'NO', label: 'NO', color: 'bg-red-600 border-red-600' },
                    { val: 'N/A', label: 'N/A', color: 'bg-slate-500 border-slate-500' },
                  ].map(opt => {
                    const isActive = staticResponses['4.1'].value === opt.val;
                    return (
                      <button
                        key={opt.val}
                        onClick={() => handleStaticStatusChange('4.1', opt.val as any)}
                        className={`w-14 h-11 rounded-xl font-bold border-2 transition-all flex items-center justify-center text-[13px] cursor-pointer ${
                          isActive 
                            ? `${opt.color} text-white shadow-md` 
                            : 'border-slate-300 text-slate-400 bg-white hover:border-slate-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <input 
                type="text" 
                value={staticResponses['4.1'].comment}
                onChange={(e) => handleStaticCommentChange('4.1', e.target.value)}
                placeholder="Observaciones o reporte de desvíos..."
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm outline-none focus:border-slate-400"
              />
            </div>

            {/* 5.1: Estado y Limpieza General (Campo Abierto) */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <span className="text-xs font-bold text-[#7B8E90] uppercase tracking-wider block">Verificación 5.1</span>
              <h4 className="text-[15px] font-bold text-[#324354] leading-relaxed">
                Verificar estado general y de limpieza de la máquina (Campo Abierto)
              </h4>
              <textarea 
                value={staticResponses['5.1'].value}
                onChange={(e) => handleStaticValueChange('5.1', e.target.value)}
                rows={3}
                placeholder="Escribe una descripción completa del estado general de conservación, suciedad, fugas o viruta observada en el equipo..."
                className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm outline-none focus:border-slate-400 font-medium resize-y"
              />
            </div>

            {/* 6.1: Realiza y conoce el autónomo */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <span className="text-xs font-bold text-[#7B8E90] uppercase tracking-wider block mb-1">Pregunta al Operario 6.1</span>
                  <h4 className="text-[15px] font-bold text-[#324354] leading-relaxed">
                    ¿El operario del puesto ha realizado el mantenimiento autónomo y lo conoce?
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  {[
                    { val: 'SI', label: 'SI', color: 'bg-[#324354] border-[#324354]' },
                    { val: 'NO', label: 'NO', color: 'bg-red-600 border-red-600' },
                    { val: 'N/A', label: 'N/A', color: 'bg-slate-500 border-slate-500' },
                  ].map(opt => {
                    const isActive = staticResponses['6.1'].value === opt.val;
                    return (
                      <button
                        key={opt.val}
                        onClick={() => handleStaticStatusChange('6.1', opt.val as any)}
                        className={`w-14 h-11 rounded-xl font-bold border-2 transition-all flex items-center justify-center text-[13px] cursor-pointer ${
                          isActive 
                            ? `${opt.color} text-white shadow-md` 
                            : 'border-slate-300 text-slate-400 bg-white hover:border-slate-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <input 
                type="text" 
                value={staticResponses['6.1'].comment}
                onChange={(e) => handleStaticCommentChange('6.1', e.target.value)}
                placeholder="Comentarios sobre la respuesta del operario..."
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm outline-none focus:border-slate-400"
              />
            </div>

            {/* 7.1: Cómo recibe la máquina del turno anterior */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <span className="text-xs font-bold text-[#7B8E90] uppercase tracking-wider block">Pregunta al Operario 7.1</span>
              <h4 className="text-[15px] font-bold text-[#324354] leading-relaxed">
                ¿Cómo está recibiendo la máquina diariamente del turno anterior? (Campo Abierto)
              </h4>
              <textarea 
                value={staticResponses['7.1'].value}
                onChange={(e) => handleStaticValueChange('7.1', e.target.value)}
                rows={3}
                placeholder="Consigne las palabras del operario sobre la entrega y el estado en el que le entregan el equipo sus compañeros del turno anterior..."
                className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm outline-none focus:border-slate-400 font-medium resize-y"
              />
            </div>

            {/* 8.1: Entrenado para autónomo */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <span className="text-xs font-bold text-[#7B8E90] uppercase tracking-wider block mb-1">Pregunta al Operario 8.1</span>
                  <h4 className="text-[15px] font-bold text-[#324354] leading-relaxed">
                    ¿El operario está entrenado para realizar el mantenimiento autónomo?
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  {[
                    { val: 'SI', label: 'SI', color: 'bg-[#324354] border-[#324354]' },
                    { val: 'NO', label: 'NO', color: 'bg-red-600 border-red-600' },
                    { val: 'N/A', label: 'N/A', color: 'bg-slate-500 border-slate-500' },
                  ].map(opt => {
                    const isActive = staticResponses['8.1'].value === opt.val;
                    return (
                      <button
                        key={opt.val}
                        onClick={() => handleStaticStatusChange('8.1', opt.val as any)}
                        className={`w-14 h-11 rounded-xl font-bold border-2 transition-all flex items-center justify-center text-[13px] cursor-pointer ${
                          isActive 
                            ? `${opt.color} text-white shadow-md` 
                            : 'border-slate-300 text-slate-400 bg-white hover:border-slate-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <input 
                type="text" 
                value={staticResponses['8.1'].comment}
                onChange={(e) => handleStaticCommentChange('8.1', e.target.value)}
                placeholder="Comentarios sobre el entrenamiento..."
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm outline-none focus:border-slate-400"
              />
            </div>

            {/* 9.1: Validado casilla en HILU */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <span className="text-xs font-bold text-[#7B8E90] uppercase tracking-wider block mb-1">Verificación HILU 9.1</span>
                  <h4 className="text-[15px] font-bold text-[#324354] leading-relaxed">
                    ¿En la HILU está validada la casilla de Mantenimiento Autónomo?
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  {[
                    { val: 'SI', label: 'SI', color: 'bg-[#324354] border-[#324354]' },
                    { val: 'NO', label: 'NO', color: 'bg-red-600 border-red-600' },
                    { val: 'N/A', label: 'N/A', color: 'bg-slate-500 border-slate-500' },
                  ].map(opt => {
                    const isActive = staticResponses['9.1'].value === opt.val;
                    return (
                      <button
                        key={opt.val}
                        onClick={() => handleStaticStatusChange('9.1', opt.val as any)}
                        className={`w-14 h-11 rounded-xl font-bold border-2 transition-all flex items-center justify-center text-[13px] cursor-pointer ${
                          isActive 
                            ? `${opt.color} text-white shadow-md` 
                            : 'border-slate-300 text-slate-400 bg-white hover:border-slate-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <input 
                type="text" 
                value={staticResponses['9.1'].comment}
                onChange={(e) => handleStaticCommentChange('9.1', e.target.value)}
                placeholder="Observaciones de la HILU..."
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm outline-none focus:border-slate-400"
              />
            </div>

          </div>
        </div>

        {/* Action Plans */}
        <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] p-6 md:p-8 mb-8">
          <h2 className="text-lg font-bold text-[#324354] mb-3">📋 Planes de Acción</h2>
          <p className="text-slate-400 text-xs font-medium mb-4">Ingresa los compromisos y fechas límite acordados durante la auditoría</p>
          <textarea
            value={actionPlans}
            onChange={(e) => setActionPlans(e.target.value)}
            rows={4}
            placeholder="Escribe aquí los planes de acción detallados para las desviaciones detectadas..."
            className="w-full bg-[#fcfbfa] border border-[#d8d3c5] rounded-2xl p-4 text-sm font-medium outline-none focus:border-[#324354] resize-y"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#324354] hover:bg-[#25323f] text-[#F6F3EE] font-bold px-10 py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando Registro...' : 'Guardar Auditoría de Autónomo'}
          </button>
        </div>

      </main>

      {/* Reference Board Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4 bg-black/80 z-[1000] backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowPhotoModal(false)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-none font-bold"
            >
              ✕
            </button>
            
            <h3 className="text-lg font-bold text-[#324354] mb-4">📸 Tablero de Mantenimiento Autónomo</h3>
            
            <div className="rounded-2xl overflow-hidden border border-slate-200 mb-4 bg-slate-50 flex items-center justify-center p-2 min-h-[300px]">
              <img 
                src="/stefani_scm.png" 
                alt="Ejemplo de Tablero de Mantenimiento Autónomo" 
                className="max-w-full h-auto object-contain rounded-xl max-h-[350px]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallbackDiv = document.getElementById('image-fallback');
                  if (fallbackDiv) fallbackDiv.style.display = 'flex';
                }}
              />
              <div id="image-fallback" className="hidden flex-col items-center justify-center text-center p-6 text-slate-400">
                <Info size={48} className="text-slate-300 mb-2" />
                <span className="text-sm font-bold block">Tablero Autónomo Modelo</span>
                <span className="text-xs max-w-xs block mt-1">El tablero debe contar con el estándar de limpieza de la máquina al día, la programación semanal y la rejilla de firmas de ejecución de los operarios visible.</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span className="text-xs font-bold text-[#324354] block mb-1">Puntos Clave a Verificar:</span>
              <ul className="text-xs text-slate-500 space-y-1.5 list-disc pl-4 font-medium">
                <li>El estándar visual de limpieza debe estar publicado en la máquina.</li>
                <li>El checklist de puestas a punto debe estar firmado diariamente por el operario.</li>
                <li>Se deben evidenciar registros de anomalías marcadas en rojo/azul en el tablero.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

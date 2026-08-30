'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import { createExternalClient } from '@/lib/supabase/external';
import Header from '@/components/opt-sistemica/Header';
import SubHeader from '@/components/opt-sistemica/SubHeader';
import { Search, Eye, Edit2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface OPTRecord {
  id: string;
  created_at: string;
  user_id: string;
  user_email: string;
  modulo_tipo: string;
  persona_evaluada?: string | null;
  percentage: number;
  responses: any;
  action_plans: string;
}

const AUTHORIZED_ADMINS = ['coordinacioncalidad@firplak.com', 'estiven.londono@firplak.com', 'jakeline.chaverra@firplak.com'];

const QUESTION_MAPPING: Record<string, Record<string, string>> = {
  'GI': {
    '1.1': "¿Tiene el tablero actualizado con la información del día anterior?",
    '1.2': "¿Cuando los índices de seguridad no son adecuados, tiene planes de acción acordes?",
    '1.3': "¿Cuando los índices de presentismo no son adecuados, tiene planes de acción acordes?",
    '1.4': "¿Cuando los índices de calidad no son adecuados, tiene planes de acción acordes?",
    '1.5': "¿Cuando los índices de producción no son adecuados, tiene planes de acción acordes?",
    '1.6': "¿Cuando los índices de costo no son adecuados, tiene planes de acción acordes?",
    '1.7': "¿El tablero cumple con lo acordado? (Ciclo PHVA, paretos, gráficas, frecuencia, planes, etc)",
    '1.8': "¿Se está realizando según la bitácora del supervisor la reunión de comunicación?",
    '1.9': "Observe la ejecución de la reunión de comunicación con la tarjeta. ¿Lo hace correctamente?"
  },
  'EE': {
    '2.1': "Revise el plan de entrenamiento. ¿Están incluídos todos los procesos y operarios?, ¿Está al día?, ¿El líder lo utiliza para gestionar las competencias de su equipo?",
    '2.2': "Pídale la hoja individual de progreso de la persona. Revise si esta actualizada y completamente diligenciada.",
    '2.3': "Verifique la implementación del desglose y el entrenamiento en el puesto de trabajo (Pregunte por pasos importantes, puntos claves y razones a un colaborador).",
    '2.4': "Observe la ejecución de la herramienta con la tarjeta. ¿Lo hace correctamente?"
  },
  'BE': {
    '4.1': "¿El líder conoce el ciclo para implementar la gestión de bajas estadísticas? (Evalué la frecuencia según los resultados de los colaboradores y/o el grupo según el tablero)",
    '4.2': "¿El líder está gestionando las bajas estadísticas?",
    '4.3': "¿Las acciones y compromisos de bajas estadísticas son adecuados?",
    '4.4': "Observe la ejecución de la herramienta con la tarjeta. ¿Lo hace correctamente?"
  },
  'AF': {
    '3.1': "Revise si el líder está haciendo el acompañamiento frecuente según la bitácora.",
    '3.2': "Pregunte al colaborador cuando fue el ultimo acompañamiento y si recibio correcciones. (Evalué la frecuencia de acompañamiento según los resultados del colaborador y el grupo)",
    '3.3': "Observe la ejecución de la herramienta con la tarjeta. ¿Lo hace correctamente?"
  },
  '5S': {
    '6.1': "Elija una zona del puesto de trabajo, ¿Puede observarse que en la primera S que no hay elementos innecesarios? ¿en la segunda S todos los elementos estan ordenados?",
    '6.2': "¿Las actividades de la 3s (Limpiar) están definidas, documentadas y se evidencia uso del Cheklist de limpieza?",
    '6.3': "Solicite el estado de referencia de la zona, ¿Existe Mapa (4S Estandarizar)? ¿Observe el puesto de trabajo o área y ¿se cumple el estandar con demarcación?",
    '6.4': "Solicite la última rejilla de observación de 5s ¿Esta lleva a la mejora del estado de referencia?",
    '6.5': "Existe una herramienta que hace posible que los colaboradores o cualquier persona comunique necesidades de mejora ¿hay disciplina en su uso?"
  },
  'MA': {
    '3.1': "Verificar si se está llenando el tablero de autónomo de la máquina (Ver foto)",
    '4.1': "Verificar si tiene reporte de observaciones",
    '5.1': "Verificar estado general y de limpieza de la máquina (Campo Abierto)",
    '6.1': "¿El operario del puesto ha realizado el mantenimiento autónomo y lo conoce?",
    '7.1': "¿Cómo está recibiendo la máquina diariamente del turno anterior?",
    '8.1': "¿El operario está entrenado para realizar el mantenimiento autónomo?",
    '9.1': "Verificar si en la HILU está validada la casilla de Mantenimiento Autónomo"
  }
};

const MODULE_INFO: Record<string, { label: string; emoji: string }> = {
  'GI': { label: 'Gestión de Indicadores', emoji: '📊' },
  'EE': { label: 'Entrenamiento Estandarizado', emoji: '🎓' },
  'BE': { label: 'Gestión de Bajas Estadísticas', emoji: '📉' },
  'AF': { label: 'Acompañamiento Frecuente', emoji: '🤝' },
  '5S': { label: "5'S", emoji: '🧹' },
  'MA': { label: 'Mantenimiento Autónomo', emoji: '🔧' },
  'OPT': { label: 'Observación de Puesto de Trabajo', emoji: '🔍' },
  'TE': { label: 'Trabajo Estandarizado', emoji: '📋' },
  'BIT': { label: 'Bitácora', emoji: '📔' },
};

const getModuleInfo = (type: string) => MODULE_INFO[type] || { label: type, emoji: '' };

type SortKey = 'numero' | 'created_at' | 'modulo_tipo' | 'realizadoPor' | 'persona_evaluada' | 'percentage';

export default function HistorialPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<OPTRecord[]>([]);
  const [numeroMap, setNumeroMap] = useState<Record<string, number>>({});
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [selectedRecord, setSelectedRecord] = useState<OPTRecord | null>(null);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc'
  });

  const [editingRecord, setEditingRecord] = useState<OPTRecord | null>(null);
  const [editPersona, setEditPersona] = useState('');
  const [editResponses, setEditResponses] = useState<Record<string, { value: 'SI' | 'NO' | null; comment: string }>>({});
  const [editActionPlans, setEditActionPlans] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const startEditing = (record: OPTRecord) => {
    setEditingRecord(record);
    setEditPersona(record.persona_evaluada || '');
    setEditResponses(JSON.parse(JSON.stringify(record.responses || {})));
    setEditActionPlans(record.action_plans || '');
  };

  const handleEditResponseChange = (id: string, value: 'SI' | 'NO') => {
    setEditResponses(prev => ({
      ...prev,
      [id]: { ...prev[id], value }
    }));
  };

  const handleEditCommentChange = (id: string, comment: string) => {
    setEditResponses(prev => ({
      ...prev,
      [id]: { ...prev[id], comment }
    }));
  };

  const editCalculatedPercentage = useMemo(() => {
    if (!editingRecord) return 0;
    const entries = Object.values(editResponses);
    if (entries.length === 0) return 0;
    const siCount = entries.filter(r => r.value === 'SI').length;
    return parseFloat(((siCount / entries.length) * 100).toFixed(2));
  }, [editingRecord, editResponses]);

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('opt_registros')
        .update({
          persona_evaluada: editPersona.trim() || null,
          responses: editResponses,
          percentage: editCalculatedPercentage,
          action_plans: editActionPlans.trim()
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      setRecords(prev => prev.map(r => r.id === editingRecord.id ? {
        ...r,
        persona_evaluada: editPersona.trim() || null,
        responses: editResponses,
        percentage: editCalculatedPercentage,
        action_plans: editActionPlans.trim()
      } : r));

      setEditingRecord(null);
      alert('Registro actualizado exitosamente.');
    } catch (err: any) {
      console.error('Error updating record:', err);
      alert('Error al guardar cambios: ' + (err.message || 'Error desconocido'));
    } finally {
      setSavingEdit(false);
    }
  };

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const fetchRecords = async () => {
    setLoading(true);
    // Fetch ascending first so we can assign a stable sequential "#" to each record
    const { data, error } = await supabase
      .from('opt_registros')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching records:', error);
    } else {
      const map: Record<string, number> = {};
      (data || []).forEach((r: any, idx: number) => { map[r.id] = idx + 1; });
      setNumeroMap(map);
      setRecords(data || []);
    }
    setLoading(false);
  };

  const fetchNames = async () => {
    const { data: usuarios } = await supabase.from('usuarios').select('correo, nombre');
    if (usuarios && usuarios.length > 0) {
      const map: Record<string, string> = {};
      usuarios.forEach((u: any) => { if (u.correo && u.nombre) map[u.correo] = u.nombre; });
      setNameMap(map);
    } else {
      const ext = createExternalClient();
      const { data: extUsuarios } = await ext.from('usuarios').select('correo, nombre');
      if (extUsuarios) {
        const map: Record<string, string> = {};
        extUsuarios.forEach((u: any) => { if (u.correo && u.nombre) map[u.correo] = u.nombre; });
        setNameMap(map);
      }
    }
  };

  const [personas, setPersonas] = useState<string[]>([]);

  const fetchPersonas = async () => {
    try {
      const ext = createExternalClient();
      const { data, error: err } = await ext
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        fetchRecords();
        fetchNames();
        fetchPersonas();
      }
    });
  }, [router]);

  const resolveUserName = (email: string | undefined) => {
    if (!email) return '—';
    return nameMap[email] || email;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const filteredAndSortedData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    let result = records.filter(record => {
      const moduleInfo = getModuleInfo(record.modulo_tipo);
      return (
        (numeroMap[record.id]?.toString() || '').includes(term) ||
        record.modulo_tipo.toLowerCase().includes(term) ||
        moduleInfo.label.toLowerCase().includes(term) ||
        (record.persona_evaluada || '').toLowerCase().includes(term) ||
        record.user_email.toLowerCase().includes(term) ||
        resolveUserName(record.user_email).toLowerCase().includes(term) ||
        `${record.percentage}%`.includes(term)
      );
    });

    result.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortConfig.key) {
        case 'numero':
          valA = numeroMap[a.id] || 0; valB = numeroMap[b.id] || 0;
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        case 'created_at':
          valA = new Date(a.created_at).getTime(); valB = new Date(b.created_at).getTime();
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        case 'percentage':
          valA = a.percentage || 0; valB = b.percentage || 0;
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        case 'modulo_tipo':
          valA = a.modulo_tipo.toLowerCase(); valB = b.modulo_tipo.toLowerCase();
          break;
        case 'persona_evaluada':
          valA = (a.persona_evaluada || '').toLowerCase(); valB = (b.persona_evaluada || '').toLowerCase();
          break;
        case 'realizadoPor':
          valA = resolveUserName(a.user_email).toLowerCase(); valB = resolveUserName(b.user_email).toLowerCase();
          break;
        default:
          valA = ''; valB = '';
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [records, searchTerm, sortConfig, numeroMap, nameMap]);

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={13} className="opacity-40 ml-1 inline-block align-middle" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp size={13} className="ml-1 text-white inline-block align-middle" />
      : <ArrowDown size={13} className="ml-1 text-white inline-block align-middle" />;
  };

  const canEdit = (record: OPTRecord) => {
    if (!session?.user) return false;
    const userEmail = (session.user.email || '').toLowerCase();
    return (
      record.user_id === session.user.id ||
      record.user_email?.toLowerCase() === userEmail ||
      AUTHORIZED_ADMINS.some(admin => userEmail.includes(admin)) ||
      userEmail.includes('hector') ||
      userEmail.includes('calidad')
    );
  };

  const percentageColor = (val: number) =>
    val >= 80 ? 'text-emerald-600' : val >= 50 ? 'text-amber-500' : 'text-rose-600';

  if (!session) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F3EE] font-sans text-[#000000] selection:bg-[#324354] selection:text-white w-full">
      <Header
        title="Historial"
        subtitle="Consulta de Observaciones"
        backUrl="/sistema-produccion"
        userEmail={session.user.email}
        showLogout={true}
      />
      <SubHeader />

      <main className="relative z-10 flex-1 flex flex-col justify-start px-6 pt-6 pb-12 md:pb-16 lg:pb-20 max-w-[1700px] mx-auto w-full">
        <div className="w-full animate-fade-in space-y-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#e2ded5] pb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-light tracking-wide text-[#324354] font-display">
                Observaciones Guardadas
              </h2>
            </div>

            <div className="flex flex-col items-end gap-1.5 min-w-[320px] max-w-md w-full">
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Buscar por #, módulo, operario, realizado por..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#e2ded5] rounded-full focus:outline-none focus:ring-2 focus:ring-[#324354] focus:border-[#324354] bg-white text-sm shadow-sm"
                />
              </div>
              <span className="text-[10px] font-bold text-[#7B8E90] tracking-wider uppercase">
                {filteredAndSortedData.length} REGISTROS ENCONTRADOS
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324354]"></div>
              <div className="mt-4 text-[#324354] font-semibold text-sm">Cargando registros...</div>
            </div>
          ) : filteredAndSortedData.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.05)] p-12 text-center">
              <div className="text-4xl mb-4">📁</div>
              <h3 className="text-lg font-bold text-slate-700">No se encontraron registros.</h3>
              <p className="text-sm text-slate-400 mt-1">Los registros que coincidan con tu búsqueda aparecerán aquí.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.05)]">
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse text-left min-w-[1000px]">
                  <thead>
                    <tr className="bg-[#324354]">
                      <th
                        onClick={() => requestSort('numero')}
                        className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider cursor-pointer select-none hover:bg-[#3b4e63] transition-colors w-16"
                      >
                        # <SortIcon columnKey="numero" />
                      </th>
                      <th
                        onClick={() => requestSort('created_at')}
                        className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider cursor-pointer select-none hover:bg-[#3b4e63] transition-colors"
                      >
                        Fecha <SortIcon columnKey="created_at" />
                      </th>
                      <th
                        onClick={() => requestSort('modulo_tipo')}
                        className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider cursor-pointer select-none hover:bg-[#3b4e63] transition-colors"
                      >
                        Módulo <SortIcon columnKey="modulo_tipo" />
                      </th>
                      <th
                        onClick={() => requestSort('realizadoPor')}
                        className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider cursor-pointer select-none hover:bg-[#3b4e63] transition-colors"
                      >
                        Realizado por <SortIcon columnKey="realizadoPor" />
                      </th>
                      <th
                        onClick={() => requestSort('persona_evaluada')}
                        className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider cursor-pointer select-none hover:bg-[#3b4e63] transition-colors"
                      >
                        Operario <SortIcon columnKey="persona_evaluada" />
                      </th>
                      <th
                        onClick={() => requestSort('percentage')}
                        className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider cursor-pointer select-none hover:bg-[#3b4e63] transition-colors"
                      >
                        KPIs <SortIcon columnKey="percentage" />
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAndSortedData.map((record) => {
                      const { date, time } = formatDate(record.created_at);
                      const moduleInfo = getModuleInfo(record.modulo_tipo);
                      return (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors duration-150">
                          <td className="px-6 py-4">
                            <span className="font-black text-[#324354] text-sm">{numeroMap[record.id] || '—'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-800 text-sm">{date}</div>
                            <div className="text-xs text-slate-500">{time}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800 text-sm">{record.modulo_tipo}</div>
                            <div className="text-xs text-slate-500">{moduleInfo.emoji} {moduleInfo.label}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs text-slate-600 font-medium truncate max-w-[180px]">{resolveUserName(record.user_email)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs text-slate-600 font-medium truncate max-w-[180px]">{record.persona_evaluada || '—'}</div>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <span className="font-semibold">Calificación:</span>{' '}
                            <span className={`font-mono font-bold ${percentageColor(record.percentage)}`}>{record.percentage}%</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setSelectedRecord(record)}
                                title="Ver detalle"
                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
                              >
                                <Eye size={16} />
                              </button>
                              {canEdit(record) && (
                                <button
                                  onClick={() => startEditing(record)}
                                  title="Editar registro"
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 transition-colors cursor-pointer"
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Full OPT Detail Modal */}
      {selectedRecord && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card animate-fade-in" style={{
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '40px',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
              <div>
                <h2 style={{ color: 'var(--header-bg)', fontSize: '1.8rem', fontWeight: 800 }}>
                  {getModuleInfo(selectedRecord.modulo_tipo).emoji} {getModuleInfo(selectedRecord.modulo_tipo).label}
                </h2>
                <div style={{ marginTop: '4px', color: '#666', fontSize: '0.95rem' }}>
                  <strong>Operario:</strong> {selectedRecord.persona_evaluada || '—'}
                  <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>
                  <strong>Realizado por:</strong> {resolveUserName(selectedRecord.user_email)}
                  <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>
                  <strong>Fecha:</strong> {formatDate(selectedRecord.created_at).date} {formatDate(selectedRecord.created_at).time}
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{ background: '#f3f4f6', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#666', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            {/* Full Form Appearance */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Object.entries(selectedRecord.responses || {}).sort().map(([id, res]: [string, any]) => (
                <div key={id} style={{ padding: '24px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 800, color: 'var(--header-bg)', display: 'block', marginBottom: '4px' }}>
                        Pregunta {id}
                      </span>
                      <span style={{ fontWeight: 500, color: 'var(--accent)', fontSize: '1.05rem', lineHeight: 1.4 }}>
                        {QUESTION_MAPPING[selectedRecord.modulo_tipo]?.[id] || res.text || 'Pregunta no identificada'}
                      </span>
                    </div>
                    <div style={{
                      padding: '6px 20px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      background: res.value === 'SI' ? 'var(--header-bg)' : '#dc2626',
                      color: 'white',
                      height: 'fit-content'
                    }}>
                      {res.value}
                    </div>
                  </div>
                  {res.comment ? (
                    <div style={{
                      background: '#f8fafc', padding: '16px', borderRadius: '10px',
                      borderLeft: '4px solid #cbd5e1', color: '#475569', fontSize: '1rem', fontStyle: 'italic'
                    }}>
                      &quot;{res.comment}&quot;
                    </div>
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>Sin comentarios.</div>
                  )}
                </div>
              ))}
            </div>

            {/* Action Plans and Percentage Summary */}
            <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ color: 'var(--accent)', marginBottom: '12px', fontSize: '1.1rem' }}>Puntaje Total</h4>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--header-bg)' }}>{selectedRecord.percentage}%</div>
                <div style={{ color: '#666', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>Calificación General</div>
              </div>
              <div style={{ background: 'var(--header-bg)', padding: '24px', borderRadius: '20px', color: 'white' }}>
                <h4 style={{ marginBottom: '12px', fontSize: '1.1rem' }}>Planes de Acción</h4>
                <p style={{ opacity: 0.9, lineHeight: 1.5, fontSize: '1rem' }}>{selectedRecord.action_plans || 'Sin planes de acción registrados.'}</p>
              </div>
            </div>

            <div style={{ marginTop: '48px', textAlign: 'center' }}>
              <button
                onClick={() => setSelectedRecord(null)}
                className="btn-primary"
                style={{ width: '100%', padding: '16px', fontSize: '1.1rem', background: 'var(--accent)' }}
              >
                Cerrar Informe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full OPT Edit Modal */}
      {editingRecord && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setEditingRecord(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[88vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Fixed / Non-scrolling) */}
            <div className="px-6 sm:px-8 py-5 border-b border-slate-200 flex items-start justify-between bg-[#F8FAFC] shrink-0">
              <div>
                <span className="text-xs font-black text-[#324354] bg-[#324354]/10 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  Editar Observación #{numeroMap[editingRecord.id] || ''}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#324354] mt-2 flex items-center gap-2">
                  <span>{getModuleInfo(editingRecord.modulo_tipo).emoji}</span>
                  <span>{getModuleInfo(editingRecord.modulo_tipo).label}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Modifica las respuestas, comentarios, operario evaluado y planes de acción.
                </p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-2 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-200 border border-slate-200 rounded-full transition cursor-pointer shadow-xs"
                title="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
              {/* Persona Evaluada con SearchableSelect */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider">
                  Operario / Persona Evaluada
                </label>
                <SearchableSelect
                  name="personaEvaluada"
                  options={personas}
                  placeholder="Buscar y seleccionar operario..."
                  defaultValue={editPersona}
                  onValueChange={(val) => setEditPersona(val)}
                  className="h-11 text-sm font-semibold rounded-xl"
                />
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-[#324354] uppercase tracking-wider">
                  Preguntas y Respuestas del Módulo
                </h3>

                {Object.entries(editResponses).sort().map(([qId, res]: [string, any]) => {
                  const qText = QUESTION_MAPPING[editingRecord.modulo_tipo]?.[qId] || res.text || `Pregunta ${qId}`;
                  const isSi = res.value === 'SI';
                  const isNo = res.value === 'NO';

                  return (
                    <div key={qId} className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <span className="text-[11px] font-black text-[#324354] bg-[#324354]/10 px-2 py-0.5 rounded-md mr-2">
                            Pregunta {qId}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-800">
                            {qText}
                          </span>
                        </div>

                        {/* SI / NO Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditResponseChange(qId, 'SI')}
                            className={`px-4 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
                              isSi
                                ? 'bg-emerald-600 text-white shadow-sm scale-105'
                                : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            SI
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditResponseChange(qId, 'NO')}
                            className={`px-4 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
                              isNo
                                ? 'bg-red-600 text-white shadow-sm scale-105'
                                : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            NO
                          </button>
                        </div>
                      </div>

                      {/* Comment Field */}
                      <div>
                        <input
                          type="text"
                          value={res.comment || ''}
                          onChange={(e) => handleEditCommentChange(qId, e.target.value)}
                          placeholder="Comentarios u observaciones de esta pregunta (opcional)..."
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#324354] focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Plans and Percentage Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      Calificación Calculada
                    </span>
                    <div className={`text-4xl font-black font-mono ${percentageColor(editCalculatedPercentage)}`}>
                      {editCalculatedPercentage}%
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold mt-2">
                    Se recalcula automáticamente según las respuestas SI / NO.
                  </span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Planes de Acción
                  </label>
                  <textarea
                    rows={3}
                    value={editActionPlans}
                    onChange={(e) => setEditActionPlans(e.target.value)}
                    placeholder="Escribe los planes de acción o compromisos acordados..."
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-[#324354] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer (Fixed / Non-scrolling) */}
            <div className="px-6 sm:px-8 py-4 border-t border-slate-200 bg-[#F8FAFC] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                disabled={savingEdit}
                className="px-4 py-2.5 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-6 py-2.5 bg-[#324354] hover:bg-[#25323f] active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {savingEdit ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                <span>{savingEdit ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

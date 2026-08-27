'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/ficha-rcc/supabaseClient';
import Link from 'next/link';
import Header from '@/components/opt-sistemica/Header';
import SubHeader from '@/components/ficha-rcc/SubHeader';
import { resolveNombreCompleto } from '@/lib/ficha-rcc/constants';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

interface Registro {
  fecha: string;
  responsable: string;
  estado: string;
}

const parseDateInfo = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00'); // Ensure local timezone parsing
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-11
  
  // Day of week: 1 for Lunes, 2 for Martes, ..., 7 for Domingo
  const rawDay = d.getDay(); // 0 (Domingo) to 6 (Sábado)
  const dayOfWeek = rawDay === 0 ? 7 : rawDay;

  // ISO Week number calculation
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

  return { year, month, weekNumber, dayOfWeek };
};

interface MultiSelectProps {
  label: string;
  options: { label: string; value: any }[];
  selected: any[];
  onChange: (selected: any[]) => void;
  showSearch?: boolean;
}

function MultiSelect({ label, options, selected, onChange, showSearch = false }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  const toggleOption = (val: any) => {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const toggleAll = () => {
    const activeOptions = showSearch && search ? filteredOptions : options;
    const activeValues = activeOptions.map(o => o.value);
    const allSelected = activeValues.every(val => selected.includes(val));

    if (allSelected) {
      onChange(selected.filter(val => !activeValues.includes(val)));
    } else {
      const newSelected = [...selected];
      activeValues.forEach(val => {
        if (!newSelected.includes(val)) newSelected.push(val);
      });
      onChange(newSelected);
    }
  };

  const filteredOptions = useMemo(() => {
    if (!showSearch || !search) return options;
    return options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  }, [options, search, showSearch]);

  const displayText = selected.length === 0 
    ? 'Ninguno' 
    : selected.length === options.length 
      ? 'Todos' 
      : selected.map(val => options.find(o => o.value === val)?.label).join(', ');

  const activeOptions = showSearch && search ? filteredOptions : options;
  const activeValues = activeOptions.map(o => o.value);
  const isAllSelected = activeValues.length > 0 && activeValues.every(val => selected.includes(val));

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', minWidth: '160px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px 14px',
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--primary)',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
          {displayText}
        </span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6"></path>
        </svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '6px',
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          zIndex: 100,
          maxHeight: '300px',
          padding: '8px',
          minWidth: '200px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}>
          {showSearch && (
            <input 
              type="text" 
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                marginBottom: '8px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div 
            onClick={toggleAll}
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--primary)',
              background: 'rgba(0,0,0,0.03)',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0
            }}
          >
            <input 
              type="checkbox" 
              checked={isAllSelected}
              readOnly
              style={{ cursor: 'pointer' }}
            />
            <span>[Seleccionar Todos]</span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredOptions.map((opt, i) => (
              <div 
                key={i}
                onClick={() => toggleOption(opt.value)}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.15s',
                }}
                className="hover:bg-slate-50"
              >
                <input 
                  type="checkbox" 
                  checked={selected.includes(opt.value)}
                  readOnly
                  style={{ cursor: 'pointer', accentColor: '#324354' }}
                />
                <span style={{ color: 'var(--text-primary)', fontWeight: selected.includes(opt.value) ? 600 : 400 }}>{opt.label}</span>
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                Sin resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IndicadoresAsistenciaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [fichas, setFichas] = useState<any[]>([]);
  const [procesosInfo, setProcesosInfo] = useState<any[]>([]);
  const [responsablesMap, setResponsablesMap] = useState<Record<string, string>>({});
  const [userEmail, setUserEmail] = useState('');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/ficha-rcc/');
        return;
      }

      const email = session.user.email?.toLowerCase() || '';
      setUserEmail(session.user.email || '');
      
      const { data: userData } = await supabase
        .from('usuarios')
        .select('permisos')
        .eq('correo', email)
        .single();

      const permisosFicha = userData?.permisos?.ficha_rcc || {};
      const hasAccess = permisosFicha === true || permisosFicha?.asistencia === true;

      if (!hasAccess) {
        router.push('/ficha-rcc/');
        return;
      }
      fetchData();
    };
    checkAuth();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch processes and their members first
    const { data: respData } = await supabase
      .from('cat_responsables')
      .select('nombre, proceso_id');
    
    const { data: procData } = await supabase
      .from('cat_procesos')
      .select('*');

    const rMap: Record<string, string> = {};
    if (respData && procData) {
      const procDict = Object.fromEntries(procData.map(p => [p.id, p.nombre]));
      respData.forEach((r: any) => {
        if (r.proceso_id && procDict[r.proceso_id]) {
          const resolved = resolveNombreCompleto(r.nombre);
          rMap[r.nombre] = procDict[r.proceso_id];
          rMap[resolved] = procDict[r.proceso_id];
        }
      });
    }
    setResponsablesMap(rMap);
    setProcesosInfo(procData || []);

    const { data: records, error } = await supabase
      .from('registro_asistencia')
      .select('*')
      .order('fecha', { ascending: true });

    if (error) {
      console.error('Error fetching data:', error);
      setData([]);
    } else {
      const normalizedRecords = (records || []).map((rec: any) => ({
        ...rec,
        responsable: resolveNombreCompleto(rec.responsable)
      }));
      setData(normalizedRecords);
    }

    // Fetch alert sheets data safely
    const { data: fichasRecords, error: fichasError } = await supabase
      .from('fichas_alerta')
      .select('*');

    if (fichasError && fichasError.code !== '42P01') {
      console.error('Error fetching fichas:', fichasError);
    } else {
      setFichas(fichasRecords || []);
    }

    setLoading(false);
  };

  const yearOptions = useMemo(() => {
    const yearsSet = new Set<number>();
    data.forEach(r => {
      const y = parseInt(r.fecha.split('-')[0]);
      if (!isNaN(y)) yearsSet.add(y);
    });
    yearsSet.add(new Date().getFullYear());
    return Array.from(yearsSet).sort((a, b) => b - a).map(y => ({ label: y.toString(), value: y }));
  }, [data]);

  const monthOptions = [
    { label: 'Enero', value: 0 },
    { label: 'Febrero', value: 1 },
    { label: 'Marzo', value: 2 },
    { label: 'Abril', value: 3 },
    { label: 'Mayo', value: 4 },
    { label: 'Junio', value: 5 },
    { label: 'Julio', value: 6 },
    { label: 'Agosto', value: 7 },
    { label: 'Septiembre', value: 8 },
    { label: 'Octubre', value: 9 },
    { label: 'Noviembre', value: 10 },
    { label: 'Diciembre', value: 11 },
  ];

  const weekOptions = useMemo(() => {
    const weeksSet = new Set<number>();
    data.forEach(r => {
      const info = parseDateInfo(r.fecha);
      weeksSet.add(info.weekNumber);
    });
    if (weeksSet.size === 0) {
      for (let i = 1; i <= 5; i++) weeksSet.add(i);
    }
    return Array.from(weeksSet).sort((a, b) => a - b).map(w => ({ label: `Semana ${w}`, value: w }));
  }, [data]);

  const dayOptions = [
    { label: 'Lunes', value: 1 },
    { label: 'Martes', value: 2 },
    { label: 'Miércoles', value: 3 },
    { label: 'Jueves', value: 4 },
    { label: 'Viernes', value: 5 },
    { label: 'Sábado', value: 6 },
    { label: 'Domingo', value: 7 },
  ];

  const personOptions = useMemo(() => {
    const personsSet = new Set<string>();
    data.forEach(r => {
      if (r.responsable) personsSet.add(r.responsable);
    });
    return Array.from(personsSet).sort().map(name => ({ label: name, value: name }));
  }, [data]);

  const lastYearsOptionsRef = useRef<any[]>([]);
  useEffect(() => {
    const optionValues = yearOptions.map(o => o.value);
    const prevValues = lastYearsOptionsRef.current.map(o => o.value);
    
    if (JSON.stringify(optionValues) !== JSON.stringify(prevValues)) {
      setSelectedYears(optionValues);
      lastYearsOptionsRef.current = yearOptions;
    }
  }, [yearOptions]);

  useEffect(() => {
    if (selectedMonths.length === 0) {
      setSelectedMonths([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    }
  }, []);

  const lastWeeksOptionsRef = useRef<any[]>([]);
  useEffect(() => {
    const optionValues = weekOptions.map(o => o.value);
    const prevValues = lastWeeksOptionsRef.current.map(o => o.value);
    
    if (JSON.stringify(optionValues) !== JSON.stringify(prevValues)) {
      setSelectedWeeks(optionValues);
      lastWeeksOptionsRef.current = weekOptions;
    }
  }, [weekOptions]);

  const lastPersonsOptionsRef = useRef<any[]>([]);
  useEffect(() => {
    const optionValues = personOptions.map(o => o.value);
    const prevValues = lastPersonsOptionsRef.current.map(o => o.value);
    
    if (JSON.stringify(optionValues) !== JSON.stringify(prevValues)) {
      setSelectedPersons(optionValues);
      lastPersonsOptionsRef.current = personOptions;
    }
  }, [personOptions]);

  const filteredData = useMemo(() => {
    return data.filter(r => {
      const { year, month, weekNumber, dayOfWeek } = parseDateInfo(r.fecha);
      if (selectedYears.length > 0 && !selectedYears.includes(year)) return false;
      if (selectedMonths.length > 0 && !selectedMonths.includes(month)) return false;
      if (selectedWeeks.length > 0 && !selectedWeeks.includes(weekNumber)) return false;
      if (selectedDays.length > 0 && !selectedDays.includes(dayOfWeek)) return false;
      if (selectedPersons.length > 0 && !selectedPersons.includes(r.responsable)) return false;
      return true;
    });
  }, [data, selectedYears, selectedMonths, selectedWeeks, selectedDays, selectedPersons]);

  const filteredDataForCharts = useMemo(() => {
    if (!selectedPersonFilter) return filteredData;
    return filteredData.filter(r => r.responsable === selectedPersonFilter);
  }, [filteredData, selectedPersonFilter]);

  const filteredFichas = useMemo(() => {
    return fichas.filter(f => {
      const dateStr = f.fecha || f.created_at || '';
      if (!dateStr) return true;
      const { year, month, weekNumber, dayOfWeek } = parseDateInfo(dateStr);
      if (selectedYears.length > 0 && !selectedYears.includes(year)) return false;
      if (selectedMonths.length > 0 && !selectedMonths.includes(month)) return false;
      if (selectedWeeks.length > 0 && !selectedWeeks.includes(weekNumber)) return false;
      if (selectedDays.length > 0 && !selectedDays.includes(dayOfWeek)) return false;
      if (selectedPersons.length > 0 && !selectedPersons.includes(f.responsable)) return false;
      return true;
    });
  }, [fichas, selectedYears, selectedMonths, selectedWeeks, selectedDays, selectedPersons]);

  const filteredFichasForKPIs = useMemo(() => {
    if (!selectedPersonFilter) return filteredFichas;
    return filteredFichas.filter(f => f.responsable === selectedPersonFilter);
  }, [filteredFichas, selectedPersonFilter]);

  // KPIs calculations for history cards
  const kpiTotalFichas = filteredFichasForKPIs.length;
  const kpiEnSeguimiento = filteredFichasForKPIs.filter(f => f.estado === 'En Seguimiento').length;
  const kpiTrazabilidadCompleta = filteredFichasForKPIs.filter(f => f.estado === 'Trazabilidad Completa').length;

  const kpiPlantaCounts = filteredFichasForKPIs.reduce((acc, f) => {
    acc[f.planta] = (acc[f.planta] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let kpiTopPlanta = 'Ninguna';
  let kpiTopCount = 0;
  Object.entries(kpiPlantaCounts).forEach(([planta, count]) => {
    if (count > kpiTopCount) {
      kpiTopCount = count;
      kpiTopPlanta = planta;
    }
  });

  // Datos para la gráfica de línea - BASADO EN PROCESOS
  const dailyStats = useMemo(() => {
    if (filteredDataForCharts.length === 0 || procesosInfo.length === 0) return [];
    
    const days: Record<string, Set<string>> = {}; // fecha -> Set de procesos presentes
    
    filteredDataForCharts.forEach(reg => {
      const procName = responsablesMap[reg.responsable];
      if (!procName) return;
      if (!days[reg.fecha]) days[reg.fecha] = new Set();
      if (reg.estado === 'Presente') {
        days[reg.fecha].add(procName);
      }
    });

    const showMonthDay = selectedMonths.length > 1 || selectedYears.length > 1;

    return Object.entries(days).map(([fecha, procsPresentes]) => {
      const label = showMonthDay 
        ? `${fecha.split('-')[2]}/${fecha.split('-')[1]}`
        : fecha.split('-')[2];
      return {
        fechaLabel: label,
        fechaFull: fecha,
        porcentaje: Math.round((procsPresentes.size / procesosInfo.length) * 100),
        presentesList: Array.from(procsPresentes).sort()
      };
    }).sort((a, b) => a.fechaFull.localeCompare(b.fechaFull));
  }, [filteredDataForCharts, procesosInfo, responsablesMap, selectedMonths, selectedYears]);

  // Tooltip personalizado para la gráfica de línea
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const itemData = payload[0].payload;
      return (
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.95)', 
          padding: '15px', 
          borderRadius: '12px', 
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)', 
          border: '1px solid var(--border)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--primary)' }}>Día {label}</p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent)', marginBottom: '12px' }}>{itemData.porcentaje}%</p>
          
          <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Procesos Presentes:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {itemData.presentesList.map((p: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-primary)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                  {p}
                </div>
              ))}
              {itemData.presentesList.length === 0 && <span style={{ fontSize: '12px', color: '#ef4444' }}>Ninguno</span>}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Datos para la gráfica de barras (Acumulado mensual del año) - BASADO EN PROCESOS
  const monthlyStats = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    if (procesosInfo.length === 0) return [];

    const monthTotals: Record<number, { sumPct: number, count: number }> = {};

    const dailyMap: Record<string, Set<string>> = {};
    filteredDataForCharts.forEach(reg => {
      const procName = responsablesMap[reg.responsable];
      if (!procName) return;
      if (!dailyMap[reg.fecha]) dailyMap[reg.fecha] = new Set();
      if (reg.estado === 'Presente') dailyMap[reg.fecha].add(procName);
    });

    Object.entries(dailyMap).forEach(([fecha, procs]) => {
      const m = parseInt(fecha.split('-')[1]) - 1;
      const pct = (procs.size / procesosInfo.length) * 100;
      if (!monthTotals[m]) monthTotals[m] = { sumPct: 0, count: 0 };
      monthTotals[m].sumPct += pct;
      monthTotals[m].count++;
    });

    return months.map((m, idx) => {
      const d = monthTotals[idx];
      return {
        name: m,
        porcentaje: d ? Math.round(d.sumPct / d.count) : 0
      };
    }).filter((m, idx) => m.porcentaje > 0 || selectedMonths.includes(idx));
  }, [filteredDataForCharts, procesosInfo, responsablesMap, selectedMonths]);

  // Datos para la gráfica de Ranking Individual de Asistencia
  const personStats = useMemo(() => {
    if (filteredData.length === 0) return [];

    const counts: Record<string, { total: number; presente: number }> = {};
    filteredData.forEach(reg => {
      if (!counts[reg.responsable]) {
        counts[reg.responsable] = { total: 0, presente: 0 };
      }
      counts[reg.responsable].total++;
      if (reg.estado === 'Presente') {
        counts[reg.responsable].presente++;
      }
    });

    return Object.entries(counts)
      .map(([name, c]) => ({
        name,
        porcentaje: c.total > 0 ? Math.round((c.presente / c.total) * 100) : 0
      }))
      .sort((a, b) => b.porcentaje - a.porcentaje);
  }, [filteredData]);

  // Procesar ranking de PROCESOS
  const processStats = useMemo(() => {
    const stats: Record<string, { name: string, cumplimientos: number, ausencias: number, permisos: number }> = {};
    
    procesosInfo.forEach(p => {
      stats[p.nombre] = { name: p.nombre, cumplimientos: 0, ausencias: 0, permisos: 0 };
    });
    
    const dailyProcessStatus: Record<string, Record<string, string>> = {}; // fecha -> proceso -> estado

    filteredDataForCharts.forEach(reg => {
      const procName = responsablesMap[reg.responsable];
      if (!procName) return;
      if (!dailyProcessStatus[reg.fecha]) dailyProcessStatus[reg.fecha] = {};
      
      if (!dailyProcessStatus[reg.fecha][procName]) {
        dailyProcessStatus[reg.fecha][procName] = 'Excusa';
      }
      
      if (reg.estado === 'Presente') {
        dailyProcessStatus[reg.fecha][procName] = 'Presente';
      } else if (reg.estado === 'Ausente' && dailyProcessStatus[reg.fecha][procName] !== 'Presente') {
        dailyProcessStatus[reg.fecha][procName] = 'Ausente';
      }
    });

    Object.entries(dailyProcessStatus).forEach(([fecha, procs]) => {
      Object.entries(procs).forEach(([procName, status]) => {
        if (!stats[procName]) return;
        if (status === 'Presente') stats[procName].cumplimientos++;
        else if (status === 'Ausente') stats[procName].ausencias++;
      });
    });

    const list = Object.values(stats);
    const topCumplimiento = [...list].sort((a, b) => b.cumplimientos - a.cumplimientos || a.name.localeCompare(b.name));
    const topAusencias = [...list].sort((a, b) => b.ausencias - a.ausencias || a.name.localeCompare(b.name));

    return { topCumplimiento, topAusencias };
  }, [filteredDataForCharts, responsablesMap, procesosInfo]);
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#ffffff' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
      <Header
        title="Respuesta Rápida Calidad"
        subtitle="RRC"
        userEmail={userEmail}
        showLogout={true}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
      />
      <SubHeader />

      <div className="home-container" style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '40px 20px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Indicadores de Asistencia</h1>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <MultiSelect 
            label="Año" 
            options={yearOptions} 
            selected={selectedYears} 
            onChange={setSelectedYears} 
          />
          <MultiSelect 
            label="Mes" 
            options={monthOptions} 
            selected={selectedMonths} 
            onChange={setSelectedMonths} 
          />
          <MultiSelect 
            label="Semana" 
            options={weekOptions} 
            selected={selectedWeeks} 
            onChange={setSelectedWeeks} 
          />
          <MultiSelect 
            label="Día" 
            options={dayOptions} 
            selected={selectedDays} 
            onChange={setSelectedDays} 
          />
          <MultiSelect 
            label="Persona" 
            options={personOptions} 
            selected={selectedPersons} 
            onChange={setSelectedPersons} 
            showSearch={true}
          />
        </div>
      </div>

      {/* Indicadores de Fichas de Alerta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100px', borderLeft: '5px solid var(--primary)', borderRadius: '15px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Fichas</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>{kpiTotalFichas}</span>
        </div>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100px', borderLeft: '5px solid #eab308', borderRadius: '15px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fichas En Seguimiento</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#eab308', marginTop: '4px' }}>{kpiEnSeguimiento}</span>
        </div>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100px', borderLeft: '5px solid #10b981', borderRadius: '15px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fichas Trazabilidad Completa</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{kpiTrazabilidadCompleta}</span>
        </div>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100px', borderLeft: '5px solid var(--accent)', borderRadius: '15px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Planta Con Más Alertas</span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {kpiTopPlanta} ({kpiTopCount})
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px', marginBottom: '40px' }}>
        {/* Gráfica de Línea - Asistencia Diaria */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3 style={{ marginBottom: '32px', color: 'var(--primary)' }}>Cumplimiento Diario por Proceso (%)</h3>
          
          {dailyStats.length > 0 ? (
            <div style={{ width: '100%', height: '350px' }}>
              <ResponsiveContainer>
                <LineChart data={dailyStats} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="fechaLabel" axisLine={false} tickLine={false} tick={{fill: '#769598', fontSize: 11}} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#769598', fontSize: 11}} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="porcentaje" 
                    stroke="var(--primary)" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: 'var(--primary)' }}
                    label={{ position: 'top', fill: 'var(--primary)', fontSize: 12, fontWeight: 700, formatter: (v: any) => `${v}%` }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', border: '2px dashed #eee', borderRadius: '12px' }}>
              Sin datos para este mes.
            </div>
          )}
        </div>

        {/* Gráfica de Barras - Acumulado Mensual */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3 style={{ marginBottom: '32px', color: 'var(--primary)' }}>Histórico Mensual del Año (%)</h3>
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer>
              <BarChart data={monthlyStats} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#769598', fontSize: 11}} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#769598', fontSize: 11}} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="porcentaje" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: 'var(--accent)', fontSize: 12, fontWeight: 700, formatter: (v: any) => `${v}%` }}>
                  {monthlyStats.map((entry, index) => {
                    const currentMonthName = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][new Date().getMonth()];
                    return (
                      <Cell key={`cell-${index}`} fill={entry.name === currentMonthName ? 'var(--primary)' : 'var(--accent)'} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica de Tops de Asistencia */}
        <div 
          className="glass-panel" 
          style={{ 
            padding: '30px', 
            gridColumn: 'span 2', 
            cursor: selectedPersonFilter ? 'pointer' : 'default',
            border: selectedPersonFilter ? '2.5px solid #4f46e5' : '1px solid var(--border)',
            transition: 'all 0.2s ease-in-out'
          }}
          onClick={() => setSelectedPersonFilter(null)}
        >
          <h3 style={{ marginBottom: '20px', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🏆 Ranking de Asistencia Individual (%)</span>
            {selectedPersonFilter && (
              <span 
                style={{ fontSize: '13px', background: '#e0e7ff', color: '#4f46e5', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={(e) => { e.stopPropagation(); setSelectedPersonFilter(null); }}
              >
                Filtrado por: {selectedPersonFilter} ✕
              </span>
            )}
          </h3>
          {personStats.length > 0 ? (
            <div style={{ width: '100%', height: '350px' }} onClick={(e) => e.stopPropagation()}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={personStats} 
                  margin={{ top: 20, right: 30, left: 0, bottom: 40 }}
                  onClick={(state) => {
                    if (!state || state.activeTooltipIndex === undefined) {
                      setSelectedPersonFilter(null);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#769598', fontSize: 11 }}
                    angle={-25}
                    textAnchor="end"
                    height={70}
                    interval={0}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fill: '#769598', fontSize: 11 }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{ background: '#fff', padding: '10px 15px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid var(--border)' }}>
                            <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--primary)' }}>{payload[0].payload.name}</p>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--accent)', fontWeight: 'bold' }}>Asistencia: {payload[0].value}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="porcentaje" 
                    radius={[6, 6, 0, 0]} 
                    label={{ position: 'top', fill: 'var(--primary)', fontSize: 11, fontWeight: 700, formatter: (v: any) => `${v}%` }}
                    onClick={(state) => {
                      if (state && state.name) {
                        setSelectedPersonFilter(prev => prev === state.name ? null : state.name);
                      }
                    }}
                  >
                    {personStats.map((entry, index) => {
                      const color = entry.porcentaje >= 90 ? '#59a96a' : entry.porcentaje >= 80 ? '#deb841' : '#d14747';
                      const opacity = selectedPersonFilter ? (entry.name === selectedPersonFilter ? 1 : 0.35) : 1;
                      return <Cell key={`cell-${index}`} fill={color} opacity={opacity} style={{ cursor: 'pointer', transition: 'all 0.2s' }} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', border: '2px dashed #eee', borderRadius: '12px' }}>
              Sin datos individuales para este mes.
            </div>
          )}
        </div>

        {/* Ranking de Asistencias */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3 style={{ marginBottom: '20px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏆 Procesos con Mejor Cumplimiento
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
            {processStats.topCumplimiento.map((p: any, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f0fdf4', borderRadius: '10px' }}>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ background: '#10b981', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                  {p.cumplimientos} días presente
                </span>
              </div>
            ))}
            {processStats.topCumplimiento.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Sin datos aún</div>}
          </div>
        </div>

        {/* Ranking de Ausencias */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3 style={{ marginBottom: '20px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ Procesos con Más Ausencias
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
            {processStats.topAusencias.map((p: any, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fef2f2', borderRadius: '10px' }}>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ background: '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                  {p.ausencias} días ausente
                </span>
              </div>
            ))}
            {processStats.topAusencias.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Sin registros de ausencias</div>}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

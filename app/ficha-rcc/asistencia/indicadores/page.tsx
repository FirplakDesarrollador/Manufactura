'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/ficha-rcc/supabaseClient';
import FirplakLogo from '@/components/ficha-rcc/FirplakLogo';
import Link from 'next/link';
import { isAuthorized } from '@/lib/ficha-rcc/auth';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

interface Registro {
  fecha: string;
  responsable: string;
  estado: string;
}

export default function IndicadoresAsistenciaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [procesosInfo, setProcesosInfo] = useState<any[]>([]);
  const [responsablesMap, setResponsablesMap] = useState<Record<string, string>>({});
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 7); // YYYY-MM
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !isAuthorized(session.user.email)) {
        router.push('/ficha-rcc/');
        return;
      }
      fetchData();
    };
    checkAuth();
  }, [router, month]);

  const fetchData = async () => {
    setLoading(true);
    const [year] = month.split('-').map(Number);
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

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
          rMap[r.nombre] = procDict[r.proceso_id];
        }
      });
    }
    setResponsablesMap(rMap);
    setProcesosInfo(procData || []);

    const { data: records, error } = await supabase
      .from('registro_asistencia')
      .select('*')
      .gte('fecha', startOfYear)
      .lte('fecha', endOfYear)
      .order('fecha', { ascending: true });

    if (error) {
      console.error('Error fetching data:', error);
      setData([]);
    } else {
      setData(records || []);
    }
    setLoading(false);
  };

  // Datos para la gráfica de línea (Solo el mes seleccionado) - BASADO EN PROCESOS
  const dailyStats = useMemo(() => {
    const monthRecords = data.filter(r => r.fecha.startsWith(month));
    if (monthRecords.length === 0 || procesosInfo.length === 0) return [];
    
    const days: Record<string, Set<string>> = {}; // fecha -> Set de procesos presentes
    
    monthRecords.forEach(reg => {
      const procName = responsablesMap[reg.responsable];
      if (!procName) return;
      if (!days[reg.fecha]) days[reg.fecha] = new Set();
      if (reg.estado === 'Presente') {
        days[reg.fecha].add(procName);
      }
    });

    return Object.entries(days).map(([fecha, procsPresentes]) => ({
      fechaLabel: fecha.split('-')[2],
      porcentaje: Math.round((procsPresentes.size / procesosInfo.length) * 100),
      presentesList: Array.from(procsPresentes).sort()
    })).sort((a, b) => parseInt(a.fechaLabel) - parseInt(b.fechaLabel));
  }, [data, month, procesosInfo, responsablesMap]);

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

    // Agrupar por día primero para calcular el % diario y luego promediar por mes
    const dailyMap: Record<string, Set<string>> = {};
    data.forEach(reg => {
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
    }).filter((m, idx) => m.porcentaje > 0 || idx <= (new Date().getMonth()));
  }, [data, procesosInfo, responsablesMap]);

  // Procesar ranking de PROCESOS (Solo el mes seleccionado)
  const processStats = useMemo(() => {
    const monthRecords = data.filter(r => r.fecha.startsWith(month));
    const stats: Record<string, { name: string, cumplimientos: number, ausencias: number, permisos: number }> = {};
    
    // Inicializar todos los procesos conocidos
    procesosInfo.forEach(p => {
      stats[p.nombre] = { name: p.nombre, cumplimientos: 0, ausencias: 0, permisos: 0 };
    });
    
    // Agrupar por día y proceso para determinar el estado del proceso cada día
    const dailyProcessStatus: Record<string, Record<string, string>> = {}; // fecha -> proceso -> estado

    monthRecords.forEach(reg => {
      const procName = responsablesMap[reg.responsable];
      if (!procName) return;
      if (!dailyProcessStatus[reg.fecha]) dailyProcessStatus[reg.fecha] = {};
      
      // Estado inicial 'Excusa' si tiene registros ese día
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
        if (!stats[procName]) return; // Proceso no reconocido
        if (status === 'Presente') stats[procName].cumplimientos++;
        else if (status === 'Ausente') stats[procName].ausencias++;
      });
    });

    const list = Object.values(stats);
    const topCumplimiento = [...list].sort((a, b) => b.cumplimientos - a.cumplimientos || a.name.localeCompare(b.name));
    const topAusencias = [...list].sort((a, b) => b.ausencias - a.ausencias || a.name.localeCompare(b.name));

    return { topCumplimiento, topAusencias };
  }, [data, month, responsablesMap, procesosInfo]);
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#ffffff' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="home-container" style={{ maxWidth: '1400px' }}>
      <header className="header" style={{ marginBottom: '40px' }}>
        <div style={{ background: 'var(--header-bg)', padding: '20px 40px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <FirplakLogo height="60px" />
        </div>
        <Link href="/ficha-rcc/asistencia" style={{ textDecoration: 'none' }}>
           <button className="btn-secondary">Volver al Control</button>
        </Link>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>📊 Indicadores de Asistencia</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Filtrar Mes/Año:</label>
          <input 
            type="month" 
            className="input-field" 
            style={{ marginBottom: 0, padding: '8px 16px', width: '220px' }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
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
                  {monthlyStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === monthlyStats[parseInt(month.split('-')[1]) - 1]?.name ? 'var(--primary)' : 'var(--accent)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
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
  );
}

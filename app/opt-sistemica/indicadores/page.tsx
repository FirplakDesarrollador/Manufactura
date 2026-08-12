'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import Header from '@/components/opt-sistemica/Header';
import SubHeader from '@/components/opt-sistemica/SubHeader';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Cell, PieChart, Pie 
} from 'recharts';

interface RecordData {
  created_at: string;
  percentage: number;
  user_email: string;
  modulo_tipo: string;
}

interface PlanData {
  estado: string;
  fecha_programada: string;
  responsable_email: string;
  modulo_tipo: string;
}

export default function IndicadoresPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RecordData[]>([]);
  const [planning, setPlanning] = useState<PlanData[]>([]);
  const router = useRouter();

  const fetchData = async () => {
    setLoading(true);
    const { data: recData } = await supabase.from('opt_registros').select('created_at, percentage, user_email, modulo_tipo');
    const { data: planData } = await supabase.from('opt_planificacion').select('estado, fecha_programada, responsable_email, modulo_tipo');
    
    setRecords(recData || []);
    setPlanning(planData || []);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        fetchData();
      }
    });
  }, [router]);

  // Aggregate Data for Line Chart (Cumplimiento over time)
  const lineData = useMemo(() => {
    const sorted = [...records].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return sorted.map(r => ({
      fecha: new Date(r.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }),
      cumplimiento: r.percentage
    }));
  }, [records]);

  // Aggregate Data for Bar Chart (Cumplimiento per Responsible)
  const barData = useMemo(() => {
    const userMap: Record<string, { total: number, count: number }> = {};
    records.forEach(r => {
      const email = r.user_email?.split('@')[0] || 'Desconocido';
      if (!userMap[email]) userMap[email] = { total: 0, count: 0 };
      userMap[email].total += r.percentage;
      userMap[email].count += 1;
    });

    return Object.entries(userMap).map(([name, stats]) => ({
      name,
      promedio: parseFloat((stats.total / stats.count).toFixed(2))
    })).sort((a, b) => b.promedio - a.promedio);
  }, [records]);

  // Stats for Pie Chart (Planned vs Executed)
  const pieData = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    let executedCount = 0;
    let pendingCount = 0;
    let delayedCount = 0;

    const usedRecordIds = new Set();

    planning.forEach(p => {
      const pType = (p.modulo_tipo || '').trim().toUpperCase();
      const pDate = p.fecha_programada;

      if (!pDate) {
        pendingCount++;
        return;
      }

      // Find a matching record in opt_registros
      const matchingRecord = records.find(r => {
        if (usedRecordIds.has(r.created_at)) return false;
        
        const rType = (r.modulo_tipo || '').trim().toUpperCase();
        const rDateObj = new Date(r.created_at);
        const pDateObj = new Date(pDate + 'T12:00:00');
        
        const diffDays = Math.abs((rDateObj.getTime() - pDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        // Match if same module OR if planning is a general 'OPT' (matches any module)
        const typeMatch = (rType === pType) || (pType === 'OPT');
        const dateMatch = diffDays <= 3.1; // 3 days margin
        
        return typeMatch && dateMatch;
      });

      if (p.estado === 'EJECUTADA' || matchingRecord) {
        executedCount++;
        if (matchingRecord) usedRecordIds.add(matchingRecord.created_at);
      } else if (p.estado === 'ATRASADA' || (p.estado === 'PENDIENTE' && pDate < todayStr)) {
        delayedCount++;
      } else {
        pendingCount++;
      }
    });

    return [
      { name: 'Ejecutadas', value: executedCount, color: '#10b981' },
      { name: 'Programadas', value: pendingCount, color: '#f59e0b' },
      { name: 'Atrasadas', value: delayedCount, color: '#ef4444' },
    ];
  }, [planning, records]);

  if (loading) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Header
        title="Indicadores"
        subtitle="Métricas de Desempeño"
        backUrl="/sistema-produccion"
        userEmail={session?.user?.email}
        showLogout={false}
      />
      <SubHeader />

      <main className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
            <div>
              <h1 style={{ color: 'var(--accent)', fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px' }}>
                📊 Dashboard de Indicadores
              </h1>
              <p style={{ color: '#666' }}>Resumen analítico del Plan OPT Sistémica General</p>
            </div>
            <div style={{ padding: '12px 24px', background: 'white', borderRadius: '12px', border: '1px solid #eee', textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Observaciones</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>{records.length}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px', marginBottom: '30px' }}>
            {/* Chart 1: Cumplimiento Lineal */}
            <div className="card" style={{ padding: '30px' }}>
              <h3 style={{ color: 'var(--header-bg)', marginBottom: '24px', fontSize: '1.2rem', fontWeight: 700 }}>Cumplimiento Plan OPT (% Historico)</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="fecha" stroke="#999" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} stroke="#999" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Line type="monotone" dataKey="cumplimiento" stroke="var(--primary)" strokeWidth={4} dot={{ r: 4, fill: 'var(--primary)' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Cumplimiento por Responsable */}
            <div className="card" style={{ padding: '30px' }}>
              <h3 style={{ color: 'var(--header-bg)', marginBottom: '24px', fontSize: '1.2rem', fontWeight: 700 }}>Cumplimiento por Responsable (%)</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#999" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} stroke="#999" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: 'rgba(0,0,0,0.02)'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="promedio" fill="#dc2626" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.promedio >= 80 ? '#10b981' : entry.promedio >= 50 ? '#f59e0b' : '#dc2626'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
            {/* Chart 3: Planned vs Executed */}
            <div className="card" style={{ padding: '30px' }}>
              <h3 style={{ color: 'var(--header-bg)', marginBottom: '24px', fontSize: '1.2rem', fontWeight: 700 }}>Estatus de Planeación</h3>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Programadas</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{planning.length}</div>
              </div>
            </div>

            {/* General Performance Info */}
            <div className="card" style={{ padding: '40px', background: 'var(--header-bg)', color: 'white' }}>
              <h3 style={{ color: 'white', marginBottom: '32px', fontSize: '1.4rem' }}>Resumen de Desempeño</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '8px' }}>Promedio Global</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800 }}>
                    {(records.reduce((acc, r) => acc + r.percentage, 0) / (records.length || 1)).toFixed(1)}%
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '8px', color: '#10b981' }}>Ejecutadas (%)</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800 }}>
                    {planning.length > 0 ? ((pieData.find(d => d.name === 'Ejecutadas')?.value || 0) / planning.length * 100).toFixed(1) : 0}%
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '8px', color: '#ef4444' }}>Atrasadas (%)</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800 }}>
                    {planning.length > 0 ? ((pieData.find(d => d.name === 'Atrasadas')?.value || 0) / planning.length * 100).toFixed(1) : 0}%
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '8px', color: '#f59e0b' }}>Programadas (%)</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800 }}>
                    {planning.length > 0 ? ((pieData.find(d => d.name === 'Programadas')?.value || 0) / planning.length * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h4 style={{ marginBottom: '12px' }}>💡 Recomendación del Sistema</h4>
                <p style={{ fontSize: '0.95rem', opacity: 0.8, lineHeight: 1.5 }}>
                  {records.length > 0 && (records.reduce((acc, r) => acc + r.percentage, 0) / records.length) < 80 
                    ? "Se recomienda enfocar el entrenamiento en los responsables con puntajes inferiores al 80% para estandarizar procesos."
                    : "El desempeño general es excelente. Continúe con el seguimiento periódico según el cronograma."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

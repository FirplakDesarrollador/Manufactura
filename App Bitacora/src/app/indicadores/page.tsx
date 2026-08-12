"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ChevronLeft, BarChart3, TrendingUp, Calendar, 
  Award, CheckCircle, Loader2, ArrowLeftRight 
} from "lucide-react";

export default function IndicadoresPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} size={48} />
      </div>
    );
  }

  // Mock indicators data for high fidelity feel
  const kpis = [
    { title: "Cumplimiento General", value: "92.4%", desc: "+3.2% respecto al mes anterior", color: "var(--primary)", icon: <TrendingUp size={24} /> },
    { title: "Bitácoras Llenas Hoy", value: "6 / 8", desc: "Pendiente: Almacén y Servicios", color: "#0f766e", icon: <CheckCircle size={24} /> },
    { title: "Proceso con Mayor Puntaje", value: "Calidad (MBL)", desc: "100% de cumplimiento consecutivo", color: "#f59e0b", icon: <Award size={24} /> },
  ];

  const processChartData = [
    { name: "Mármol Sintético", value: 95, color: "var(--primary)" },
    { name: "Fibra de Vidrio", value: 88, color: "var(--primary-hover)" },
    { name: "Calidad - MS y FV", value: 100, color: "#10b981" },
    { name: "Calidad - MBL y CEFI", value: 90, color: "#059669" },
    { name: "Ingeniería", value: 92, color: "#3b82f6" },
    { name: "Logística", value: 85, color: "#f59e0b" },
  ];

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '40px' }}>
        <button 
          onClick={() => router.push('/')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', 
            background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 700, 
            cursor: 'pointer', marginBottom: '12px', padding: 0
          }}
        >
          <ChevronLeft size={18} />
          Volver al Inicio
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 700, marginBottom: '8px' }}>
              Panel de Indicadores
            </h1>
            <p style={{ color: '#666', fontSize: '1.1rem' }}>
              Métricas de cumplimiento y desempeño del proceso de bitácoras
            </p>
          </div>
          <div style={{ background: 'white', padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
            <Calendar size={18} color="var(--primary)" />
            <span style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '0.9rem' }}>Mayo 2026</span>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {kpis.map((kpi, idx) => (
          <div key={idx} className="card" style={{ display: 'flex', gap: '20px', alignItems: 'center', borderTop: `6px solid ${kpi.color}` }}>
            <div style={{ background: `${kpi.color}15`, color: kpi.color, width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {kpi.icon}
            </div>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>{kpi.title}</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)', margin: '4px 0' }}>{kpi.value}</h2>
              <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>{kpi.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '32px' }}>
        {/* Chart 1: Porcentaje de Cumplimiento por Proceso */}
        <div className="card">
          <h3 style={{ color: 'var(--accent)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px' }}>
            Porcentaje de Cumplimiento por Proceso
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {processChartData.map((data, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>
                  <span style={{ color: 'var(--accent)' }}>{data.name}</span>
                  <span style={{ color: data.color }}>{data.value}%</span>
                </div>
                <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '50px', overflow: 'hidden' }}>
                  <div style={{ width: `${data.value}%`, height: '100%', background: data.color, borderRadius: '50px', transition: 'width 1s ease-in-out' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Informes y Historial table */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'var(--accent)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px' }}>
            Historial de Cumplimiento Reciente
          </h3>
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', color: '#888', fontWeight: 700 }}>
                  <th style={{ padding: '12px 8px' }}>Fecha</th>
                  <th style={{ padding: '12px 8px' }}>Proceso</th>
                  <th style={{ padding: '12px 8px' }}>Actividades</th>
                  <th style={{ padding: '12px 8px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { fecha: "25/05/2026", proceso: "Calidad - MS y FV", acts: "12 / 12", estado: "Completado", color: "#10b981" },
                  { fecha: "25/05/2026", proceso: "Mármol Sintético", acts: "9 / 10", estado: "90%", color: "#3b82f6" },
                  { fecha: "24/05/2026", proceso: "Calidad - MBL y CEFI", acts: "15 / 15", estado: "Completado", color: "#10b981" },
                  { fecha: "24/05/2026", proceso: "Logística", estado: "Incompleto", acts: "5 / 8", color: "#ef4444" },
                  { fecha: "23/05/2026", proceso: "Fibra de Vidrio", acts: "11 / 11", estado: "Completado", color: "#10b981" },
                ].map((row, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '16px 8px', color: '#666' }}>{row.fecha}</td>
                    <td style={{ padding: '16px 8px', fontWeight: 600, color: 'var(--accent)' }}>{row.proceso}</td>
                    <td style={{ padding: '16px 8px', color: '#666' }}>{row.acts}</td>
                    <td style={{ padding: '16px 8px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', fontWeight: 800, background: `${row.color}15`, 
                        color: row.color, padding: '4px 10px', borderRadius: '50px' 
                      }}>
                        {row.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

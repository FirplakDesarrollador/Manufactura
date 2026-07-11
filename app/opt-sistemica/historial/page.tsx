'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import Header from '@/components/opt-sistemica/Header';

interface OPTRecord {
  id: string;
  created_at: string;
  user_id: string;
  user_email: string;
  modulo_tipo: string;
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
  }
};

export default function HistorialPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<OPTRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<OPTRecord | null>(null);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('opt_registros')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching records:', error);
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        fetchRecords();
      }
    });
  }, [router]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canEdit = (record: OPTRecord) => {
    if (!session?.user) return false;
    return (
      record.user_id === session.user.id || 
      AUTHORIZED_ADMINS.includes(session.user.email || '')
    );
  };

  const getModuleLabel = (type: string) => {
    switch (type) {
      case 'GI': return '📊 Gestión de Indicadores';
      case 'EE': return '🎓 Entrenamiento Estandarizado';
      case 'BE': return '📉 Gestión de Bajas Estadísticas';
      case 'AF': return '🤝 Acompañamiento Frecuente';
      case '5S': return "🧹 5'S";
      default: return type;
    }
  };

  if (!session) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Header
        title="Historial"
        subtitle="Consulta de Observaciones"
        backUrl="/opt-sistemica"
        userEmail={session.user.email}
        showLogout={false}
      />

      <main className="container" style={{ paddingTop: '50px', paddingBottom: '80px' }}>
        <div className="animate-fade-in">
          <h1 style={{ color: 'var(--accent)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '8px' }}>
            🕒 Historial de Observaciones
          </h1>
          <p style={{ color: '#666', marginBottom: '40px' }}>
            Consulta todos los registros completos de OPT sistémica.
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
              <div style={{ color: 'var(--primary)', fontWeight: 600 }}>Cargando registros...</div>
            </div>
          ) : records.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📁</div>
              <h3 style={{ color: '#999' }}>No se encontraron registros todavía.</h3>
              <p style={{ color: '#bbb' }}>Los registros que guardes aparecerán aquí.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#f0f4f5', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '16px', color: 'var(--accent)' }}>Fecha</th>
                    <th style={{ padding: '16px', color: 'var(--accent)' }}>Usuario</th>
                    <th style={{ padding: '16px', color: 'var(--accent)' }}>Módulo</th>
                    <th style={{ padding: '16px', color: 'var(--accent)', textAlign: 'center' }}>Puntaje</th>
                    <th style={{ padding: '16px', color: 'var(--accent)', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px', fontWeight: 500 }}>{formatDate(record.created_at)}</td>
                      <td style={{ padding: '16px', color: '#666', fontSize: '0.9rem' }}>{record.user_email}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          background: 'rgba(118, 149, 152, 0.1)', 
                          color: 'var(--primary)', 
                          padding: '4px 10px', 
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          {record.modulo_tipo}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ 
                          fontWeight: 800, 
                          color: record.percentage >= 80 ? 'var(--success)' : record.percentage >= 50 ? '#f59e0b' : 'var(--error)'
                        }}>
                          {record.percentage}%
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => setSelectedRecord(record)}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          Ver Completa
                        </button>
                        {canEdit(record) && (
                          <button 
                            className="btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#3b82f6' }}
                            onClick={() => alert('Función de edición próximamente disponible.')}
                          >
                            ✎ Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  {getModuleLabel(selectedRecord.modulo_tipo)}
                </h2>
                <div style={{ marginTop: '4px', color: '#666', fontSize: '0.95rem' }}>
                  <strong>Realizado por:</strong> {selectedRecord.user_email} 
                  <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>
                  <strong>Fecha:</strong> {formatDate(selectedRecord.created_at)}
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
              {Object.entries(selectedRecord.responses).sort().map(([id, res]: [string, any]) => (
                <div key={id} style={{ padding: '24px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 800, color: 'var(--header-bg)', display: 'block', marginBottom: '4px' }}>
                        Pregunta {id}
                      </span>
                      <span style={{ fontWeight: 500, color: 'var(--accent)', fontSize: '1.05rem', lineHeight: 1.4 }}>
                        {QUESTION_MAPPING[selectedRecord.modulo_tipo]?.[id] || 'Pregunta no identificada'}
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
                      "{res.comment}"
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
                <div style={{ color: '#666', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>Cumplimiento General</div>
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
    </div>
  );
}

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import { supabaseTalentoHumano } from '@/lib/supabase_talento_humano';
import Header from '@/components/opt-sistemica/Header';
import SubHeader from '@/components/opt-sistemica/SubHeader';
import SearchableSelect from '@/components/mtto-autonomo/SearchableSelect';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Clock, User, Target } from 'lucide-react';

interface Planificacion {
  id: string;
  fecha_programada: string;
  hora_inicio: string;
  responsable_email: string;
  observado_nombre: string;
  modulo_tipo: string;
  estado: string;
}

const MODULOS = [
  { id: 'GI', label: 'GI' },
  { id: 'EE', label: 'EE' },
  { id: 'AF', label: 'AF' },
  { id: '5S', label: "5'S" },
  { id: 'BIT', label: 'BIT' },
  { id: 'OPT', label: 'OPT' },
  { id: 'TE', label: 'TE' },
];

const HOURS = Array.from({ length: 12 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);
const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const CARGOS_USAR_CORREO = [
  'Analista comercial',
  'Analista de abastecimiento',
  'Analista de Cartera',
  'Analista de Contabilidad',
  'Analista de control contractual',
  'Analista de Diseño Organizacional',
  'Analista de formación y bienestar',
  'Analista de infraestructura y seguridad informática',
  'Analista de Ingeniería',
  'Analista de manufactura',
  'Analista de performance y desarrollo',
  'Analista de planeación de producción y abastecimiento',
  'Analista de planeación de producto terminado',
  'Analista de seguridad y salud en el trabajo',
  'Analista de TI',
  'Analista prevención y control ambiental',
  'Analista SGSST y cumplimiento legal',
  'Asentador de fibra',
  'Auxiliar de recibo',
  'Auxiliar de retención y reactivación de clientes',
  'Auxiliar de servicios',
  'Auxiliar de servicios generales',
  'Auxiliar de talento y vinculación',
  'Auxiliar de vaciado MS',
  'Auxiliar de ventas MAC',
  'Auxiliar e-commerce',
  'Auxiliar junior cartera',
  'Auxiliar junior de abastecimiento',
  'Auxiliar junior de almacenamiento',
  'Auxiliar junior de comercio exterior',
  'Auxiliar junior de contabilidad',
  'Auxiliar junior de distribución',
  'Auxiliar junior de facturación',
  'Auxiliar junior de programación e inventarios',
  'Auxiliar junior ingeniería',
  'Auxiliar junior logística',
  'Auxiliar junior mensajería',
  'Auxiliar logistica',
  'Auxiliar senior abastecimiento',
  'Auxiliar senior cartera',
  'Auxiliar senior comercio exterior',
  'Auxiliar senior de ingeniería',
  'Auxiliar senior de logística',
  'Auxiliar senior de servicios',
  'Coordinador de Ingeniería de Diseño',
  'Coordinador de mantenimiento',
  'Coordinador de planeación de producción',
  'Coordinador de servicios técnicos',
  'Coordinador de soporte técnico y servicios',
  'Coordinador de tienda',
  'Coordinador diseño muebles',
  'Coordinador e-commerce',
  'Coordinador exportaciones - Obras',
  'Coordinador KAM autoservicio nacional',
  'Coordinador MAC',
  'Coordinador Marketplace',
  'Coordinador moldes',
  'Coordinadora de cartera y tesorería',
  'Coordinadora de costos e inventarios',
  'Coordinadora de exportaciones y distribución',
  'Coordinadora de manufactura',
  'Director compras y mercadeo',
  'Director de I+D+i',
  'Director de Logística',
  'Director de manufactura',
  'Director de talento y tecnología',
  'Director de ventas',
  'Directora de Contabilidad',
  'Directora financiera',
  'Diseñador gráfico',
  'Especialista de desarrollo de producto',
  'Especialista de diseño integral',
  'Especialista de diseño junior',
  'Especialista de ingeniería de diseño',
  'Especialista junior de diseño',
  'Especialista junior de producto',
  'Estimador de proyectos',
  'Gerente general',
  'Implementador de producto',
  'Implementador de producto y mejora continua',
  'Jefe canal distribución',
  'Jefe de abastecimiento MP',
  'Jefe de Calidad y Sistema de producción',
  'Jefe de canal obras y distribución',
  'Jefe de comercio exterior y key account compras',
  'Jefe de ingeniería',
  'Jefe de mantenimiento',
  'Jefe de mercadeo',
  'Jefe de negociación y compras',
  'Jefe de Producción',
  'Jefe de servicios',
  'Jefe de talento humano',
  'Jefe jurídico y normativo',
  'Jefe zona córdoba sucre urabá'
];

const normalizeString = (str: string) => 
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function AgendamientoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planned, setPlanned] = useState<Planificacion[]>([]);
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  // Employees list from public.empleados
  interface Empleado {
    id: number;
    nombreCompleto: string;
    correo_electronico: string;
    cargo: string | null;
  }
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('08:00');
  const [responsable, setResponsable] = useState('');
  const [observado, setObservado] = useState('');
  const [modulo, setModulo] = useState('GI');
  const [error, setError] = useState<string | null>(null);
  const [successEvent, setSuccessEvent] = useState<any>(null);

  const fetchData = async () => {
    const { data } = await supabase.from('opt_planificacion').select('*');
    if (data) setPlanned(data);
  };

  const fetchEmpleados = async () => {
    const { data } = await supabaseTalentoHumano
      .from('empleados')
      .select('id, nombreCompleto, correo_electronico, cargo')
      .eq('activo', true)
      .order('nombreCompleto');
    if (data) {
      setEmpleados(data);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        Promise.all([fetchData(), fetchEmpleados()]).then(() => setLoading(false));
      }
    });
  }, [router]);

  const getStatus = (item: Planificacion) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const planDate = new Date(item.fecha_programada + 'T00:00:00'); // Ensure local date interp

    if (item.estado === 'EJECUTADA') return 'EJECUTADA';
    if (planDate < today) return 'ATRASADA';
    return 'PROGRAMADA';
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const selectedEmp = empleados.find(emp => emp.nombreCompleto === responsable);
    
    let targetResponsableEmail = responsable;
    if (selectedEmp) {
      const normalizedCargos = CARGOS_USAR_CORREO.map(normalizeString);
      const cargoNormalized = normalizeString(selectedEmp.cargo || '');
      if (normalizedCargos.includes(cargoNormalized)) {
        targetResponsableEmail = selectedEmp.correo_electronico || selectedEmp.nombreCompleto;
        if (!targetResponsableEmail) {
          setError('El responsable seleccionado tiene un cargo que requiere correo electrónico, pero su correo no está registrado.');
          setSaving(false);
          return;
        }
      } else {
        targetResponsableEmail = selectedEmp.nombreCompleto;
      }
    }

    const { error: insertError } = await supabase.from('opt_planificacion').insert({
      fecha_programada: fecha,
      hora_inicio: `${hora}:00`,
      responsable_email: targetResponsableEmail,
      observado_nombre: observado,
      modulo_tipo: modulo,
      created_by: session.user.id
    });

    if (!insertError) {
      setSuccessEvent({ fecha, hora, modulo, responsable, observado });
      fetchData();
    } else {
      console.error("Error inserting planificacion:", insertError);
      setError(insertError.message || 'Error al guardar la programación.');
    }
    setSaving(false);
  };

  const handleCloseSuccess = () => {
    setSuccessEvent(null);
    setShowForm(false);
    setFecha('');
    setResponsable('');
    setObservado('');
  };

  const getOutlookLink = (ev: any) => {
    const startdtStr = `${ev.fecha}T${ev.hora}:00`;
    const endHour = String(parseInt(ev.hora.split(':')[0]) + 1).padStart(2, '0');
    const enddtStr = `${ev.fecha}T${endHour}:${ev.hora.split(':')[1]}:00`;
    const subject = `OPT: ${ev.modulo}`;
    const body = `Registro de OPT (${ev.modulo}) programado.\nResponsable: ${ev.responsable}\nColaborador: ${ev.observado}`;
    return `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(subject)}&startdt=${startdtStr}&enddt=${enddtStr}&body=${encodeURIComponent(body)}`;
  };

  // Monthly Grid Data
  const monthlyDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    // Previous month overlap
    const prevDaysCount = firstDay.getDay(); // 0 is Sunday
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = prevDaysCount - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, month: month - 1, year, currentMonth: false });
    }
    
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ day: i, month, year, currentMonth: true });
    }
    
    // Next month overlap
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: month + 1, year, currentMonth: false });
    }
    
    return days;
  }, [currentDate]);

  // Weekly Grid Data
  const weeklyDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? 0 : 0); // Start on Sunday as per image
    const mondayOffset = startOfWeek.getDate() - day; // Sunday is 0
    startOfWeek.setDate(mondayOffset);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const navigate = (dir: number) => {
    const next = new Date(currentDate);
    if (viewMode === 'weekly') {
      next.setDate(currentDate.getDate() + (dir * 7));
    } else {
      next.setMonth(currentDate.getMonth() + dir);
    }
    setCurrentDate(next);
  };

  const isToday = (d: number, m: number, y: number) => {
    const today = new Date();
    return today.getDate() === d && today.getMonth() === m && today.getFullYear() === y;
  };

  if (loading) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Header
        title="Agendamiento"
        subtitle="Planificación de Observaciones"
        backUrl="/sistema-produccion"
        userEmail={session?.user?.email}
        showLogout={false}
      />
      <SubHeader />

      <main className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h1 style={{ color: 'var(--accent)', fontSize: '2.5rem', fontWeight: 800, marginBottom: '4px' }}>
                {viewMode === 'weekly' ? 'Semana ' : ''}
                {currentDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase()}
              </h1>
              <p style={{ color: '#666' }}>Planificación de observaciones {viewMode === 'weekly' ? 'semanal' : 'mensual'}.</p>
            </div>
            <button onClick={() => { setError(null); setShowForm(true); }} className="btn-primary" style={{ padding: '14px 28px', fontSize: '1.1rem' }}>
              + Nuevo
            </button>
          </div>

          {/* Calendar Controller */}
          <div style={{ background: 'white', padding: '16px', borderRadius: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button onClick={() => navigate(-1)} style={{ background: '#f3f4f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><ChevronLeft /></button>
              <h3 style={{ fontWeight: 700, minWidth: '180px', textAlign: 'center' }}>
                {viewMode === 'weekly' 
                  ? `Del ${weeklyDays[0].getDate()} al ${weeklyDays[6].getDate()}` 
                  : currentDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase()}
              </h3>
              <button onClick={() => navigate(1)} style={{ background: '#f3f4f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><ChevronRight /></button>
            </div>
            <button onClick={() => setCurrentDate(new Date())} style={{ background: 'transparent', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Hoy</button>
          </div>

          {viewMode === 'weekly' ? (
            /* WEEKLY VIEW */
            <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', border: '1px solid #edf2f7' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: '1px solid #edf2f7' }}>
                <div style={{ padding: '20px', background: '#f8fafc' }}></div>
                {weeklyDays.map((date, i) => {
                  const active = date.toDateString() === new Date().toDateString();
                  return (
                    <div key={i} style={{ padding: '20px', textAlign: 'center', background: active ? 'rgba(118,149,152,0.08)' : 'white', borderLeft: '1px solid #edf2f7' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                        {date.toLocaleDateString('es-CO', { weekday: 'short' })}
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: active ? 'var(--primary)' : 'var(--accent)' }}>
                        {date.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ height: '600px', overflowY: 'auto' }}>
                {HOURS.map((hour) => (
                  <div key={hour} style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', minHeight: '80px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ padding: '20px 10px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textAlign: 'right', background: '#f8fafc' }}>{hour}</div>
                    {weeklyDays.map((date, i) => {
                      const dStr = date.toISOString().split('T')[0];
                      const events = planned.filter(p => p.fecha_programada === dStr && p.hora_inicio.startsWith(hour.slice(0, 2)));
                      return (
                        <div key={i} style={{ borderLeft: '1px solid #f1f5f9', padding: '8px', position: 'relative' }}>
                          {events.map(ev => {
                            const status = getStatus(ev);
                            return (
                              <div key={ev.id} style={{ 
                                background: status === 'EJECUTADA' ? '#ecfdf5' : status === 'ATRASADA' ? '#fef2f2' : '#fff7ed',
                                color: status === 'EJECUTADA' ? '#065f46' : status === 'ATRASADA' ? '#991b1b' : '#9a3412',
                                borderLeft: `4px solid ${status === 'EJECUTADA' ? '#10b981' : status === 'ATRASADA' ? '#ef4444' : '#f97316'}`,
                                padding: '8px', borderRadius: '8px', fontSize: '0.7rem', marginBottom: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                              }}>
                                <div style={{ fontWeight: 800 }}>{ev.hora_inicio.slice(0,5)} {ev.modulo_tipo}</div>
                                <div style={{ opacity: 0.8 }}>{ev.responsable_email}</div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* MONTHLY VIEW (7-col grid) */
            <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', border: '1px solid #edf2f7' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #edf2f7', background: '#f8fafc' }}>
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} style={{ padding: '16px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>{day}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(120px, auto)' }}>
                {monthlyDays.map((d, index) => {
                  const dStr = `${d.year}-${(d.month + 1).toString().padStart(2, '0')}-${d.day.toString().padStart(2, '0')}`;
                  const events = planned.filter(p => p.fecha_programada === dStr);
                  const active = isToday(d.day, d.month, d.year);
                  return (
                    <div key={index} style={{ 
                      borderLeft: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '12px',
                      background: d.currentMonth ? 'white' : '#fcfcfc', opacity: d.currentMonth ? 1 : 0.4
                    }}>
                      <div style={{ 
                        fontSize: '1rem', fontWeight: 800, marginBottom: '12px', 
                        color: active ? 'white' : 'var(--accent)',
                        background: active ? 'var(--primary)' : 'transparent',
                        width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>{d.day}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {events.slice(0, 3).map(ev => {
                          const status = getStatus(ev);
                          return (
                            <div key={ev.id} style={{ 
                              padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
                              background: status === 'EJECUTADA' ? '#ecfdf5' : status === 'ATRASADA' ? '#fef2f2' : '#fff7ed',
                              color: status === 'EJECUTADA' ? '#065f46' : status === 'ATRASADA' ? '#991b1b' : '#9a3412',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                              {ev.hora_inicio.split(':')[0]}:00 {ev.modulo_tipo} - Resp: {ev.responsable_email}
                            </div>
                          );
                        })}
                        {events.length > 3 && (
                          <div style={{ fontSize: '0.65rem', color: '#999', fontWeight: 700, paddingLeft: '8px' }}>
                            +{events.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '40px' }}>
            {successEvent ? (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#065f46', fontSize: '1.8rem', fontWeight: 800, marginBottom: '16px' }}>
                  ✅ ¡OPT Agendada!
                </h2>
                <p style={{ color: '#666', marginBottom: '32px' }}>
                  La programación se ha guardado en el sistema correctamente.<br/><br/>
                  Para asegurar que no lo olvides, puedes agregarlo a tu calendario oficial:
                </p>
                <a 
                  href={getOutlookLink(successEvent)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display: 'block', background: '#0078D4', color: 'white', padding: '16px', borderRadius: '12px', fontWeight: 700, textDecoration: 'none', marginBottom: '16px', fontSize: '1.05rem', boxShadow: '0 4px 10px rgba(0, 120, 212, 0.3)' }}
                >
                  📅 Agregar a MS Teams / Outlook
                </a>
                <button onClick={handleCloseSuccess} style={{ background: 'transparent', border: 'none', color: '#666', fontWeight: 600, cursor: 'pointer', padding: '12px', textDecoration: 'underline' }}>
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ color: 'var(--header-bg)', fontWeight: 800, marginBottom: '32px' }}>Nueva Programación</h2>
                <form onSubmit={handleSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                    <div><label className="label">Fecha</label><input type="date" className="input-field" value={fecha} onChange={e => setFecha(e.target.value)} required /></div>
                    <div><label className="label">Hora</label><input type="time" className="input-field" value={hora} onChange={e => setHora(e.target.value)} required /></div>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Inter', sans-serif", display: 'block', marginBottom: '4px' }}>Responsable</label>
                    <SearchableSelect 
                      label=""
                      placeholder="Buscar o seleccionar responsable..."
                      options={empleados.map(e => ({ id: e.id, label: e.nombreCompleto }))}
                      value={responsable}
                      onChange={setResponsable}
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Inter', sans-serif", display: 'block', marginBottom: '4px' }}>Colaborador Observado</label>
                    <SearchableSelect 
                      label=""
                      placeholder="Buscar o seleccionar colaborador..."
                      options={empleados.map(e => ({ id: e.id, label: e.nombreCompleto }))}
                      value={observado}
                      onChange={setObservado}
                    />
                  </div>
                  <select className="input-field" value={modulo} onChange={e => setModulo(e.target.value)}>
                    {MODULOS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                      ⚠️ {error}
                    </div>
                  )}
                  <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '16px' }}>
                    {saving ? 'Guardando...' : 'Confirmar Programación'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}>Cancelar</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

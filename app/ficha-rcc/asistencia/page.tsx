'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/ficha-rcc/supabaseClient';
import FirplakLogo from '@/components/ficha-rcc/FirplakLogo';
import Link from 'next/link';
import { isAuthorized } from '@/lib/ficha-rcc/auth';
import Combobox from '@/components/ficha-rcc/Combobox';

type AsistenciaEstado = 'Presente' | 'Ausente' | 'Permiso' | 'Incapacidad' | 'No Convocado';

interface RegistroAsistencia {
  responsable: string;
  estado: AsistenciaEstado;
}

export default function AsistenciaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fecha, setFecha] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [procesos, setProcesos] = useState<any[]>([]);
  const [registros, setRegistros] = useState<Record<string, AsistenciaEstado>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !isAuthorized(session.user.email)) {
        router.push('/ficha-rcc/');
        return;
      }
      await fetchResponsables();
    };
    init();
  }, [router]);

  useEffect(() => {
    if (procesos.length > 0) {
      fetchAsistencia(fecha);
    }
  }, [fecha, procesos]);

  const fetchResponsables = async () => {
    setLoading(true);
    const { data: respData } = await supabase
      .from('cat_responsables')
      .select('nombre, proceso_id, cat_procesos(nombre)')
      .order('nombre', { ascending: true });
    
    const { data: procData } = await supabase
      .from('cat_procesos')
      .select('*')
      .order('nombre', { ascending: true });

    if (procData && respData) {
      const grouped = procData.map(proc => ({
        ...proc,
        personal: respData.filter(r => r.proceso_id === proc.id)
      }));
      setProcesos(grouped);
    }
    setLoading(false);
  };

  const fetchAsistencia = async (fechaSeleccionada: string) => {
    const { data, error } = await supabase
      .from('registro_asistencia')
      .select('responsable, estado')
      .eq('fecha', fechaSeleccionada);
    
    if (error) {
      console.error('Error fetching asistencia:', error);
      return;
    }

    const nuevosRegistros: Record<string, AsistenciaEstado> = {};
    
    // Por defecto todos presentes
    procesos.forEach(proc => {
      proc.personal.forEach((p: any) => {
        nuevosRegistros[p.nombre] = 'Presente';
      });
    });

    // Sobrescribir con los registros existentes
    if (data && data.length > 0) {
      data.forEach(reg => {
        nuevosRegistros[reg.responsable] = reg.estado as AsistenciaEstado;
      });
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }

    setRegistros(nuevosRegistros);
  };

  const handleEstadoChange = (responsable: string, nuevoEstado: string) => {
    setRegistros(prev => ({
      ...prev,
      [responsable]: nuevoEstado as AsistenciaEstado
    }));
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      // 1. Borrar registros existentes para esa fecha
      await supabase
        .from('registro_asistencia')
        .delete()
        .eq('fecha', fecha);

      // 2. Insertar los nuevos registros
      const registrosAInsertar = Object.entries(registros).map(([resp, est]) => ({
        fecha: fecha,
        responsable: resp,
        estado: est
      }));

      const { error } = await supabase
        .from('registro_asistencia')
        .insert(registrosAInsertar);

      if (error) throw error;
      
      alert('Asistencia guardada/actualizada correctamente.');
    } catch (error) {
      console.error('Error guardando asistencia:', error);
      alert('Error al guardar asistencia.');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarDia = async () => {
    if (!confirm(`¿Estás seguro de que deseas borrar TODA la asistencia del día ${fecha}?`)) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('registro_asistencia')
        .delete()
        .eq('fecha', fecha);

      if (error) throw error;
      
      alert('Datos del día eliminados.');
      fetchAsistencia(fecha);
    } catch (error) {
      console.error('Error eliminando día:', error);
      alert('Error al eliminar.');
    } finally {
      setSaving(false);
    }
  };

  // Calcular Indicadores por PROCESO
  // Un proceso asistió si al menos una persona del proceso está "Presente"
  const statsProcesos = procesos.map(proc => {
    const personalProceso = proc.personal.map((p: any) => registros[p.nombre]);
    const asistio = personalProceso.some((est: any) => est === 'Presente');
    return { nombre: proc.nombre, asistio };
  });

  const totalProcesos = statsProcesos.length;
  const procesosAsistieron = statsProcesos.filter(p => p.asistio).length;
  const porcentaje = totalProcesos > 0 ? Math.round((procesosAsistieron / totalProcesos) * 100) : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background-start)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="home-container" style={{ maxWidth: '1100px' }}>
      <div className="header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ background: 'var(--header-bg)', padding: '20px 40px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <FirplakLogo height="70px" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/ficha-rcc/asistencia/indicadores" style={{ textDecoration: 'none' }}>
             <button className="btn-primary" style={{ padding: '10px 20px', background: 'var(--accent)' }}>📊 Indicadores</button>
          </Link>
          <Link href="/" style={{ textDecoration: 'none' }}>
             <button className="btn-secondary">Volver al Panel</button>
          </Link>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '40px' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '10px' }}>Control de Asistencia Diaria</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Registra la asistencia del personal responsable principal.</p>

        {/* Indicadores y Filtros */}
        <div style={{ display: 'flex', gap: '30px', marginBottom: '40px', flexWrap: 'wrap' }}>
          {/* Tarjeta de Indicador */}
          <div style={{ 
            flex: 1, 
            minWidth: '250px', 
            background: 'var(--primary)', 
            borderRadius: '16px', 
            padding: '24px', 
            color: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
          }}>
            <div>
              <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px' }}>Asistencia por Procesos</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{porcentaje}%</div>
              <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '4px' }}>
                {procesosAsistieron} procesos presentes de {totalProcesos} totales
              </div>
            </div>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            </div>
          </div>

          {/* Selector de Fecha y Acciones */}
          <div style={{ flex: 1.5, minWidth: '350px', background: 'var(--surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Fecha de Asistencia</label>
                <input 
                  type="date" 
                  className="input-field" 
                  style={{ marginBottom: 0, width: '200px', fontSize: '16px', fontWeight: 'bold' }} 
                  value={fecha} 
                  onChange={(e) => setFecha(e.target.value)} 
                />
              </div>
              {isEditing && (
                <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, border: '1px solid #bae6fd', textTransform: 'uppercase' }}>
                  📝 Editando datos guardados
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-primary" onClick={handleGuardar} disabled={saving} style={{ flex: 2 }}>
                {saving ? <div className="spinner"></div> : isEditing ? 'ACTUALIZAR DATOS' : 'GUARDAR ASISTENCIA'}
              </button>
              {isEditing && (
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}
                  onClick={handleEliminarDia}
                  disabled={saving}
                >
                  BORRAR
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {procesos.map((proc, pIdx) => (
            <div key={pIdx} style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'visible' }}>
              <div style={{ padding: '12px 24px', background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--border)', fontWeight: 'bold', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{proc.nombre}</span>
                <span style={{ fontSize: '12px', color: statsProcesos.find(s => s.nombre === proc.nombre)?.asistio ? '#10b981' : '#ef4444' }}>
                  {statsProcesos.find(s => s.nombre === proc.nombre)?.asistio ? '✓ PROCESO PRESENTE' : '✗ PROCESO AUSENTE'}
                </span>
              </div>
              {proc.personal.map((p: any, idx: number) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 200px', padding: '12px 24px', borderBottom: idx === proc.personal.length - 1 ? 'none' : '1px solid var(--border)', alignItems: 'center' }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.nombre}</div>
                  <div>
                    <Combobox 
                      options={['Presente', 'Ausente', 'Permiso', 'Incapacidad', 'No Convocado']}
                      value={registros[p.nombre] || 'Presente'}
                      onChange={(val) => handleEstadoChange(p.nombre, val)}
                    />
                  </div>
                </div>
              ))}
              {proc.personal.length === 0 && (
                <div style={{ padding: '15px 24px', color: 'var(--text-muted)', fontSize: '14px' }}>Sin personal asignado</div>
              )}
            </div>
          ))}
          {procesos.length === 0 && (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay procesos registrados. Configúralos en el Panel de Administrador.</div>
          )}
        </div>

        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleGuardar} className="btn-primary" disabled={saving || procesos.length === 0} style={{ padding: '16px 32px', fontSize: '18px' }}>
            {saving ? <div className="spinner"></div> : 'Guardar Asistencia'}
          </button>
        </div>

      </div>
    </div>
  );
}

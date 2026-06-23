'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/ficha-rcc/supabaseClient';
import FirplakLogo from '@/components/ficha-rcc/FirplakLogo';
import Link from 'next/link';

// Correos autorizados para el módulo de administrador
const ADMIN_EMAILS = [
  'coordinacioncalidad@firplak.com', 
  'estiven.londono@firplak.com', 
  'estiven.londoño@firplak.com'
];

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [planta, setPlanta] = useState('Mármol Sintético');
  const [defectos, setDefectos] = useState<any[]>([]);
  const [nuevoDefecto, setNuevoDefecto] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [activeTab, setActiveTab] = useState<'defectos' | 'personal' | 'procesos' | 'mantenimiento'>('defectos');
  const [fechaBorrar, setFechaBorrar] = useState('');
  const [responsables, setResponsables] = useState<any[]>([]);
  const [procesos, setProcesos] = useState<any[]>([]);
  const [nuevoResponsable, setNuevoResponsable] = useState('');
  const [idProcesoNuevoResp, setIdProcesoNuevoResp] = useState('');
  const [nuevoProceso, setNuevoProceso] = useState('');
  const [filtroPersonal, setFiltroPersonal] = useState('');

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      const userEmail = session.user.email?.toLowerCase() || '';
      const adminFound = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);
      
      if (!adminFound) {
        router.push('/ficha-rcc/');
        return;
      }
      
      setIsAdmin(true);
      setLoading(false);
    };
    checkAdmin();
  }, [router]);

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'defectos') fetchDefectos();
      else if (activeTab === 'personal') {
        fetchResponsables();
        fetchProcesos();
      }
      else if (activeTab === 'procesos') fetchProcesos();
    }
  }, [isAdmin, planta, activeTab]);

  const fetchDefectos = async () => {
    const { data } = await supabase
      .from('cat_defectos')
      .select('*')
      .eq('planta', planta)
      .order('posicion', { ascending: true });
    if (data) setDefectos(data);
  };

  const fetchResponsables = async () => {
    const { data } = await supabase
      .from('cat_responsables')
      .select('*, cat_procesos(nombre)')
      .order('nombre', { ascending: true });
    if (data) setResponsables(data);
  };

  const fetchProcesos = async () => {
    const { data } = await supabase
      .from('cat_procesos')
      .select('*')
      .order('nombre', { ascending: true });
    if (data) setProcesos(data);
  };

  const handleAddDefecto = async () => {
    if (!nuevoDefecto.trim()) return;
    setSaving(true);
    const nuevaPosicion = defectos.length > 0 ? Math.max(...defectos.map(d => d.posicion)) + 1 : 1;
    const { error } = await supabase.from('cat_defectos').insert([{ planta, nombre_defecto: nuevoDefecto.trim(), posicion: nuevaPosicion }]);
    if (error) alert('Error: ' + error.message);
    else { setNuevoDefecto(''); fetchDefectos(); }
    setSaving(false);
  };

  const handleAddResponsable = async () => {
    if (!nuevoResponsable.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('cat_responsables').insert([{ 
      nombre: nuevoResponsable.trim(),
      proceso_id: idProcesoNuevoResp || null
    }]);
    if (error) alert('Error: ' + error.message);
    else { 
      setNuevoResponsable(''); 
      setIdProcesoNuevoResp('');
      fetchResponsables(); 
    }
    setSaving(false);
  };

  const handleAddProceso = async () => {
    if (!nuevoProceso.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('cat_procesos').insert([{ nombre: nuevoProceso.trim() }]);
    if (error) alert('Error: ' + error.message);
    else { setNuevoProceso(''); fetchProcesos(); }
    setSaving(false);
  };

  const handleDeleteDefecto = async (id: string) => {
    if (!confirm('¿Eliminar defecto?')) return;
    await supabase.from('cat_defectos').delete().eq('id', id);
    fetchDefectos();
  };

  const handleDeleteResponsable = async (id: string) => {
    if (!confirm('¿Eliminar responsable de la lista oficial?')) return;
    await supabase.from('cat_responsables').delete().eq('id', id);
    fetchResponsables();
  };

  const handleDeleteProceso = async (id: string) => {
    if (!confirm('¿Eliminar este proceso? Esto desvinculará al personal asociado.')) return;
    await supabase.from('cat_procesos').delete().eq('id', id);
    fetchProcesos();
    fetchResponsables();
  };

  const saveEditDefecto = async () => {
    if (!editingId || !editingNombre.trim()) return;
    setSaving(true);
    await supabase.from('cat_defectos').update({ nombre_defecto: editingNombre.trim() }).eq('id', editingId);
    setEditingId(null);
    fetchDefectos();
    setSaving(false);
  };

  const saveEditResponsable = async () => {
    if (!editingId || !editingNombre.trim()) return;
    setSaving(true);
    await supabase.from('cat_responsables').update({ 
      nombre: editingNombre.trim(),
      proceso_id: idProcesoNuevoResp || null
    }).eq('id', editingId);
    setEditingId(null);
    setIdProcesoNuevoResp('');
    fetchResponsables();
    setSaving(false);
  };

  const saveEditProceso = async () => {
    if (!editingId || !editingNombre.trim()) return;
    setSaving(true);
    await supabase.from('cat_procesos').update({ nombre: editingNombre.trim() }).eq('id', editingId);
    setEditingId(null);
    fetchProcesos();
    setSaving(false);
  };

  const handleBorrarPorFecha = async () => {
    if (!fechaBorrar) return;
    if (!confirm(`¿Estás seguro de que deseas borrar TODOS los datos de asistencia del día ${fechaBorrar}? Esta acción no se puede deshacer.`)) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('registro_asistencia')
      .delete()
      .eq('fecha', fechaBorrar);
      
    if (error) alert('Error: ' + error.message);
    else {
      alert('Datos borrados correctamente.');
      setFechaBorrar('');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-gradient)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const formatText = (str: string) => {
    if (!str) return "";
    const match = str.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/);
    if (!match || match.index === undefined) return str.toUpperCase();
    const index = match.index;
    const prefix = str.slice(0, index);
    const rest = str.slice(index);
    return prefix + rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase();
  };

  return (
    <div className="home-container" style={{ width: '100%', maxWidth: '850px', margin: '0 auto' }}>
      <div className="header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ background: 'var(--header-bg)', padding: '15px 30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <FirplakLogo height="50px" />
        </div>
        <Link href="/" style={{ textDecoration: 'none' }}>
           <button className="btn-secondary">Volver al Menú</button>
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '30px', minHeight: '700px', display: 'flex', flexDirection: 'column', width: '100%' }}>
        <h1 style={{ color: 'var(--primary)', marginBottom: '8px', fontSize: '26px' }}>Panel de Administración</h1>
        
        {/* Sistema de Pestañas */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
          <button 
            onClick={() => setActiveTab('defectos')}
            style={{ 
              padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: activeTab === 'defectos' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'defectos' ? 'var(--surface)' : 'var(--text-muted)',
              fontWeight: 600
            }}
          >
            Gestión de Defectos
          </button>
          <button 
            onClick={() => setActiveTab('personal')}
            style={{ 
              padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: activeTab === 'personal' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'personal' ? 'var(--surface)' : 'var(--text-muted)',
              fontWeight: 600
            }}
          >
            Gestión de Personal
          </button>
          <button 
            onClick={() => setActiveTab('procesos')}
            style={{ 
              padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: activeTab === 'procesos' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'procesos' ? 'var(--surface)' : 'var(--text-muted)',
              fontWeight: 600
            }}
          >
            Gestión de Procesos
          </button>
          <button 
            onClick={() => setActiveTab('mantenimiento')}
            style={{ 
              padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: activeTab === 'mantenimiento' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'mantenimiento' ? 'var(--surface)' : 'var(--text-muted)',
              fontWeight: 600
            }}
          >
            Mantenimiento
          </button>
        </div>

        {activeTab === 'defectos' ? (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Catálogo de defectos por cada planta.</p>
            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600 }}>Planta</label>
              <select className="input-field" value={planta} onChange={e => setPlanta(e.target.value)}>
                <option value="Mármol Sintético">Mármol Sintético</option>
                <option value="Fibra de vidrio">Fibra de vidrio</option>
                <option value="Muebles">Muebles</option>
                <option value="Cefi">Cefi</option>
              </select>
            </div>

            <div style={{ background: 'var(--surface-hover)', padding: '20px', borderRadius: '15px', marginBottom: '30px', border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '12px', color: 'var(--primary)' }}>Añadir Defecto</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input className="input-field" style={{ marginBottom: 0, flex: 1 }} value={nuevoDefecto} onChange={e => setNuevoDefecto(e.target.value)} />
                <button className="btn-primary" style={{ width: 'auto' }} onClick={handleAddDefecto} disabled={saving}>Añadir</button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Registrados ({defectos.length})</h3>
              <input 
                placeholder="Buscar..." className="input-field" style={{ width: '200px', marginBottom: 0, padding: '6px' }}
                value={filtroBusqueda} onChange={e => setFiltroBusqueda(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {defectos.filter(d => d.nombre_defecto.toLowerCase().includes(filtroBusqueda.toLowerCase())).map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {editingId === d.id ? (
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <input className="input-field" style={{ marginBottom: 0, flex: 1 }} value={editingNombre} onChange={e => setEditingNombre(e.target.value)} />
                      <button className="btn-primary" style={{ width: 'auto' }} onClick={saveEditDefecto}>✓</button>
                      <button className="btn-secondary" style={{ width: 'auto' }} onClick={() => setEditingId(null)}>×</button>
                    </div>
                  ) : (
                    <>
                      <span>{formatText(d.nombre_defecto)}</span>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => { setEditingId(d.id); setEditingNombre(d.nombre_defecto); }} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Editar</button>
                        <button onClick={() => handleDeleteDefecto(d.id)} style={{ color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}>Borrar</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : activeTab === 'personal' ? (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Lista oficial de responsables que aparecerá en los formularios.</p>
            <div style={{ background: 'var(--surface-hover)', padding: '20px', borderRadius: '15px', marginBottom: '30px', border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '12px', color: 'var(--primary)' }}>Añadir Responsable</h3>
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <input placeholder="Nombre completo" className="input-field" style={{ marginBottom: 0 }} value={nuevoResponsable} onChange={e => setNuevoResponsable(e.target.value)} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select className="input-field" style={{ marginBottom: 0, flex: 1 }} value={idProcesoNuevoResp} onChange={e => setIdProcesoNuevoResp(e.target.value)}>
                    <option value="">Seleccionar Proceso...</option>
                    {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <button className="btn-primary" style={{ width: 'auto' }} onClick={handleAddResponsable} disabled={saving}>Añadir</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Personal ({responsables.length})</h3>
              <input 
                placeholder="Buscar..." className="input-field" style={{ width: '200px', marginBottom: 0, padding: '6px' }}
                value={filtroPersonal} onChange={e => setFiltroPersonal(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {responsables.filter(r => r.nombre.toLowerCase().includes(filtroPersonal.toLowerCase())).map(r => (
                <div key={r.id} style={{ display: 'flex', flexDirection: 'column', padding: '12px 20px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {editingId === r.id ? (
                    <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', width: '100%' }}>
                      <input className="input-field" style={{ marginBottom: 0 }} value={editingNombre} onChange={e => setEditingNombre(e.target.value)} />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select className="input-field" style={{ marginBottom: 0, flex: 1 }} value={idProcesoNuevoResp} onChange={e => setIdProcesoNuevoResp(e.target.value)}>
                          <option value="">Seleccionar Proceso...</option>
                          {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                        <button className="btn-primary" style={{ width: 'auto' }} onClick={saveEditResponsable}>✓</button>
                        <button className="btn-secondary" style={{ width: 'auto' }} onClick={() => { setEditingId(null); setIdProcesoNuevoResp(''); }}>×</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{r.nombre}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Proceso: {r.cat_procesos?.nombre || 'Sin asignar'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => { setEditingId(r.id); setEditingNombre(r.nombre); setIdProcesoNuevoResp(r.proceso_id || ''); }} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Editar</button>
                        <button onClick={() => handleDeleteResponsable(r.id)} style={{ color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}>Borrar</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : activeTab === 'procesos' ? (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Gestión de los procesos o áreas de la planta.</p>
            <div style={{ background: 'var(--surface-hover)', padding: '20px', borderRadius: '15px', marginBottom: '30px', border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '12px', color: 'var(--primary)' }}>Añadir Proceso</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input placeholder="Nombre del proceso" className="input-field" style={{ marginBottom: 0, flex: 1 }} value={nuevoProceso} onChange={e => setNuevoProceso(e.target.value)} />
                <button className="btn-primary" style={{ width: 'auto' }} onClick={handleAddProceso} disabled={saving}>Añadir</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {procesos.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {editingId === p.id ? (
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <input className="input-field" style={{ marginBottom: 0, flex: 1 }} value={editingNombre} onChange={e => setEditingNombre(e.target.value)} />
                      <button className="btn-primary" style={{ width: 'auto' }} onClick={saveEditProceso}>✓</button>
                      <button className="btn-secondary" style={{ width: 'auto' }} onClick={() => setEditingId(null)}>×</button>
                    </div>
                  ) : (
                    <>
                      <span>{p.nombre}</span>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => { setEditingId(p.id); setEditingNombre(p.nombre); }} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Editar</button>
                        <button onClick={() => handleDeleteProceso(p.id)} style={{ color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}>Borrar</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : activeTab === 'mantenimiento' ? (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Herramientas de limpieza y mantenimiento de la base de datos.</p>
            <div style={{ background: '#fff5f5', padding: '30px', borderRadius: '15px', border: '1px solid #fed7d7' }}>
              <h3 style={{ color: '#c53030', marginTop: 0, marginBottom: '10px' }}>Borrar Asistencia por Fecha</h3>
              <p style={{ color: '#742a2a', fontSize: '14px', marginBottom: '20px' }}>
                Usa esta herramienta si se guardaron datos incorrectos en un día específico. 
                <strong> Esta acción borrará todos los registros de ese día permanentemente.</strong>
              </p>
              
              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Seleccionar Fecha</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={fechaBorrar} 
                    onChange={e => setFechaBorrar(e.target.value)}
                    style={{ marginBottom: 0 }}
                  />
                </div>
                <button 
                  onClick={handleBorrarPorFecha}
                  className="btn-primary" 
                  disabled={saving || !fechaBorrar}
                  style={{ background: '#e53e3e', border: 'none', padding: '15px 30px', width: 'auto' }}
                >
                  {saving ? <div className="spinner"></div> : 'BORRAR DATOS'}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

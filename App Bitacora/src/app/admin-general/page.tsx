"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ChevronLeft, Users, Shield, Plus, Loader2, 
  Mail, UserPlus, Save, X, Trash2, Edit2, Check, AlertTriangle
} from "lucide-react";

const ADMIN_EMAIL = 'coordinacioncalidad@firplak.com';

interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  uuid: string | null;
}

const ROL_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  supervisor:   { label: 'Supervisor',    color: '#0f766e', bg: '#f0fdfa' },
  calidad:      { label: 'Calidad',       color: '#b45309', bg: '#fffbeb' },
  jefe:         { label: 'Jefe de Área',  color: '#7c3aed', bg: '#f5f3ff' },
  director:     { label: 'Director',      color: '#dc2626', bg: '#fff1f2' },
  desarrollador:{ label: 'Desarrollador', color: '#1d4ed8', bg: '#eff6ff' },
  operario_lider:{ label: 'Operario Líder', color: '#374151', bg: '#f9fafb' },
};

export default function AdminGeneralPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal crear
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ nombre: '', correo: '', rol: 'supervisor' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Modal editar
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', correo: '', rol: '' });
  const [saving, setSaving] = useState(false);

  // Modal eliminar
  const [deletingUser, setDeletingUser] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function checkAuthAndFetch() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('usuarios')
        .select('correo')
        .eq('uuid', session.user.id)
        .single();

      if (userData?.correo !== ADMIN_EMAIL) {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      fetchUsuarios();
    }

    async function fetchUsuarios() {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, rol, uuid')
        .order('nombre');
      if (!error && data) setUsuarios(data);
      setLoading(false);
    }

    checkAuthAndFetch();
  }, [router]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');

    // Verificar que no exista ya ese correo
    const exists = usuarios.find(u => u.correo?.toLowerCase() === newUser.correo.toLowerCase());
    if (exists) {
      setCreateError('Ya existe un usuario con ese correo electrónico.');
      setCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from('usuarios')
      .insert([{ nombre: newUser.nombre, correo: newUser.correo, rol: newUser.rol }])
      .select();

    if (!error && data) {
      setUsuarios(prev => [...prev, data[0]].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setIsCreateOpen(false);
      setNewUser({ nombre: '', correo: '', rol: 'supervisor' });
    } else {
      setCreateError(error?.message || 'Error al crear el usuario.');
    }
    setCreating(false);
  };

  const openEdit = (user: Usuario) => {
    setEditingUser(user);
    setEditForm({ nombre: user.nombre, correo: user.correo || '', rol: user.rol });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    const { error } = await supabase
      .from('usuarios')
      .update({ nombre: editForm.nombre, correo: editForm.correo, rol: editForm.rol })
      .eq('id', editingUser.id);

    if (!error) {
      setUsuarios(prev => prev.map(u => u.id === editingUser.id
        ? { ...u, ...editForm } : u));
      setEditingUser(null);
    } else {
      alert('Error al guardar: ' + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', deletingUser.id);

    if (!error) {
      setUsuarios(prev => prev.filter(u => u.id !== deletingUser.id));
      setDeletingUser(null);
    } else {
      alert('Error al eliminar: ' + error.message);
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} size={48} />
      </div>
    );
  }

  const rolCounts = {
    supervisor: usuarios.filter(u => u.rol === 'supervisor').length,
    calidad: usuarios.filter(u => u.rol === 'calidad').length,
    jefe: usuarios.filter(u => u.rol === 'jefe').length,
    director: usuarios.filter(u => u.rol === 'director' || u.rol === 'desarrollador').length,
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '40px' }}>
        <button
          onClick={() => router.push('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', marginBottom: '12px', padding: 0 }}
        >
          <ChevronLeft size={18} />
          Volver al Inicio
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 700, marginBottom: '8px' }}>
              Administrador de Usuarios
            </h1>
            <p style={{ color: '#666', fontSize: '1.1rem' }}>
              Gestión de responsables y accesos al sistema de bitácoras
            </p>
          </div>
          <button
            className="btn-primary"
            style={{ background: '#0f766e' }}
            onClick={() => { setIsCreateOpen(true); setCreateError(''); }}
          >
            <UserPlus size={18} />
            Agregar Responsable
          </button>
        </div>
      </header>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Total', value: usuarios.length, color: 'var(--primary)', icon: <Users size={28} color="var(--primary)" /> },
          { label: 'Supervisores', value: rolCounts.supervisor, color: '#0f766e', icon: <Shield size={28} color="#0f766e" /> },
          { label: 'Calidad', value: rolCounts.calidad, color: '#b45309', icon: <Shield size={28} color="#b45309" /> },
          { label: 'Directivos', value: rolCounts.director, color: '#dc2626', icon: <Shield size={28} color="#dc2626" /> },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: '20px', borderLeft: `6px solid ${stat.color}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
            {stat.icon}
            <div>
              <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>{stat.label}</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)', margin: 0 }}>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla de usuarios */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', color: '#888', fontWeight: 700 }}>
                <th style={{ padding: '12px 16px' }}>Nombre</th>
                <th style={{ padding: '12px 16px' }}>Correo Electrónico</th>
                <th style={{ padding: '12px 16px' }}>Rol</th>
                <th style={{ padding: '12px 16px' }}>Estado</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((user) => {
                const rolInfo = ROL_LABELS[user.rol] || { label: user.rol, color: '#666', bg: '#f3f4f6' };
                const vinculado = !!user.uuid;
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--accent)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: rolInfo.bg, border: `2px solid ${rolInfo.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: rolInfo.color, fontSize: '0.95rem', flexShrink: 0 }}>
                          {user.nombre?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        {user.nombre}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#555' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} color="#999" />
                        {user.correo || <span style={{ color: '#ccc', fontStyle: 'italic' }}>Sin correo</span>}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, background: rolInfo.bg, color: rolInfo.color, padding: '4px 12px', borderRadius: '50px' }}>
                        {rolInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, background: vinculado ? '#f0fdf4' : '#fef9c3', color: vinculado ? '#15803d' : '#92400e', padding: '4px 10px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                        {vinculado ? <><Check size={12} /> Vinculado</> : <>⏳ Pendiente</>}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openEdit(user)}
                          style={{ background: '#f0f9ff', color: '#0369a1', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = '#e0f2fe'}
                          onMouseOut={e => e.currentTarget.style.background = '#f0f9ff'}
                        >
                          <Edit2 size={14} /> Editar
                        </button>
                        {/* Solo el admin puede eliminar */}
                        {isAdmin && (
                          <button
                            onClick={() => setDeletingUser(user)}
                            style={{ background: '#fff1f2', color: '#be123c', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'background 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.background = '#ffe4e6'}
                            onMouseOut={e => e.currentTarget.style.background = '#fff1f2'}
                          >
                            <Trash2 size={14} /> Eliminar
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

      {/* MODAL: Crear usuario */}
      {isCreateOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card animate-fade-in" style={{ width: '90%', maxWidth: '480px', padding: '36px', position: 'relative' }}>
            <button onClick={() => setIsCreateOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
              <X size={24} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '14px', color: '#0f766e' }}>
                <UserPlus size={24} />
              </div>
              <div>
                <h2 style={{ color: 'var(--accent)', fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Agregar Responsable</h2>
                <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>La persona podrá ingresar con su correo</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} style={{ marginTop: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)', textTransform: 'uppercase' }}>Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez López"
                  value={newUser.nombre}
                  onChange={e => setNewUser({ ...newUser, nombre: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #ddd', fontSize: '1rem', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)', textTransform: 'uppercase' }}>Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="correo@firplak.com"
                  value={newUser.correo}
                  onChange={e => setNewUser({ ...newUser, correo: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #ddd', fontSize: '1rem', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)', textTransform: 'uppercase' }}>Rol</label>
                <select
                  value={newUser.rol}
                  onChange={e => setNewUser({ ...newUser, rol: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #ddd', fontSize: '1rem', fontWeight: 600, outline: 'none', background: 'white' }}
                >
                  <option value="supervisor">Supervisor</option>
                  <option value="calidad">Calidad</option>
                  <option value="jefe">Jefe de Área</option>
                  <option value="director">Director</option>
                  <option value="desarrollador">Desarrollador</option>
                </select>
              </div>

              {createError && (
                <div style={{ background: '#fff1f2', color: '#be123c', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} /> {createError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setIsCreateOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #ddd', background: 'white', fontWeight: 700, cursor: 'pointer', color: '#666' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={creating} className="btn-primary" style={{ flex: 2, background: '#0f766e' }}>
                  {creating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {creating ? 'Guardando...' : 'Agregar Responsable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar usuario */}
      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card animate-fade-in" style={{ width: '90%', maxWidth: '480px', padding: '36px', position: 'relative' }}>
            <button onClick={() => setEditingUser(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
              <X size={24} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '14px', color: '#0369a1' }}>
                <Edit2 size={24} />
              </div>
              <div>
                <h2 style={{ color: 'var(--accent)', fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Editar Usuario</h2>
                <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>{editingUser.nombre}</p>
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)', textTransform: 'uppercase' }}>Nombre Completo</label>
              <input
                type="text"
                value={editForm.nombre}
                onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #ddd', fontSize: '1rem', outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)', textTransform: 'uppercase' }}>Correo Electrónico</label>
              <input
                type="email"
                value={editForm.correo}
                onChange={e => setEditForm({ ...editForm, correo: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #ddd', fontSize: '1rem', outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)', textTransform: 'uppercase' }}>Rol</label>
              <select
                value={editForm.rol}
                onChange={e => setEditForm({ ...editForm, rol: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #ddd', fontSize: '1rem', fontWeight: 600, outline: 'none', background: 'white' }}
              >
                <option value="supervisor">Supervisor</option>
                <option value="calidad">Calidad</option>
                <option value="jefe">Jefe de Área</option>
                <option value="director">Director</option>
                <option value="desarrollador">Desarrollador</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #ddd', background: 'white', fontWeight: 700, cursor: 'pointer', color: '#666' }}>
                Cancelar
              </button>
              <button onClick={handleSaveEdit} disabled={saving} className="btn-primary" style={{ flex: 2 }}>
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar eliminación */}
      {deletingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card animate-fade-in" style={{ width: '90%', maxWidth: '420px', padding: '36px', position: 'relative', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#be123c' }}>
              <AlertTriangle size={32} />
            </div>
            <h2 style={{ color: 'var(--accent)', fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>¿Eliminar usuario?</h2>
            <p style={{ color: '#666', marginBottom: '8px' }}>
              Vas a eliminar a <strong>{deletingUser.nombre}</strong>.
            </p>
            <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: '28px' }}>
              Esta acción no se puede deshacer. Si la persona ya tiene sesión iniciada, perderá acceso al sistema.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setDeletingUser(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #ddd', background: 'white', fontWeight: 700, cursor: 'pointer', color: '#666' }}>
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 2, padding: '12px', borderRadius: '12px', background: '#be123c', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Factory, ChevronRight, Activity, Loader2, 
  X, Save, CheckCircle2 
} from "lucide-react";
import { ProcessIcon } from "@/components/ProcessIcon";

interface Planta {
  id: string;
  nombre: string;
  descripcion: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newPlanta, setNewPlanta] = useState({ nombre: '', descripcion: '' });
  const [creating, setCreating] = useState(false);

  const ADMIN_EMAIL = 'coordinacioncalidad@firplak.com';

  useEffect(() => {
    async function checkAdminAndFetch() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('usuarios')
        .select('rol, correo')
        .eq('uuid', session.user.id)
        .single();

      if (userData?.correo !== ADMIN_EMAIL) {
        router.push('/');
        return;
      }

      fetchPlantas();
    }

    async function fetchPlantas() {
      const { data, error } = await supabase
        .from('plantas')
        .select('*')
        .order('nombre');
      if (!error) setPlantas(data);
      setLoading(false);
    }

    checkAdminAndFetch();
  }, [router]);

  const handleCreatePlanta = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    
    const { data, error } = await supabase
      .from('plantas')
      .insert([newPlanta])
      .select();

    if (!error && data) {
      setPlantas([...plantas, data[0]]);
      setIsModalOpen(false);
      setNewPlanta({ nombre: '', descripcion: '' });
    } else {
      alert("Error al crear planta: " + error.message);
    }
    setCreating(false);
  };

  if (loading) return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
      <Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} size={40} />
    </div>
  );

  return (
    <div className="container animate-fade-in">
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 700, marginBottom: '8px' }}>
            Panel de Administración
          </h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Gestión de plantas y configuración de bitácoras
          </p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          Nueva Planta
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
        {plantas.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#999' }}>
            No hay plantas registradas.
          </div>
        ) : (
          plantas.map((planta) => (
            <div key={planta.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderTop: '6px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ background: 'rgba(118, 149, 152, 0.1)', borderRadius: '12px', color: 'var(--primary)', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px' }}>
                  <ProcessIcon name={planta.nombre} size={28} />
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#e0f2f1', padding: '4px 10px', borderRadius: '50px', color: '#00796b' }}>ACTIVA</span>
              </div>
              
              <div>
                <h3 style={{ color: 'var(--accent)', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 8px' }}>
                  {planta.nombre}
                </h3>
                <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: 1.5, margin: 0, minHeight: '3em' }}>
                  {planta.descripcion || "Sin descripción proporcionada."}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '12px' }}
                  onClick={() => router.push(`/admin/planta/${planta.id}`)}
                >
                  <Activity size={18} />
                  Gestionar Actividades
                </button>
                <button style={{ 
                  background: '#f5f5f5', 
                  border: 'none', 
                  borderRadius: '12px', 
                  width: '48px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#eee'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f5f5f5'}
                >
                  <ChevronRight size={20} color="#666" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Nueva Planta */}
      {isModalOpen && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', 
          alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' 
        }}>
          <div className="card animate-fade-in" style={{ width: '90%', maxWidth: '500px', padding: '32px', position: 'relative' }}>
            <button 
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
            >
              <X size={24} />
            </button>
            
            <h2 style={{ color: 'var(--accent)', fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>Crear Nuevo Proceso</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>Define una nueva planta o área de producción.</p>
            
            <form onSubmit={handleCreatePlanta}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)' }}>Nombre de la Planta</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Inyección Plásticos"
                  value={newPlanta.nombre}
                  onChange={(e) => setNewPlanta({...newPlanta, nombre: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>
              
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)' }}>Descripción</label>
                <textarea 
                  placeholder="Breve descripción del proceso..."
                  value={newPlanta.descripcion}
                  onChange={(e) => setNewPlanta({...newPlanta, descripcion: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', minHeight: '100px', resize: 'vertical' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, background: '#eee', color: '#666' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={creating}
                  style={{ flex: 2 }}
                >
                  {creating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Crear Planta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

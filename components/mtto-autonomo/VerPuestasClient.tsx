"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type PuestaAPunto = {
  id: string | number;
  nombre?: string;
  descripcion?: string;
  proceso?: string;
  [key: string]: any; // fallback attributes
};

type VerPuestasClientProps = {
  planta: string;
  datosDb: PuestaAPunto[];
  actionLabel?: string;
  actionBaseRoute?: string;
  showCreateButton?: boolean;
};

export default function VerPuestasClient({ planta, datosDb, actionLabel = "Ver", actionBaseRoute = "ver", showCreateButton = false }: VerPuestasClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProcess, setExpandedProcess] = useState<string | null>(null); // Cerrados por defecto
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('userEmail');
      if (email === 'jakeline.chaverra@firplak.com') {
        setIsAdmin(true);
      }
    }
  }, []);

  const handleDelete = async (id: string | number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm('¿Está seguro de que desea eliminar esta Puesta a Punto? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      // 1. Eliminar detalles
      const { error: err1 } = await supabase
        .from('puestas_a_punto_detalle')
        .delete()
        .eq('id_puesta_a_punto', id);

      if (err1) throw err1;

      // 2. Eliminar encabezado
      const { error: err2 } = await supabase
        .from('puestas_a_punto_encabezado')
        .delete()
        .eq('id_puesta_a_punto', id);

      if (err2) throw err2;

      alert('✅ Registro eliminado correctamente');
      router.refresh(); // Recargar datos de la página
    } catch (err: any) {
      console.error(err);
      alert('❌ Error al eliminar: ' + err.message);
    }
  };

  // Agrupar los datos reales por proceso
  // Si la BD viene vacía, usamos un mock de "Pulido" según pidió el usuario
  const listToGroup = datosDb && datosDb.length > 0 
    ? datosDb 
    : [
        { id: '1', nombre: 'Puesta a punto Initial', descripcion: 'Configuración estándar', proceso: 'Pulido' }
      ];

  const grouped = listToGroup.reduce((acc, current) => {
    let processName = (current.proceso || current.Proceso || 'Sin Proceso').trim().toUpperCase();
    if (!acc[processName]) acc[processName] = [];
    acc[processName].push(current);
    return acc;
  }, {} as Record<string, PuestaAPunto[]>);

  // Filtrado de búsquedas
  const filteredProcesses = Object.keys(grouped).filter(processName => {
    // Si el nombre del proceso matchea:
    if (processName.toLowerCase().includes(searchTerm.toLowerCase())) return true;
    
    // Si algun item del proceso matchea
    const items = grouped[processName] || [];
    return items.some(i => JSON.stringify(i).toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const clean = (val: string | null | undefined) => (!val || val.toUpperCase() === 'PENDIENTE' || val.toUpperCase() === 'N/A') ? '' : val;

  return (
    <div style={{ width: '92%', maxWidth: '1450px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Panel Superior Inspirado en Imagen 2 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1rem' }}>
        
        {/* Lado Izquierdo: Icono y Títulos */}
        <div style={{ display: 'flex', alignItems: 'start', gap: '1.2rem' }}>
          <div style={{ backgroundColor: '#F1F5F9', padding: '12px', borderRadius: '12px', color: '#1B2B41' }}>
             <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40V216a24,24,0,0,1-24,24H64a24,24,0,0,1-24-24V40A24,24,0,0,1,64,16H192A24,24,0,0,1,216,40ZM200,40a8,8,0,0,0-8-8H64a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H192a8,8,0,0,0,8-8ZM176,160a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,160Zm0-32a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,128Zm0-32a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,96Z"></path></svg>
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1B2B41', margin: 0, lineHeight: 1.2 }}>Listado de Registros</h1>
            <p style={{ color: '#64748B', fontSize: '0.95rem', margin: '4px 0 0 0' }}>Gestiona las puestas a punto para esta planta</p>
          </div>
        </div>

        {/* Lado Derecho: Buscador y Botón Crear */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             {/* Buscador Estilo Imagen 2 */}
            <div style={{ position: 'relative', width: '320px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#94A3B8" viewBox="0 0 256 256" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path>
              </svg>
              <input 
                type="text" 
                placeholder="Buscar por labor o proceso..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '11px 16px 11px 42px', 
                  backgroundColor: 'white', 
                  border: '1px solid #E2E8F0', 
                  borderRadius: '10px', 
                  fontSize: '0.9rem', 
                  color: '#1B2B41',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  outline: 'none'
                }}
              />
            </div>

            {showCreateButton && (
              <Link 
                href={`/puestas-a-punto/${encodeURIComponent(planta)}/crear`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#1A445B', color: 'white', textDecoration: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(26,68,91,0.2)', transition: '0.2s' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H136v88a8,8,0,0,1-16,0V136H32a8,8,0,0,1,0-16h88V32a8,8,0,0,1,16,0v88h88A8,8,0,0,1,224,128Z"></path></svg>
                Crear
              </Link>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '0.5rem 0 1.5rem 0' }}></div>

      {/* Lista de Procesos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredProcesses.length === 0 ? (
           <p style={{ textAlign: 'center', color: '#64748B' }}>No se encontraron resultados para "{searchTerm}"</p>
        ) : (
          filteredProcesses.map(process => {
            const items = grouped[process] || [];
            return (
              <div key={process} style={{ marginBottom: '0.5rem' }}>
                
                <button 
                  onClick={() => setExpandedProcess(expandedProcess === process ? null : process)}
                  style={{ 
                    width: '100%', 
                    padding: '0.8rem 1.5rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    backgroundColor: 'white', 
                    cursor: 'pointer', 
                    border: '2px solid #1B2B41', 
                    borderRadius: '12px',
                    borderLeft: '8px solid #1B2B41',
                    textAlign: 'left',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ fontSize: '1.05rem', color: '#1B2B41', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>{process}</h3>
                    <span style={{ fontSize: '0.7rem', backgroundColor: '#F1F5F9', color: '#94A3B8', padding: '3px 10px', borderRadius: '6px', fontWeight: 700, textTransform: 'uppercase' }}>
                      {items.length} {items.length === 1 ? 'Labor' : 'Labores'}
                    </span>
                  </div>
                  <div style={{ color: '#CBD5E1', transition: 'transform 0.3s', transform: expandedProcess === process ? 'rotate(180deg)' : 'none' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"></path></svg>
                  </div>
                </button>

                {expandedProcess === process && (
                  <div style={{ padding: '1rem 1rem 0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {items.map((item, idx) => {
                      const name = item.nombre_puesta_a_punto || item.nombre || item.Nombre || `Registro #${item.consecutivo || idx}`;
                      const state = clean(item.estado_puesta_a_punto);
                      const code = item.consecutivo || item.codigo || item.id;
                      
                      return (
                        <Link 
                          key={idx} 
                          href={`/puestas-a-punto/${encodeURIComponent(planta)}/${actionBaseRoute}/${item.id_puesta_a_punto || item.id}`}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            backgroundColor: 'white', 
                            padding: '1.5rem 2rem', 
                            borderRadius: '16px', 
                            border: '1px solid #F1F5F9',
                            borderLeft: '4px solid #F1F5F9',
                            textDecoration: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                            transition: '0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = '#CBD5E1';
                            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                          }}
                          onMouseOut={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = '#F1F5F9';
                            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <h4 style={{ color: '#1B2B41', fontSize: '1.25rem', margin: 0, fontWeight: 800 }}>{name}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                              <span style={{ color: '#94A3B8', fontSize: '0.9rem', fontWeight: 500 }}>Código: {code}</span>
                              {state && (
                                <span style={{ 
                                  fontSize: '0.7rem', 
                                  backgroundColor: '#F1F5F9', 
                                  color: '#1B2B41', 
                                  padding: '2px 8px', 
                                  borderRadius: '6px', 
                                  fontWeight: 800,
                                  border: '1px solid #E2E8F0',
                                  textTransform: 'uppercase'
                                }}>
                                  {state}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                             {item.versiones && item.versiones > 0 && (
                               <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F8FAFC', padding: '6px 12px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#94A3B8" viewBox="0 0 256 256"><path d="M128,32a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,32Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,208ZM173.66,90.34a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32,0l-16-16a8,8,0,0,1,11.32-11.32L128,124.69l34.34-34.35A8,8,0,0,1,173.66,90.34Z"></path></svg>
                                 <span style={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
                                   {item.versiones} {item.versiones === 1 ? 'Versión Anterior' : 'Versiones Anteriores'}
                                 </span>
                               </div>
                             )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                {actionBaseRoute === 'modificar' && isAdmin && (
                                  <button 
                                    onClick={(e) => handleDelete(item.id_puesta_a_punto || item.id, e)}
                                    title="Eliminar registro"
                                    style={{ 
                                      backgroundColor: '#FDF0F0', 
                                      color: '#D13438', 
                                      border: '1px solid #FAD7D7', 
                                      borderRadius: '10px', 
                                      padding: '8px', 
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: '0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F5D7D7'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FDF0F0'}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>
                                  </button>
                                )}
                                <div style={{ color: '#CBD5E1', padding: '8px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path></svg>
                                </div>
                             </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

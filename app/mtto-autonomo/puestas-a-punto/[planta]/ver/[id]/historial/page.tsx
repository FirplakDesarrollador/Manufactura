import { supabase } from '../../../../../../lib/supabase';
import React from 'react';
import Link from 'next/link';

export const revalidate = 0;

export default async function HistorialVersionesPage({ params }: { params: Promise<{ planta: string, id: string }> }) {
  const resolvedParams = await params;
  const { planta, id } = resolvedParams;
  const decodedPlanta = decodeURIComponent(planta);

  // 1. Obtener la puesta actual para saber el proceso
  const { data: current } = await supabase
    .from('puestas_a_punto_encabezado')
    .select('proceso, nombre_puesta_a_punto')
    .eq('id_puesta_a_punto', id)
    .single();

  if (!current) return <div>No encontrado</div>;

  // 2. Obtener todas las versiones de este proceso en esta planta
  const { data: versiones } = await supabase
    .from('puestas_a_punto_encabezado')
    .select('*')
    .eq('proceso', current.proceso)
    .eq('planta', decodedPlanta)
    .order('version_formato', { ascending: false });

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', color: '#1A445B', margin: 0 }}>Versiones</h2>
          <p style={{ color: '#586B77', margin: '4px 0 0 0' }}>{current.nombre_puesta_a_punto || current.proceso}</p>
        </div>
        <Link 
          href={`/puestas-a-punto/${planta}/ver/${id}`}
          style={{ padding: '0.6rem 1.2rem', backgroundColor: '#F8FAFB', color: '#586B77', border: '1px solid #D1D9E0', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}
        >
          ← Volver al Detalle
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {(versiones || []).map((v) => (
          <div key={v.id_puesta_a_punto} style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            border: v.id_puesta_a_punto.toString() === id ? '2px solid #105B3A' : '1px solid #E2E8EA',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ backgroundColor: '#1A445B', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                  Versión {v.version_formato || '1'}
                </span>
                {v.id_puesta_a_punto.toString() === id && (
                  <span style={{ color: '#105B3A', fontSize: '0.75rem', fontWeight: 800 }}>● Versión Actual</span>
                )}
              </div>
              <p style={{ fontSize: '0.9rem', color: '#586B77', margin: 0 }}>
                Actualizado el {v.creado_en ? v.creado_en.split('T')[0] : 'Sin fecha'}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#9AA6AE', margin: '2px 0 0 0' }}>
                Responsable: {v.responsable || '—'}
              </p>
            </div>
            <Link 
              href={`/puestas-a-punto/${planta}/ver/${v.id_puesta_a_punto}`}
              style={{ padding: '0.6rem 1.5rem', backgroundColor: '#1A445B', color: 'white', textDecoration: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}
            >
              Cargar esta versión
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

import { supabase } from '../../../../../lib/supabase';
import React from 'react';
import ModificarPuestaClient from './ModificarPuestaClient';

export const revalidate = 0;

export default async function ModificarDetallePage({ params }: { params: Promise<{ planta: string, id: string }> }) {
  const resolvedParams = await params;
  const { planta, id } = resolvedParams;
  const decodedPlanta = decodeURIComponent(planta);

  const { data: enc } = await supabase.from('puestas_a_punto_encabezado').select('*').eq('id_puesta_a_punto', id).single();
  const { data: det } = await supabase.from('puestas_a_punto_detalle').select('*').eq('id_puesta_a_punto', id);

  if (!enc) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <h2>No se encontró el registro</h2>
        <p>No se encontró la puesta a punto con ID {id}.</p>
      </div>
    );
  }

  return (
    <ModificarPuestaClient 
      planta={decodedPlanta} 
      id={id} 
      encabezadoInicial={enc} 
      detallesIniciales={det || []} 
    />
  );
}

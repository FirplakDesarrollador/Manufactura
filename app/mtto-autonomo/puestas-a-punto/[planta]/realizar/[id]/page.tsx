import { supabase } from '@/lib/supabase';
import DailyChecklistClient from '@/components/mtto-autonomo/DailyChecklistClient';
import BackButton from '@/components/mtto-autonomo/BackButton';

export const revalidate = 0;

export default async function RealizarDetallePage({ params }: { params: Promise<{ planta: string, id: string }> }) {
  const resolvedParams = await params;
  const { planta, id } = resolvedParams;

  const { data: enc } = await supabase.from('puestas_a_punto_encabezado').select('*').eq('id_puesta_a_punto', id).single();
  const { data: det } = await supabase.from('puestas_a_punto_detalle').select('*').eq('id_puesta_a_punto', id);

  if (!enc) return <div style={{ padding: '2rem' }}>No se encontró el encabezado.</div>;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '10px' }}>
         <BackButton />
      </div>
      <DailyChecklistClient 
        planta={planta} 
        id={id} 
        initialEnc={enc} 
        initialDet={det || []} 
      />
    </div>
  );
}

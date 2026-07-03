import VerPuestasClient from '@/components/mtto-autonomo/VerPuestasClient';
import { supabase } from '../../../../lib/supabase';
import BackButton from '@/components/mtto-autonomo/BackButton';

export const revalidate = 0;

export default async function VerPuestaAPuntoPage({ params }: { params: Promise<{ planta: string }> }) {
  const resolvedParams = await params;
  const plantaStr = decodeURIComponent(resolvedParams.planta);

  // Trying fallback table names intuitively according to the user's description
  const res1 = await supabase.from('Puestas a punto').select('*');
  const res2 = await supabase.from('puestas_a_punto').select('*');
  const res3 = await supabase.from('puestas_a_punto_encabezado').select('*');

  const data1 = res1.data && res1.data.length > 0 ? res1.data : null;
  const data2 = res2.data && res2.data.length > 0 ? res2.data : null;
  const data3 = res3.data && res3.data.length > 0 ? res3.data : null;

  const finalData = data1 || data2 || data3 || [];

  return (
    <div style={{ width: '100%', maxWidth: '1300px', margin: '0 auto' }}>
      <VerPuestasClient planta={plantaStr} datosDb={finalData} showCreateButton={true} />
    </div>
  );
}

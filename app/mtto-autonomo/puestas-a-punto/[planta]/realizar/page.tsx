import VerPuestasClient from '@/components/mtto-autonomo/VerPuestasClient';
import { supabase } from '../../../../lib/supabase';

export const revalidate = 0;

export default async function RealizarPuestaAPuntoPage({ params }: { params: Promise<{ planta: string }> }) {
  const resolvedParams = await params;
  const plantaStr = decodeURIComponent(resolvedParams.planta);

  const res1 = await supabase.from('Puestas a punto').select('*');
  const res2 = await supabase.from('puestas_a_punto').select('*');
  const res3 = await supabase.from('puestas_a_punto_encabezado').select('*');
  const data1 = res1.data && res1.data.length > 0 ? res1.data : null;
  const data2 = res2.data && res2.data.length > 0 ? res2.data : null;
  const data3 = res3.data && res3.data.length > 0 ? res3.data : null;
  const finalData = data1 || data2 || data3 || [];

  return (
    <div style={{ width: '100%' }}>
      <h2 className="greeting-subtitle" style={{ fontSize: '1.6rem', marginBottom: '2.5rem', textAlign: 'center' }}>
        Realizar Procedimiento ({plantaStr})
      </h2>
      <VerPuestasClient planta={plantaStr} datosDb={finalData} actionLabel="Realizar" actionBaseRoute="realizar" />
    </div>
  );
}

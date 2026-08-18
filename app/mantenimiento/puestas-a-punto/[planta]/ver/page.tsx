import VerPuestasClient from '@/components/mtto-autonomo/VerPuestasClient';
import { supabase } from '@/lib/supabase';
import BackButton from '@/components/mtto-autonomo/BackButton';

export const revalidate = 0;

export default async function VerPuestaAPuntoPage({ params }: { params: Promise<{ planta: string }> }) {
  const resolvedParams = await params;
  const plantaStr = decodeURIComponent(resolvedParams.planta);

  // Consultar encabezados directamente de puestas_a_punto_encabezado
  const { data: resData } = await supabase.from('puestas_a_punto_encabezado').select('*');
  const finalData = resData || [];

  return (
    <div style={{ width: '100%', maxWidth: '1300px', margin: '0 auto' }}>
      <VerPuestasClient planta={plantaStr} datosDb={finalData} showCreateButton={true} />
    </div>
  );
}

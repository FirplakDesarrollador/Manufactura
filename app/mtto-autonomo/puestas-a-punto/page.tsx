import Link from 'next/link';
import BackButton from '@/components/mtto-autonomo/BackButton';
import { supabase } from '@/lib/mtto-autonomo/supabase';
import Image from 'next/image';

export const revalidate = 0; // Prevenir caché estática

export default async function PuestasAPuntoPage() {
  const { data: pData, error } = await supabase
    .from('plantas')
    .select('planta')
    .order('planta');

  let arrayPlantas: string[] = [];
  if (pData && pData.length > 0) {
    arrayPlantas = pData.map((item: any) => item.planta).filter(Boolean);
  } else {
    // Semillas provistas en caso de que la tabla esté vacía
    arrayPlantas = ["Marmol Sintetico", "Bañeras", "Ensamble", "Extrusión"]; 
  }

  return (
    <div className="home-container" style={{ paddingTop: '2.5rem' }}>
      <div style={{ width: '92%', maxWidth: '1450px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3.5rem', padding: '0 1rem' }}>
        <BackButton />
      </div>
      <div className="greeting-section" style={{ marginBottom: '3rem' }}>
        <h1 className="greeting-title" style={{ fontSize: '2.2rem' }}>Puestas a Punto</h1>
      </div>
      
      <div style={{ width: '92%', maxWidth: '1450px', margin: '0 auto' }}>
        <div className="modules-grid-centered">
            {arrayPlantas.map((planta, index) => (
              <Link href={`/mtto-autonomo/puestas-a-punto/${planta}`} key={index} className="module-card-icon" style={{ animationDelay: `${index * 0.1}s`, padding: '2rem 1.5rem', gap: '1rem' }}>
                <div className="icon-container" style={{ width: '60px', height: '60px', borderRadius: '14px' }}>
                   <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 256 256">
                     <path d="M226.71,137.45h0l-31.54,9.66a72,72,0,0,1,0,17.78l31.54,9.66a8,8,0,0,1,5.32,9.86l-13.66,42a8,8,0,0,1-9.42,5.55l-32.55-6A72.16,72.16,0,0,1,161,236.44l-6,32.55a8,8,0,0,1-5.55,6.42l-42-13.66a8,8,0,0,1-5-9.86v0l9.66-31.54a72,72,0,0,1-17.78,0L84.69,251.89a8,8,0,0,1-9.86,5.32l-42-13.66A8,8,0,0,1,27.3,234.13l6-32.55A72.16,72.16,0,0,1,18,186.1l-32.55,6a8,8,0,0,1-6.42-5.55l-13.66-42a8,8,0,0,1,5-9.86v0l31.54-9.66a72,72,0,0,1,0-17.78l-31.54-9.66a8,8,0,0,1-5.32-9.86l13.66-42A8,8,0,0,1-6.72,40L25.83,46a72.16,72.16,0,0,1,15.42-15.42l-6-32.55A8,8,0,0,1,40.8-8.38l42,13.66a8,8,0,0,1,5,9.86v0l-9.66,31.54a72,72,0,0,1,17.78,0l9.66-31.54a8,8,0,0,1,9.86-5.32l42,13.66a8,8,0,0,1,6.42,9.42l-6,32.55A72.16,72.16,0,0,1,173.28,81.3l32.55-6a8,8,0,0,1,6.42,5.55l13.66,42A8,8,0,0,1,226.71,137.45ZM128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152Z"></path>
                   </svg>
                </div>
                <h3 className="card-title-centered" style={{ fontSize: '1.2rem', marginBottom: 0 }}>{planta}</h3>
              </Link>
           ))}
        </div>
      </div>

      {error && (
        <p style={{ textAlign: 'center', marginTop: '3rem', color: '#ff4d4f', fontSize: '0.8rem', opacity: 0.7 }}>
          * {error.message}
        </p>
      )}
    </div>
  );
}


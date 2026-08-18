'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { supabaseTH } from '@/lib/mtto-autonomo/supabaseTH';
import Header from '@/components/opt-sistemica/Header';
import { useRouter } from 'next/navigation';

interface PuestaCompleta {
  id: string | number;
  planta: string;
  nombre: string;
  equipos: string[];
}

export default function PuestasAPuntoPage() {
  const router = useRouter();
  const [arrayPlantas, setArrayPlantas] = useState<string[]>([]);
  const [puestas, setPuestas] = useState<PuestaCompleta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const initPage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUserEmail(user.email || '');

        // 1. Consultar plantas de la BD
        const { data: pData } = await supabaseTH
          .from('plantas')
          .select('planta')
          .order('planta') as any;

        const dbPlantas = pData ? pData.map((item: any) => item.planta).filter(Boolean) : [];
        setArrayPlantas(dbPlantas);

        // 2. Consultar encabezados directamente de puestas_a_punto_encabezado
        const { data: resData } = await supabase.from('puestas_a_punto_encabezado').select('*');
        const puestasData = resData || [];

        // 3. Consultar detalles para obtener los equipos de cada puesta a punto
        const { data: detallesData } = await supabase
          .from('puestas_a_punto_detalle')
          .select('id_puesta_a_punto, equipo_herramienta');

        const flats = detallesData || [];

        // 4. Mapear datos completos
        const puestasCompletas: PuestaCompleta[] = puestasData.map((p: any) => {
          const id = p.id_puesta_a_punto || p.id;
          const equipos = flats
            .filter((d: any) => d.id_puesta_a_punto === id)
            .map((d: any) => d.equipo_herramienta)
            .filter(Boolean);

          return {
            id,
            planta: p.planta || '',
            nombre: p.nombre_puesta_a_punto || p.nombre || p.proceso || 'Puesta a punto',
            equipos
          };
        });

        setPuestas(puestasCompletas);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, [router]);

  // Lista filtrada y única de plantas
  const filteredPlantas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    // Si la base de datos de puestas a punto está vacía (ej. base local limpia),
    // mostramos únicamente las plantas del fallback (o las de la BD de plantas) que coincidan con la búsqueda.
    if (puestas.length === 0) {
      const currentList = arrayPlantas.length > 0 ? arrayPlantas : ["Marmol Sintetico", "Bañeras", "Ensamble", "Extrusión"];
      if (!term) return currentList;
      return currentList.filter(pl => pl.toLowerCase().includes(term));
    }

    // Si hay información en la base de datos, filtramos por registros
    const filteredRecords = puestas.filter((p: PuestaCompleta) => {
      const matchPlanta = p.planta?.toLowerCase().includes(term);
      const matchNombre = p.nombre?.toLowerCase().includes(term);
      const matchMaquina = p.equipos?.some((eq: string) => eq.toLowerCase().includes(term));
      return !term || matchPlanta || matchNombre || matchMaquina;
    });

    // Extraemos las plantas únicas que tienen registros que coinciden con los términos de búsqueda
    const plantasConDatos = Array.from(new Set(filteredRecords.map((p: PuestaCompleta) => p.planta).filter(Boolean)));

    // Si el usuario buscaba algo pero no hay coincidencia
    if (term && plantasConDatos.length === 0) {
      return [];
    }

    // Si no está buscando nada, mostramos únicamente las plantas con datos
    if (!term) {
      return plantasConDatos.length > 0 ? plantasConDatos : arrayPlantas;
    }

    return plantasConDatos;
  }, [searchTerm, arrayPlantas, puestas]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324354]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
      <Header
        title="Mantenimiento"
        subtitle="Puesta a Punto / Pre-Operacional"
        userEmail={userEmail}
        showLogout={true}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
      />

      <main className="flex-1 flex justify-center p-6 md:p-10 w-full">
        <div className="w-full max-w-[1200px] space-y-8">
          
          {/* Header Title & Dynamic Search Bar */}
          <div className="flex flex-col items-center text-center space-y-4" style={{ marginBottom: '1.5rem' }}>
            <h1 className="text-3xl md:text-4xl font-light text-[#324354] uppercase tracking-wider font-sans">
              Puesta a Punto / Pre-Operacional
            </h1>
            <div className="w-20 h-1 bg-[#324354] rounded-full"></div>
            
            {/* Search Input bar */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '480px', marginTop: '1.5rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#94A3B8" viewBox="0 0 256 256" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}>
                <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path>
              </svg>
              <input 
                type="text" 
                placeholder="Buscar por planta, máquina o nombre..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 18px 12px 46px', 
                  backgroundColor: 'white', 
                  border: '1px solid #e2ded5', 
                  borderRadius: '12px', 
                  fontSize: '0.95rem', 
                  color: '#324354',
                  boxShadow: '0 4px 20px rgba(50,67,84,0.02)',
                  outline: 'none',
                  fontFamily: 'Montserrat, sans-serif'
                }}
              />
            </div>
          </div>
          
          {/* Centered Grid Plants */}
          <div className="modules-grid-centered">
            {filteredPlantas.length === 0 ? (
              <div className="w-full text-center py-10" style={{ gridColumn: '1 / -1' }}>
                <p className="text-slate-500 font-medium">No se encontraron plantas con información coincidente.</p>
              </div>
            ) : (
              filteredPlantas.map((planta, index) => (
                <Link 
                  href={`/mantenimiento/puestas-a-punto/${planta}`} 
                  key={index} 
                  className="module-card-icon" 
                  style={{ animationDelay: `${index * 0.1}s`, padding: '2rem 1.5rem', gap: '1rem', textDecoration: 'none' }}
                >
                  <div className="icon-container" style={{ width: '60px', height: '60px', borderRadius: '14px' }}>
                     <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 256 256">
                       <path d="M226.71,137.45h0l-31.54,9.66a72,72,0,0,1,0,17.78l31.54,9.66a8,8,0,0,1,5.32,9.86l-13.66,42a8,8,0,0,1-9.42,5.55l-32.55-6A72.16,72.16,0,0,1,161,236.44l-6,32.55a8,8,0,0,1-5.55,6.42l-42-13.66a8,8,0,0,1-5-9.86v0l9.66-31.54a72,72,0,0,1-17.78,0L84.69,251.89a8,8,0,0,1-9.86,5.32l-42-13.66A8,8,0,0,1,27.3,234.13l6-32.55A72.16,72.16,0,0,1,18,186.1l-32.55,6a8,8,0,0,1-6.42-5.55l-13.66-42a8,8,0,0,1,5-9.86v0l31.54-9.66a72,72,0,0,1,0-17.78l-31.54-9.66a8,8,0,0,1-5.32-9.86l13.66-42A8,8,0,0,1-6.72,40L25.83,46a72.16,72.16,0,0,1,15.42-15.42l-6-32.55A8,8,0,0,1,40.8-8.38l42,13.66a8,8,0,0,1,5,9.86v0l-9.66,31.54a72,72,0,0,1,17.78,0l9.66-31.54a8,8,0,0,1,9.86-5.32l42,13.66a8,8,0,0,1,6.42,9.42l-6,32.55A72.16,72.16,0,0,1,173.28,81.3l32.55-6a8,8,0,0,1,6.42,5.55l13.66,42A8,8,0,0,1,226.71,137.45ZM128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152Z"></path>
                     </svg>
                  </div>
                  <h3 className="card-title-centered" style={{ fontSize: '1.2rem', marginBottom: 0 }}>{planta}</h3>
                </Link>
              ))
            )}
          </div>

          {errorMsg && (
            <p style={{ textAlign: 'center', marginTop: '3rem', color: '#ff4d4f', fontSize: '0.8rem', opacity: 0.7 }}>
              * {errorMsg}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

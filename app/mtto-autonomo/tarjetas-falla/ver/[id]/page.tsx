import { supabase } from '../../../../lib/supabase';
import BackButton from '@/components/mtto-autonomo/BackButton';
import Link from 'next/link';

export const revalidate = 0;

export default async function TarjetaDetailPage({ params }: { params: { id: string } }) {
  const { data: tarjeta, error } = await supabase
    .from('tarjetas_falla_anomalia')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !tarjeta) {
    return (
      <div className="home-container" style={{ paddingTop: '2.5rem' }}>
        <div style={{ width: '92%', maxWidth: '1450px', margin: '0 auto' }}>
          <BackButton />
          <p style={{ marginTop: '2rem', color: '#ef4444' }}>Error: {error?.message || 'Tarjeta no encontrada'}</p>
        </div>
      </div>
    );
  }

  const getStatusBadgeStyle = (estado: string) => {
    switch (estado) {
      case 'abierta': return { bg: '#FEF2F2', text: '#DC2626', border: '#FEE2E2' };
      case 'en_proceso': return { bg: '#FFFBEB', text: '#D97706', border: '#FEF3C7' };
      case 'cerrada': return { bg: '#F0FDF4', text: '#16A34A', border: '#DCFCE7' };
      default: return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
    }
  };

  const getTipoAvisoStyle = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'seguridad': 
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FEE2E2' };
      case 'mantenimiento_autonomo': 
        return { bg: '#EFF6FF', text: '#2563EB', border: '#DBEAFE' };
      case 'mantenimiento_planeado': 
        return { bg: '#FEFCE8', text: '#CA8A04', border: '#FEF9C3' };
      default: 
        return { bg: '#FFFFFF', text: '#64748B', border: '#E2E8F0' };
    }
  };

  const statusStyle = getStatusBadgeStyle(tarjeta.estado);

  return (
    <div className="home-container" style={{ paddingTop: '2.5rem' }}>
      <div style={{ width: '92%', maxWidth: '1450px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3.5rem', padding: '0 1rem' }}>
        <BackButton />
        <Link 
          href={`/tarjetas-falla/modificar/${tarjeta.id}`}
          style={{ padding: '10px 20px', backgroundColor: '#1B2B41', color: 'white', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem', fontFamily: "'Inter', sans-serif" }}
        >
          Editar Tarjeta
        </Link>
      </div>

      <div style={{ width: '92%', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        {/* Header Information */}
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '24px', boxShadow: '0 4px 30px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
               <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '16px', color: '#1B2B41', border: '1px solid #F1F5F9' }}>
                 <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 256 256">
                   <path d="M227.31,73.37,182.63,28.69a16,16,0,0,0-22.63,0L135.37,53.31a16,16,0,0,0,0,22.63L148,88.58,110.6,126l-11.31-11.31a16,16,0,0,0-22.63,0L32,159.37a16,16,0,0,0,0,22.63l44.68,44.68a16,16,0,0,0,22.63,0l44.69-44.69a16,16,0,0,0,0-22.63l-11.31-11.31L170,110.6l12.63,12.63a16,16,0,0,0,22.63,0l24.68-24.68A16,16,0,0,0,227.31,73.37ZM132,170.69,87.31,215.37,42.63,170.69,87.31,126Zm84-84-24.68,24.68L170,89.31l24.69-24.68,21.31,21.31Z"></path>
                 </svg>
               </div>
               <div>
                 <span style={{ fontSize: '0.9rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Inter', sans-serif" }}>
                   TARJETA {tarjeta.codigo_tarjeta || 'S/N'}
                 </span>
                 <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1B2B41', margin: '0.2rem 0', fontFamily: "'Inter', sans-serif" }}>{tarjeta.maquina || 'Sin Máquina'}</h1>
               </div>
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
               <img src="/logo_2.png" alt="Firplak Logo" style={{ height: '35px', objectFit: 'contain', marginBottom: '0.5rem' }} />
               <div style={{ 
                  display: 'inline-block',
                  fontSize: '0.85rem', 
                  backgroundColor: statusStyle.bg, 
                  color: statusStyle.text, 
                  padding: '8px 16px', 
                  borderRadius: '12px', 
                  fontWeight: 800,
                  border: `1px solid ${statusStyle.border}`,
                  textTransform: 'uppercase',
                  fontFamily: "'Inter', sans-serif"
                }}>
                  {tarjeta.estado.replace('_', ' ')}
                </div>
                <div style={{ color: '#64748B', fontSize: '0.9rem', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                  Prioridad {tarjeta.prioridad}
                </div>
             </div>
           </div>

           <div style={{ height: '1px', backgroundColor: '#F1F5F9', marginBottom: '2rem' }}></div>

           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
             <div>
                <label style={{ display: 'block', fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, marginBottom: '0.5rem', fontFamily: "'Inter', sans-serif" }}>PLANTA</label>
                <div style={{ fontSize: '1rem', color: '#1B2B41', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>{tarjeta.planta_proceso}</div>
             </div>
             <div>
                <label style={{ display: 'block', fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, marginBottom: '0.5rem', fontFamily: "'Inter', sans-serif" }}>RESPONSABLE</label>
                <div style={{ fontSize: '1rem', color: '#1B2B41', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>{tarjeta.responsable || 'No asignado'}</div>
             </div>
             <div>
                 <label style={{ display: 'block', fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, marginBottom: '0.5rem', fontFamily: "'Inter', sans-serif" }}>TIPO DE AVISO</label>
                 <div style={{ 
                   display: 'inline-block',
                   fontSize: '0.9rem', 
                   backgroundColor: getTipoAvisoStyle(tarjeta.tipo_aviso).bg, 
                   color: getTipoAvisoStyle(tarjeta.tipo_aviso).text, 
                   padding: '6px 12px', 
                   borderRadius: '10px', 
                   fontWeight: 700,
                   border: `1px solid ${getTipoAvisoStyle(tarjeta.tipo_aviso).border}`,
                   textTransform: 'uppercase',
                   fontFamily: "'Inter', sans-serif"
                 }}>
                   {tarjeta.tipo_aviso.replace('_', ' ')}
                 </div>
              </div>
             <div>
                <label style={{ display: 'block', fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, marginBottom: '0.5rem', fontFamily: "'Inter', sans-serif" }}>NUMERO AVISO</label>
                <div style={{ fontSize: '1rem', color: '#1B2B41', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>{tarjeta.numero_aviso || 'N/A'}</div>
             </div>
           </div>
        </div>

        {/* Description Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
          
          <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #F1F5F9' }}>
             <h3 style={{ fontSize: '1.2rem', color: '#1B2B41', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: "'Inter', sans-serif" }}>
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#1A445B" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V80a8,8,0,0,1,16,0v32h8A8,8,0,0,1,144,128Zm0,40a12,12,0,1,1-12-12A12,12,0,0,1,144,168Z"></path></svg>
               Descripción del Problema
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                   <label style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, display: 'block', marginBottom: '0.4rem', fontFamily: "'Inter', sans-serif" }}>¿QUÉ FALLA?</label>
                   <p style={{ margin: 0, color: '#475569', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>{tarjeta.descripcion_que}</p>
                </div>
                <div>
                   <label style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, display: 'block', marginBottom: '0.4rem', fontFamily: "'Inter', sans-serif" }}>¿CÓMO SE DETECTA?</label>
                   <p style={{ margin: 0, color: '#475569', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>{tarjeta.descripcion_como || 'No especificado'}</p>
                </div>
                <div>
                   <label style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, display: 'block', marginBottom: '0.4rem', fontFamily: "'Inter', sans-serif" }}>¿DÓNDE SE DETECTA?</label>
                   <p style={{ margin: 0, color: '#475569', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>{tarjeta.descripcion_donde || 'No especificado'}</p>
                </div>

                {tarjeta.fotos && tarjeta.fotos.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <label style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '1rem', fontFamily: "'Inter', sans-serif" }}>EVIDENCIA FOTOGRÁFICA</label>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {tarjeta.fotos.map((foto: string, i: number) => (
                        <a key={i} href={foto} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={foto} 
                            alt={`Evidencia ${i + 1}`} 
                            style={{ width: '180px', height: '140px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #E2E8F0', cursor: 'zoom-in', transition: 'transform 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', padding: '2.5rem', borderRadius: '24px', border: '1px solid #F1F5F9' }}>
             <h3 style={{ fontSize: '1.2rem', color: '#1B2B41', fontWeight: 800, marginBottom: '1.5rem', fontFamily: "'Inter', sans-serif" }}>Seguimiento</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                   <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '12px', flex: 1, border: '1px solid #E2E8F0' }}>
                      <label style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, display: 'block', marginBottom: '4px', fontFamily: "'Inter', sans-serif" }}>FECHA APERTURA</label>
                      <div style={{ fontWeight: 700, color: '#1B2B41', fontFamily: "'Inter', sans-serif" }}>{new Date(tarjeta.fecha_apertura).toLocaleDateString()}</div>
                   </div>
                   <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '12px', flex: 1, border: '1px solid #E2E8F0 shadow-sm' }}>
                      <label style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, display: 'block', marginBottom: '4px', fontFamily: "'Inter', sans-serif" }}>FECHA LÍMITE</label>
                      <div style={{ fontWeight: 700, color: '#DC2626', fontFamily: "'Inter', sans-serif" }}>{tarjeta.fecha_limite ? new Date(tarjeta.fecha_limite).toLocaleDateString() : 'N/A'}</div>
                   </div>
                </div>

                <div>
                   <label style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, display: 'block', marginBottom: '0.4rem', fontFamily: "'Inter', sans-serif" }}>DETECTADA POR</label>
                   <div style={{ fontWeight: 600, color: '#1B2B41', fontFamily: "'Inter', sans-serif" }}>{tarjeta.detectada_por || 'N/A'}</div>
                </div>

                <div>
                   <label style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, display: 'block', marginBottom: '0.4rem', fontFamily: "'Inter', sans-serif" }}>OBSERVACIONES</label>
                   <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', fontStyle: 'italic', fontFamily: "'Inter', sans-serif" }}>{tarjeta.observaciones || 'Sin observaciones adicionales'}</p>
                </div>

                {tarjeta.fecha_cierre && (
                  <div style={{ backgroundColor: '#DCFCE7', padding: '1rem', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#15803D', fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>CERRADA EL {new Date(tarjeta.fecha_cierre).toLocaleDateString()}</div>
                    <div style={{ fontSize: '0.9rem', color: '#166534', marginTop: '4px', fontFamily: "'Inter', sans-serif" }}>Por: {tarjeta.cerrada_por || 'N/A'}</div>
                  </div>
                )}
             </div>
          </div>

        </div>

      </div>

      <div style={{ height: '3rem' }}></div>
    </div>
  );
}

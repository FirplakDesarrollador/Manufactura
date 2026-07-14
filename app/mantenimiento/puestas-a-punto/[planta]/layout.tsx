import BackButton from '@/components/mtto-autonomo/BackButton';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default async function PlantaLayout({ children, params }: { children: ReactNode, params: Promise<{ planta: string }> }) {
  const resolvedParams = await params;
  const decodedPlanta = decodeURIComponent(resolvedParams.planta);
  const formattedPlanta = decodedPlanta.charAt(0).toUpperCase() + decodedPlanta.slice(1);

  return (
    <div className="home-container" style={{ backgroundColor: '#f4f7f9', minHeight: '100vh', paddingTop: '0', paddingBottom: '4rem' }}>
      
      {/* Header Premium Global */}
      <header className="no-print" style={{ 
        width: '100%', 
        backgroundColor: '#f0f7ff', 
        borderBottom: '1px solid #d1e3f8',
        padding: '0.6rem 2rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Image 
            src="/logo_2.png" 
            alt="FIRPLAK" 
            width={100} 
            height={25} 
            style={{ objectFit: 'contain', filter: 'brightness(0.3)' }} 
          />
          <div style={{ width: '1px', height: '24px', backgroundColor: '#d1e3f8' }}></div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1A445B', margin: 0 }}>{formattedPlanta}</h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <BackButton showHome={true} />
        </div>
      </header>

      <main className="fade-in" style={{ width: '92%', maxWidth: '1450px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}

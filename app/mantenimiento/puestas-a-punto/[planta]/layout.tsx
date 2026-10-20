'use client';

import Header from '@/components/opt-sistemica/Header';
import type { ReactNode } from 'react';
import { useParams } from 'next/navigation';

export default function PlantaLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const rawPlanta = (params?.planta as string) || '';
  const decodedPlanta = decodeURIComponent(rawPlanta);
  const formattedPlanta = decodedPlanta ? decodedPlanta.charAt(0).toUpperCase() + decodedPlanta.slice(1) : '';

  return (
    <div className="home-container" style={{ backgroundColor: '#f4f7f9', minHeight: '100vh', paddingTop: '0', paddingBottom: '4rem' }}>
      
      {/* Header FIRPLAK Global */}
      <Header
        title="Puesta a Punto"
        subtitle={formattedPlanta}
        showLogout={true}
      />

      <main className="fade-in" style={{ width: '92%', maxWidth: '1450px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}

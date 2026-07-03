import VerPuestasClient from '@/components/mtto-autonomo/VerPuestasClient';
import { supabase } from '@/lib/mtto-autonomo/supabase';
import React from 'react';

export const revalidate = 0;

export default async function AuditoriaPage({ params }: { params: Promise<{ planta: string }> }) {
  const resolvedParams = await params;
  const plantaStr = decodeURIComponent(resolvedParams.planta);

  const { data: finalData } = await supabase
    .from('puestas_a_punto_encabezado')
    .select('*')
    .eq('planta', plantaStr);

  const corporateBlue = '#1A445B';
  
  // Resumen simple para el dashboard
  const totalRegistros = finalData?.length || 0;
  const abiertos = finalData?.filter(r => r.estado_puesta_a_punto?.toUpperCase() === 'ABIERTA').length || 0;

  return (
    <div style={{ width: '100%', maxWidth: '1450px', margin: '0 auto', padding: '0 2rem' }}>
      
      {/* Dashboard de Auditoría de Planta */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '20px', 
        padding: '2.5rem', 
        marginBottom: '3rem', 
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '3rem',
        alignItems: 'center',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03)'
      }}>
        <div style={{ flex: '1 1 300px' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: corporateBlue, margin: 0, letterSpacing: '-0.02em' }}>
            Auditoría de Planta
          </h1>
          <p style={{ color: '#64748B', fontSize: '1.1rem', marginTop: '8px', fontWeight: 500 }}>
            {plantaStr} • Gestión de cumplimiento técnico
          </p>
        </div>

        <div style={{ display: 'flex', gap: '2rem' }}>
          <div style={{ textAlign: 'center', padding: '0 1.5rem', borderRight: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Registros</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: corporateBlue }}>{totalRegistros}</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0 1.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Labores Abiertas</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1A445B' }}>{abiertos}</div>
          </div>
        </div>
      </div>

      <VerPuestasClient 
        planta={plantaStr} 
        datosDb={finalData || []} 
        actionLabel="Auditar" 
        actionBaseRoute="auditoria" 
      />
      
      <style>{`
        .greeting-subtitle { display: none !important; }
      `}</style>
    </div>
  );
}

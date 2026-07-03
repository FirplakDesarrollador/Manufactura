import { supabase } from '../../../../../lib/supabase';
import React from 'react';
import BackButton from '@/components/mtto-autonomo/BackButton';
import AuditTableClient from '@/components/mtto-autonomo/AuditTableClient';

export const revalidate = 0;

export default async function AuditoriaDetallePage({ params }: { params: Promise<{ planta: string, id: string }> }) {
  const resolvedParams = await params;
  const { planta, id } = resolvedParams;
  const decodedPlanta = decodeURIComponent(planta);

  const { data: enc } = await supabase.from('puestas_a_punto_encabezado').select('*').eq('id_puesta_a_punto', id).single();
  const { data: det } = await supabase.from('puestas_a_punto_detalle').select('*').eq('id_puesta_a_punto', id);

  if (!enc) return <div style={{ padding: '2rem' }}>No se encontró el registro para auditoría.</div>;

  const rawItems = det || [];
  const groupedTasks: Record<string, any> = {};
  rawItems.forEach(row => {
      const eq = row.equipo_herramienta || 'Generales';
      const rev = row.punto_a_revisar || 'Sin especificar';
      const key = `${eq}_||_${rev}`;
      if (!groupedTasks[key]) {
          groupedTasks[key] = { 
              equipo: eq, 
              revisar: rev, 
              dias: {},               auditado: row.auditado || null 
          };
      }
      if (row.fecha_revision) {
          const datePart = row.fecha_revision.split('-')[2];
          if (datePart) groupedTasks[key].dias[parseInt(datePart, 10).toString()] = row.resultado;
      }
  });
  const items = Object.values(groupedTasks).sort((a: any, b: any) => a.equipo.localeCompare(b.equipo));

  const clean = (val: string | null | undefined) => (!val || val.toUpperCase() === 'PENDIENTE' || val.toUpperCase() === 'N/A') ? '' : val;

  // Dark blue color from Firplak logo
  const corporateBlue = '#1A445B';
  const accentBlue = '#1A445B';

  return (
    <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackButton />
        <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Auditando: <strong>{enc.nombre_puesta_a_punto || enc.proceso}</strong></span>
        </div>
      </div>
      
      {/* Main Content (Interactive Table) */}
      <AuditTableClient initialItems={items} idPuestaAPunto={id} initialEnc={enc} />
    </div>
  );
}

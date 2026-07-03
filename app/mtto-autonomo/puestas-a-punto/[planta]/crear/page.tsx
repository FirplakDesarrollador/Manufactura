import CrearPuestaClient from '@/components/mtto-autonomo/CrearPuestaClient';

export default async function CrearPuestaPage({ params }: { params: Promise<{ planta: string }> }) {
  const resolvedParams = await params;
  const plantaStr = decodeURIComponent(resolvedParams.planta);

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ fontSize: '1.6rem', marginBottom: '2.5rem', textAlign: 'center', color: '#1A445B' }}>
        Crear
      </h2>
      <CrearPuestaClient planta={plantaStr} />
    </div>
  );
}

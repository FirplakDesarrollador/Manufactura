import BackButton from '@/components/mtto-autonomo/BackButton';
import CrearTarjetaClient from '@/components/mtto-autonomo/CrearTarjetaClient';

export default function CrearTarjetaPage() {
  return (
    <div className="home-container" style={{ paddingTop: '2.5rem' }}>
      <div style={{ width: '92%', maxWidth: '1450px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3.5rem', padding: '0 1rem' }}>
        <BackButton />
      </div>


      <CrearTarjetaClient />
    </div>
  );
}

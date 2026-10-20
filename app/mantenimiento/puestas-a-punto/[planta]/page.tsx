import { redirect } from 'next/navigation';

export default async function PlantaPage({ params }: { params: Promise<{ planta: string }> }) {
  const resolvedParams = await params;
  redirect(`/mantenimiento/puestas-a-punto/${resolvedParams.planta}/ver`);
}


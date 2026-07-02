import { createClient } from '@/lib/supabase/server'
import { createExternalClient } from '@/lib/supabase/external'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Home, ChevronLeft } from 'lucide-react'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function OPTDetailPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()
    const externalSupabase = createExternalClient()

    // Fetch the OPT record
    console.log('Fetching OPT record with ID:', id)
    
    // Try searching by ID (uppercase) first, then id (lowercase) if needed
    // Use limit(1) instead of maybeSingle() to handle edge cases with duplicate IDs
    let { data: observationsArray, error } = await supabase
        .from('OPT')
        .select('*')
        .eq('ID', id)
        .order('Create_at', { ascending: false, nullsFirst: false })
        .limit(1)

    let observation = observationsArray && observationsArray.length > 0 ? observationsArray[0] : null

    if (!observation && !error) {
        const { data: secondObservationsArray, error: secondError } = await supabase
            .from('OPT')
            .select('*')
            .eq('id', id)
            .order('Create_at', { ascending: false, nullsFirst: false })
            .limit(1)
        
        observation = secondObservationsArray && secondObservationsArray.length > 0 ? secondObservationsArray[0] : null
        error = secondError
    }

    if (error) {
        console.error('Error fetching observation:', error)
    }
    console.log('Observation data:', observation)

    if (!observation) {
        return notFound()
    }

    // List of keys to exclude or handle specially
    const specialKeys = ['ID', 'id', 'Modified', 'Create_at', 'Created']

    // Explicit order based on the user's image
    const orderedKeys = [
        'Título',
        'Created By',
        'Create_at',
        'Planta',
        'Operario',
        'Foto', // Special: will show operator photo
        'Puesto',
        'Observación lejana / cercana',
        'Etiquetas',
        'Elementos de seguridad',
        'Observaciones seguridad',
        'Puesto con ergonomía',
        'Observaciones de ergonomía',
        'Puesto ordenado y aseado',
        'Observaciones orden y aseo',
        'Cumple HDT',
        'Observaciones HDT',
        'Cumple 5S',
        'Observaciones 5S',
        'Cumple puesta a punto / plan de control',
        'Observaciones plan control',
        'Herramientas en buen estado',
        'Observaciones herramientas',
        'Operario conoce los defectos de calidad',
        'Observaciones defectos calidad',
        'Operario conoce sus indicadores',
        'Observaciones indicadores',
        'Producto conforme',
        'Observaciones producto conforme',
        'Emociones',
        'VA',
        'NVA',
        'Observaciones VA/NVA',
        'Datos Adjuntos' // Special: will show attachment info
    ]

    // Fetch employee data to get the photo
    const { data: empleados } = await externalSupabase
        .from('empleados')
        .select('nombreCompleto, foto')
        .eq('activo', true)

    // Find operator photo
    const operatorPhoto = observation.Operario 
        ? empleados?.find(e => e.nombreCompleto === observation.Operario)?.foto 
        : null

    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* Header */}
            <header className="bg-primary w-full text-white py-4 px-6 flex justify-between items-center shadow-md mb-6 relative">
                <div className="flex items-center gap-3">
                    <Link href="/observations/opt" className="hover:opacity-80 transition-opacity flex items-center gap-1">
                        <ChevronLeft size={32} />
                        <span className="font-semibold hidden sm:inline">Atrás</span>
                    </Link>
                </div>
                <div className="flex items-center gap-6">
                    <Link href="/" className="hover:opacity-80 transition-opacity flex items-center gap-1">
                        <Home size={28} />
                        <span className="font-semibold hidden sm:inline">Inicio</span>
                    </Link>
                    <Image
                        src="/firplak-logo.png"
                        alt="Firplak Logo"
                        width={100}
                        height={32}
                        className="brightness-0 invert object-contain"
                    />
                </div>
            </header>

            <main className="flex flex-col p-4 sm:p-6 text-primary max-w-4xl mx-auto w-full">
                {/* Quick View Table Section */}
                <section className="mb-10 w-full overflow-hidden border-2 border-primary rounded-xl shadow-lg bg-white font-sans text-black">
                <div className="bg-primary text-white px-6 py-4 flex justify-between items-center relative">
                    <h2 className="text-xl font-bold">ID: {observation.ID || observation.id}</h2>
                    <span className="absolute left-1/2 -translate-x-1/2 text-lg font-black tracking-widest text-white hidden sm:inline">OPT</span>
                    
                    {observation.Calificación !== undefined && observation.Calificación !== null && (
                        <div className={`px-4 py-1 rounded-full font-bold text-sm border-2 ${
                            observation.Calificación >= 80 ? 'bg-green-100 text-green-700 border-green-200' :
                            observation.Calificación >= 50 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            'bg-red-100 text-red-700 border-red-200'
                        }`}>
                            Calidad: {observation.Calificación}%
                        </div>
                    )}
                </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <tbody className="divide-y divide-gray-100">
                                {orderedKeys.map((key) => {
                                    let value = observation[key];
                                    
                                    // Special Handling: Foto
                                    if (key === 'Foto') {
                                        return (
                                            <tr key={key} className="hover:bg-gray-50/50 transition-colors">
                                                <th className="px-6 py-3 bg-gray-50/50 text-xs font-bold uppercase text-gray-400 w-1/3 border-r border-gray-100 align-top">
                                                    Foto
                                                </th>
                                                <td className="px-6 py-3 text-sm text-primary">
                                                    {operatorPhoto ? (
                                                        <div className="w-48 h-64 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 shadow-sm relative">
                                                            <img 
                                                                src={operatorPhoto} 
                                                                alt="Foto del operario" 
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 italic">Sin foto del operario</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    // Special Handling: Datos Adjuntos
                                    if (key === 'Datos Adjuntos') {
                                        return (
                                            <tr key={key} className="hover:bg-gray-50/50 transition-colors">
                                                <th className="px-6 py-3 bg-gray-50/50 text-xs font-bold uppercase text-gray-400 w-1/3 border-r border-gray-100">
                                                    Datos Adjuntos
                                                </th>
                                                <td className="px-6 py-3 text-sm text-primary">
                                                    {observation.archivo ? (
                                                        <span className="flex items-center gap-2 group">
                                                            <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse" />
                                                            {observation.archivo}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300 italic">No hay nada adjunto.</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    // Default rendering for other keys
                                    const labelMap: Record<string, string> = {
                                        'Created By': 'Creado Por',
                                        'Create_at': 'Fecha',
                                    }
                                    const displayLabel = labelMap[key] ?? key

                                    // Format date for Create_at
                                    let displayValue: React.ReactNode = value
                                    if (key === 'Create_at' && value) {
                                        const d = new Date(value)
                                        const formatted = d.toLocaleDateString('es-CO', {
                                            day: '2-digit', month: '2-digit', year: 'numeric'
                                        }) + ' ' + d.toLocaleTimeString('es-CO', {
                                            hour: '2-digit', minute: '2-digit'
                                        })
                                        displayValue = formatted
                                    }

                                    // Format VA and NVA as percentages
                                    if ((key === 'VA' || key === 'NVA') && value !== null && value !== undefined) {
                                        const va = parseFloat(observation['VA']) || 0
                                        const nva = parseFloat(observation['NVA']) || 0
                                        const total = va + nva
                                        if (total > 0) {
                                            const pct = key === 'VA'
                                                ? Math.round((va / total) * 100)
                                                : Math.round((nva / total) * 100)
                                            displayValue = (
                                                <span className={`font-semibold ${key === 'VA' ? 'text-green-600' : 'text-red-500'}`}>
                                                    {pct}%
                                                </span>
                                            )
                                        } else {
                                            displayValue = <span className="text-gray-300 italic">Sin datos</span>
                                        }
                                    }

                                    return (
                                        <tr key={key} className="hover:bg-gray-50/50 transition-colors">
                                            <th className="px-6 py-3 bg-gray-50/50 text-xs font-bold uppercase text-gray-400 w-1/3 border-r border-gray-100">
                                                {displayLabel}
                                            </th>
                                            <td className="px-6 py-3 text-sm text-black">
                                                {typeof value === 'boolean' ? (
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {value ? 'SÍ' : 'NO'}
                                                    </span>
                                                ) : value === null || value === '' || value === undefined ? (
                                                    <span className="text-gray-300 italic">Sin datos</span>
                                                ) : (
                                                    displayValue
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    )
}

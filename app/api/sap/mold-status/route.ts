import { NextRequest, NextResponse } from 'next/server'
import { updateMoldStatusInSAP } from '@/lib/sap-service'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { moldeSerial, nuevoEstado } = body

        if (!moldeSerial || !nuevoEstado) {
            return NextResponse.json(
                { error: 'Faltan parámetros requeridos: moldeSerial, nuevoEstado' },
                { status: 400 }
            )
        }

        // Mapeo específico según informe para SAP
        // Solo actuamos si el estado es "Reparacion" o "En reparacion" -> mapeamos a "En reparación" en SAP
        if (nuevoEstado !== 'Reparacion' && nuevoEstado !== 'En reparacion') {
             return NextResponse.json({ message: 'Sincronización omitida: estado no mapeado para SAP.' })
        }

        const sapEstado = 'En reparación'
        
        console.log(`Sincronizando molde ${moldeSerial} con SAP a estado: ${sapEstado}`)
        
        const result = await updateMoldStatusInSAP(moldeSerial, sapEstado)

        return NextResponse.json({ 
            message: 'Sincronización exitosa con SAP', 
            details: result 
        })

    } catch (error: any) {
        console.error('Error en API SAP Mold Status:', error)
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: 500 }
        )
    }
}

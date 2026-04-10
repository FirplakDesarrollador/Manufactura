import { NextResponse } from 'next/server'
import { getMoldDetailsFromSAP } from '@/lib/sap-service'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ serial: string }> }
) {
    const { serial } = await params

    if (!serial) {
        return NextResponse.json({ error: 'Serial no proporcionado' }, { status: 400 })
    }

    try {
        const details = await getMoldDetailsFromSAP(serial)
        
        if (!details) {
            // Molde no encontrado en SAP - NO es un error, es informativo
            return NextResponse.json({ 
                estadoSAP: null, 
                found: false,
                message: 'Molde no registrado en SAP' 
            })
        }

        return NextResponse.json({ 
            ...details, 
            found: true 
        })
    } catch (error: any) {
        console.error(`[SAP Error] Serial ${serial}:`, error.message)
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
    }
}

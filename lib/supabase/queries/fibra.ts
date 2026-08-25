import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, RegistroTrazabilidad, Molde } from '@/types/pintura'

export async function getOrdenesFabricacion(): Promise<OrdenFabricacion[]> {
    const { data, error } = await supabase
        .from('ordenes_fabricacion_fv')
        .select('*')
        .order('fecha_ideal_produccion', { ascending: true })

    if (error) {
        console.error('Error fetching ordenes fabricacion:', error)
        return []
    }

    return data || []
}

export async function getRegistrosTrazabilidad(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('trazabilidad_fv')
        .select('*')
        .order('pintura_fecha', { ascending: false })
        .limit(5000)

    if (error) {
        console.error('Error fetching registros trazabilidad:', error)
        return []
    }

    return data || []
}

export async function getRegistrosTrazabilidadHoy(): Promise<RegistroTrazabilidad[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayStr = today.toISOString()
    
    const { data, error } = await supabase
        .from('trazabilidad_fv')
        .select('*')
        .or(`pintura_fecha.gte.${todayStr},vaciado_fecha.gte.${todayStr},acabado_fecha.gte.${todayStr},cedi_fecha.gte.${todayStr},transito_fecha.gte.${todayStr},estado.eq.Digitado,estado.eq.Transito`)
        .order('vaciado_fecha', { ascending: false })
        .limit(10000)

    if (error) {
        console.error('Error fetching registros trazabilidad hoy:', error)
        return []
    }

    return data || []
}

export async function getRegistrosTrazabilidadActivos(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('trazabilidad_fv')
        .select('*')
        .not('estado', 'eq', 'Cedi')
        .order('pintura_fecha', { ascending: false })
        .limit(500)

    if (error) {
        console.error('Error fetching registros trazabilidad activos:', error)
        return []
    }

    return data || []
}

export async function getRegistrosTrazabilidadPorOrden(ordenFabricacion: string): Promise<RegistroTrazabilidad[]> {
    // In trazabilidad_fv we might only have orden_fabricacion_id, but the query might need to join or filter differently.
    // For now we'll match by orden_fabricacion if it exists, or just return empty if it doesn't match the schema perfectly
    // The original view query_trazabilidad_ms had "orden_fabricacion" as a string joined field. 
    // trazabilidad_fv has orden_fabricacion_id.
    const { data: ordenData } = await supabase
        .from('ordenes_fabricacion_fv')
        .select('id')
        .eq('orden_fabricacion', ordenFabricacion)
        .single()
        
    if (!ordenData) return [];

    const { data, error } = await supabase
        .from('trazabilidad_fv')
        .select('*')
        .eq('orden_fabricacion_id', ordenData.id)
        .order('pintura_fecha', { ascending: false })

    if (error) {
        console.error('Error fetching registros trazabilidad por orden:', error)
        return []
    }

    return data || []
}

export async function getMoldesDisponibles(moldeSku: string): Promise<Molde[]> {
    const { data, error } = await supabase
        .from('moldes_fv')
        .select('*')
        .eq('estado', 'Disponible')
        .eq('tipo_molde_sku', moldeSku) // Changed molde_sku to tipo_molde_sku based on moldes_fv schema
        .order('vueltas_actuales', { ascending: true })

    if (error) {
        console.error('Error fetching moldes disponibles:', error)
        return []
    }

    return data || []
}

export async function getAllMoldes(): Promise<Molde[]> {
    const { data, error } = await supabase
        .from('moldes_fv')
        .select('*')
        .neq('estado', 'Destruido')
        // We order by serial since descripcion_molde might not exist directly in moldes_fv
        .order('serial', { ascending: true })

    if (error) {
        console.error('Error fetching all moldes:', error)
        return []
    }

    // Map serial to molde_descripcion to be compatible with UI
    return (data || []).map(m => ({
        ...m,
        molde_descripcion: m.observaciones || m.serial,
        molde_sku: m.tipo_molde_sku
    }))
}

export async function updateMoldeEstado(moldeId: number, nuevoEstado: string) {
    const { data, error } = await supabase
        .from('moldes_fv')
        .update({ estado: nuevoEstado })
        .eq('id', moldeId)
        .select()

    if (error) {
        console.error('Error updating molde estado:', error)
        throw error
    }

    return data
}

export async function registrarPintura(pinturaData: {
    orden_fabricacion_id: number
    molde_id: number
    linea: string
    usuario_email: string
}) {
    // 1. Obtener orden de fabricación
    const { data: orden, error: ordenError } = await supabase
        .from('ordenes_fabricacion_fv')
        .select('*')
        .eq('id', pinturaData.orden_fabricacion_id)
        .single()

    if (ordenError || !orden) {
        throw new Error(`Error al buscar la orden: ${ordenError?.message || 'No encontrada'}`)
    }

    // 1.1 Verificar piezas ya registradas
    const { count, error: countError } = await supabase
        .from('trazabilidad_fv')
        .select('*', { count: 'exact', head: true })
        .eq('orden_fabricacion_id', pinturaData.orden_fabricacion_id)

    if (!countError) {
        const piezasRegistradas = count || 0
        const piezasPermitidas = orden.cantidad || orden.programado || 0

        if (piezasRegistradas >= piezasPermitidas && piezasPermitidas > 0) {
            throw new Error(`Acción bloqueada: La orden ${orden.orden_fabricacion} ya completó la sumatoria máxima de sus ${piezasPermitidas} piezas (${piezasRegistradas} registradas en etapas).`)
        }
    }

    // 2. Obtener masa teórica
    let masa = orden.producto_masa || 0
    if (!masa && orden.producto_sku) {
        const { data: producto } = await supabase
            .from('productos_fv')
            .select('masa')
            .eq('producto_sku', orden.producto_sku)
            .maybeSingle()
        if (producto) masa = producto.masa || 0
    }
    if (!masa) masa = 0

    // 3. Obtener información del molde
    const { data: molde, error: moldeError } = await supabase
        .from('moldes_fv')
        .select('*')
        .eq('id', pinturaData.molde_id)
        .single()

    if (moldeError || !molde) {
        throw new Error('Error al obtener información del molde.')
    }

    // 4. Buscar el ID numérico del usuario
    let userId: number | null = null

    const { data: userByCorreo } = await supabase
        .from('usuarios')
        .select('id')
        .eq('correo', pinturaData.usuario_email || '')
        .maybeSingle()
    
    if (userByCorreo) {
        userId = userByCorreo.id
    }

    if (!userId) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.id) {
            const { data: userByUuid } = await supabase
                .from('usuarios')
                .select('id')
                .eq('uuid', authUser.id)
                .maybeSingle()
            
            if (userByUuid) {
                userId = userByUuid.id
            }
        }
    }

    if (!userId) {
        throw new Error(`No se encontró el usuario. Correo: ${pinturaData.usuario_email}.`)
    }

    // 5. Verificar que el molde no esté en proceso
    const { data: trazaReciente, error: trazaError } = await supabase
        .from('trazabilidad_fv')
        .select('estado')
        // Assuming we relate through molde_id directly in trazabilidad_fv
        .eq('molde_id', molde.id)
        .order('pintura_fecha', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (!trazaError && trazaReciente && (trazaReciente.estado === 'Pintura' || trazaReciente.estado === 'Vaciado')) {
        throw new Error(`Acción no permitida: El molde ${molde.serial} ya está en proceso de ${trazaReciente.estado}.`)
    }

    // 6. Actualizar molde
    const now = new Date()
    const { error: updateError } = await supabase
        .from('moldes_fv')
        .update({ 
            estado: 'En uso',
            vueltas_actuales: (molde.vueltas_actuales || 0) + 1,
            vueltas_acumuladas: (molde.vueltas_acumuladas || 0) + 1,
            modificado_por: pinturaData.usuario_email,
            modified_at: now.toISOString()
        })
        .eq('id', pinturaData.molde_id)

    if (updateError) {
        throw new Error(`Error al actualizar el molde: ${updateError.message}`)
    }

    // 7. Generar registrer
    const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14)
    const registrer = `${timestamp}${molde.serial}`

    // 8. INSERT en trazabilidad_fv
    const insertPayload = {
        pintura_fecha: now.toISOString(),
        orden_fabricacion_id: pinturaData.orden_fabricacion_id,
        molde_id: pinturaData.molde_id,
        pintura_user_id: userId,
        pintura_linea: pinturaData.linea,
        contramolde: false,
        enviar_reparar_molde: false,
        registrer: registrer,
        estado: 'Pintura',
        kilos_vaciados: masa
    }

    const { data, error: insertError } = await supabase
        .from('trazabilidad_fv')
        .insert(insertPayload)
        .select()
        .single()

    if (insertError) {
        console.error('Error completo de Supabase:', JSON.stringify(insertError))
        throw new Error(`Error al crear registro: [${insertError.code}] ${insertError.message || JSON.stringify(insertError)}`)
    }

    return data
}

export async function eliminarRegistroPintura(registroId: number, moldeSerial: string) {
    // We assume trazabilidad_fv uses 'registrer' or we need to find id in trazabilidad_fv
    // Note: trazabilidad_fv might not have 'id'. We need to be careful.
    // If it has no 'id' but uses 'registrer' as PK:
    throw new Error('eliminarRegistroPintura Not implemented for Fibra yet');
}

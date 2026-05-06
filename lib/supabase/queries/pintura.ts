import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, RegistroTrazabilidad, Molde } from '@/types/pintura'

export async function getOrdenesFabricacion(): Promise<OrdenFabricacion[]> {
    const { data, error } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*')
        .order('fecha_entrega_estimada', { ascending: true })

    if (error) {
        console.error('Error fetching ordenes fabricacion:', error)
        return []
    }

    return data || []
}

export async function getRegistrosTrazabilidad(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
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
        .from('query_trazabilidad_ms')
        .select('*')
        .or(`pintura_fecha.gte.${todayStr},vaciado_fecha.gte.${todayStr},acabado_fecha.gte.${todayStr},cedi_fecha.gte.${todayStr},digitado_fecha.gte.${todayStr},transito_fecha.gte.${todayStr},estado.eq.Digitado,estado.eq.Transito`)
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
        .from('query_trazabilidad_ms')
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
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .eq('orden_fabricacion', ordenFabricacion)
        .order('pintura_fecha', { ascending: false })

    if (error) {
        console.error('Error fetching registros trazabilidad por orden:', error)
        return []
    }

    return data || []
}

export async function getMoldesDisponibles(moldeSku: string): Promise<Molde[]> {
    const { data, error } = await supabase
        .from('query_moldes')
        .select('*')
        .eq('estado', 'Disponible')
        .eq('molde_sku', moldeSku)
        .order('vueltas_actuales', { ascending: true })

    if (error) {
        console.error('Error fetching moldes disponibles:', error)
        return []
    }

    return data || []
}

export async function getAllMoldes(): Promise<Molde[]> {
    const { data, error } = await supabase
        .from('query_moldes')
        .select('*')
        .neq('estado', 'Destruido')
        .order('molde_descripcion', { ascending: true })

    if (error) {
        console.error('Error fetching all moldes:', error)
        return []
    }

    return data || []
}

export async function updateMoldeEstado(moldeId: number, nuevoEstado: string) {
    const { data, error } = await supabase
        .from('moldes')
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
    // ============================================================
    // ESQUEMA REAL (descubierto vía OpenAPI spec):
    //
    // trazabilidad_ms - 37 columnas
    // REQUERIDOS: id (auto), pintura_fecha, orden_fabricacion_id,
    //   molde_id, pintura_user_id, pintura_linea, contramolde,
    //   enviar_reparar_molde, registrer, estado, kilos_vaciados
    //
    // moldes - 22 columnas
    //   Audit: modificado_por, modificado_desde, modified_at
    //   Desc:  descripcion_molde, nombre_articulo
    // ============================================================

    // 1. Obtener orden de fabricación
    const { data: orden, error: ordenError } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*')
        .eq('id', pinturaData.orden_fabricacion_id)
        .single()

    if (ordenError || !orden) {
        throw new Error(`Error al buscar la orden: ${ordenError?.message || 'No encontrada'}`)
    }

    if ((orden.programado || 0) <= 0) {
        throw new Error('La orden no tiene unidades programadas para pintar.')
    }

    // 2. Obtener masa teórica (kilos_vaciados es requerido)
    let masa = orden.molde_masa_teorica || 0
    if (!masa && orden.producto_sku) {
        const { data: producto } = await supabase
            .from('query_productos_ms')
            .select('masa')
            .eq('producto_sku', orden.producto_sku)
            .maybeSingle()
        if (producto) masa = producto.masa || 0
    }
    // Si no hay masa, usar 0 (es requerido pero 0 es válido)
    if (!masa) masa = 0

    // 3. Obtener información del molde
    const { data: molde, error: moldeError } = await supabase
        .from('moldes')
        .select('*')
        .eq('id', pinturaData.molde_id)
        .single()

    if (moldeError || !molde) {
        throw new Error('Error al obtener información del molde.')
    }

    // 4. Buscar el ID numérico del usuario (pintura_user_id es REQUERIDO)
    //    La tabla usuarios usa 'correo' (NO 'email') y tiene columna 'uuid'
    let userId: number | null = null

    // Intento 1: Buscar por correo
    const { data: userByCorreo } = await supabase
        .from('usuarios')
        .select('id')
        .eq('correo', pinturaData.usuario_email || '')
        .maybeSingle()
    
    if (userByCorreo) {
        userId = userByCorreo.id
    }

    // Intento 2: Si no encontró por correo, buscar por UUID del auth user
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
        throw new Error(`No se encontró el usuario. Correo: ${pinturaData.usuario_email}. Verifique que esté registrado en la tabla usuarios.`)
    }


    // 5. Verificar que el molde no esté en proceso (Pintura o Vaciado)
    const { data: trazaReciente, error: trazaError } = await supabase
        .from('query_trazabilidad_ms')
        .select('estado, molde_serial')
        .eq('molde_serial', molde.serial)
        .order('pintura_fecha', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (trazaError) {
        throw new Error('Error al verificar estado del molde.')
    }

    if (trazaReciente && (trazaReciente.estado === 'Pintura' || trazaReciente.estado === 'Vaciado')) {
        throw new Error(`Acción no permitida: El molde ${molde.serial} ya está en proceso de ${trazaReciente.estado}.`)
    }

    // 6. Actualizar molde: estado + vueltas
    //    Columnas reales: estado, vueltas_actuales, vueltas_acumuladas, 
    //    modificado_por, modificado_desde, modified_at
    const now = new Date()
    const { error: updateError } = await supabase
        .from('moldes')
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

    // 7. Generar registrer: AAAAMMDDHHMMSS + Serial
    const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14)
    const registrer = `${timestamp}${molde.serial}`

    // 8. INSERT en trazabilidad_ms - SOLO columnas que existen en la tabla
    //    Campos requeridos: pintura_fecha, orden_fabricacion_id, molde_id,
    //    pintura_user_id, pintura_linea, contramolde, enviar_reparar_molde,
    //    registrer, estado, kilos_vaciados
    const insertPayload = {
        pintura_fecha: now.toISOString(),
        orden_fabricacion_id: pinturaData.orden_fabricacion_id,
        molde_id: pinturaData.molde_id,
        pintura_user_id: userId,
        pintura_linea: pinturaData.linea,       // Campo real: pintura_linea (NO linea)
        contramolde: false,                      // Requerido, default false
        enviar_reparar_molde: false,             // Requerido, default false
        registrer: registrer,
        estado: 'Pintura',
        kilos_vaciados: masa
    }

    console.log('INSERT payload:', JSON.stringify(insertPayload, null, 2))

    const { data, error: insertError } = await supabase
        .from('trazabilidad_ms')
        .insert(insertPayload)
        .select()
        .single()

    if (insertError) {
        console.error('Error completo de Supabase:', JSON.stringify(insertError))
        throw new Error(`Error al crear registro: [${insertError.code}] ${insertError.message || JSON.stringify(insertError)}`)
    }

    return data
}

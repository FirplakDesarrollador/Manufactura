import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, RegistroTrazabilidad, Molde } from '@/types/pintura'

export async function getOrdenesFabricacion(): Promise<OrdenFabricacion[]> {
    const { data, error } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*')
        .gt('programado', 0)
        .order('fecha_entrega_estimada', { ascending: true })

    if (error) {
        console.error('Error fetching ordenes fabricacion:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        })
        return []
    }

    return data || []
}

export async function getRegistrosTrazabilidad(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .order('pintura_fecha', { ascending: false })
        .limit(1000)

    if (error) {
        console.error('Error fetching registros trazabilidad:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        })
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
        console.error('Error fetching registros trazabilidad por orden:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        })
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
        console.error('Error fetching moldes disponibles:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        })
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
        console.error('Error fetching all moldes:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        })
        return []
    }

    return data || []
}

export async function updateMoldeEstado(moldeId: number, nuevoEstado: string, descripcion?: string, usuarioNombre?: string) {
    // 1. Actualizar en Supabase (Tabla moldes principal)
    // Mapeo de seguridad para el enum de la base de datos
    const estadoDB = nuevoEstado === 'Reparacion' ? 'En reparacion' : nuevoEstado

    const { data: updateData, error } = await supabase
        .from('moldes')
        .update({ 
            estado: estadoDB,
            modificado_por: usuarioNombre || 'Sistema',
            modified_at: new Date().toISOString()
        })
        .eq('id', moldeId)
        .select('*, serial')
        .single()

    if (error) {
        console.error('Error updating molde estado:', error)
        throw error
    }

    // 2. Crear registro en BD_moldes si es reparación
    if (estadoDB === 'En reparacion') {
        const now = new Date()
        const { error: errorBD } = await supabase
            .from('BD_moldes')
            .insert({
                id: Date.now(),
                Título: descripcion || updateData.serial,
                'CODIGO MOLDE': updateData.serial,
                'DEFECTOS A REPARAR': '',
                'FECHA ENTRADA': now.toISOString().split('T')[0],
                ESTADO: 'En reparación',
                Usuario: usuarioNombre || 'Sistema',
                Tipo: 'Molde',
                Created: now.toISOString(),
                'Created By': usuarioNombre || 'Sistema',
                'Modified By': usuarioNombre || 'Sistema'
            })

        if (errorBD) {
            console.error('Error al crear registro en BD_moldes:', errorBD)
            // No lanzamos error para no bloquear la actualización principal, pero lo logueamos
        } else {
            console.log('Registro creado exitosamente en BD_moldes')
        }
    }

    // 3. Sincronizar con SAP si es "Reparacion" o "En reparacion"
    // Solo si el estado cambió a uno de reparación (que es "En reparación" en SAP)
    if ((nuevoEstado === 'Reparacion' || nuevoEstado === 'En reparacion') && updateData?.serial) {
        try {
            console.log(`Disparando sincronización con SAP para molde ${updateData.serial}`)
            // Llamamos a nuestra propia API local para manejar la comunicación segura con SAP
            fetch('/api/sap/mold-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moldeSerial: updateData.serial,
                    nuevoEstado: 'En reparacion'
                })
            }).then(async (res) => {
                const data = await res.json()
                if (!res.ok) {
                    console.error('Error en sincronización SAP:', data.error)
                } else {
                    console.log('Sincronización SAP exitosa:', data.message)
                }
            }).catch(err => {
                console.error('Error de red al sincronizar con SAP:', err)
            })
        } catch (sapError) {
            console.error('Error al intentar sincronizar con SAP:', sapError)
        }
    }

    return updateData
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

    // 6. Validar mantenimiento preventivo (Vueltas_Desmanchado)
    const vueltasActuales = molde.vueltas_actuales || 0
    const limiteManchado = molde.Vueltas_Desmanchado || 40
    
    if (vueltasActuales > limiteManchado) {
        // REPORTE AUTOMÁTICO A REPARACIÓN
        const { error: repError } = await supabase
            .from('moldes')
            .update({ 
                estado: 'En reparacion',
                vueltas_actuales: 0, // Reset a 0 según solicitud
                vueltas_acumuladas: (molde.vueltas_acumuladas || 0) + 1,
                modificado_por: pinturaData.usuario_email,
                modified_at: new Date().toISOString()
            })
            .eq('id', pinturaData.molde_id)

        if (repError) throw new Error(`Error al reportar molde para reparación: ${repError.message}`)

        // Crear registro en BD_moldes como reparación rápida por Desmanchado
        const now2 = new Date()
        const { error: errorBD } = await supabase
            .from('BD_moldes')
            .insert({
                id: Date.now(),
                Título: molde.descripcion_molde || molde.serial,
                'CODIGO MOLDE': molde.serial,
                'DEFECTOS A REPARAR': 'Desmanchado',
                'FECHA ENTRADA': now2.toISOString().split('T')[0],
                ESTADO: 'En reparación',
                Usuario: pinturaData.usuario_email || 'Sistema',
                Tipo: 'Molde',
                'Tipo de reparacion': 'Reparación rápida',
                Created: now2.toISOString(),
                'Created By': pinturaData.usuario_email || 'Sistema',
                'Modified By': pinturaData.usuario_email || 'Sistema'
            })

        if (errorBD) {
            console.error('Error al crear registro de desmanchado en BD_moldes:', errorBD)
        }

        // Sincronizar con SAP (mismo flujo que updateMoldeEstado)
        try {
            fetch('/api/sap/mold-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moldeSerial: molde.serial,
                    nuevoEstado: 'En reparacion'
                })
            }).catch(e => console.error('Error async SAP:', e))
        } catch (e) {
            console.error('Error sincronizando reparación automática con SAP:', e)
        }

        throw new Error(`MANTENIMIENTO_AUTOMATICO: El molde ${molde.serial} ha superado el límite de ${limiteManchado} vueltas y ha sido enviado a REPARACIÓN automáticamente por Desmanchado. Se han reseteado sus vueltas a 0.`)
    }

    // 7. Actualizar molde: estado + vueltas (Normal)
    const nuevasVueltas = vueltasActuales + 1
    //    Columnas reales: estado, vueltas_actuales, vueltas_acumuladas, 
    //    modificado_por, modificado_desde, modified_at
    const now = new Date()
    const { error: updateError } = await supabase
        .from('moldes')
        .update({ 
            estado: 'En uso',
            vueltas_actuales: nuevasVueltas,
            vueltas_acumuladas: (molde.vueltas_acumuladas || 0) + 1,
            modificado_por: pinturaData.usuario_email,
            modified_at: now.toISOString()
        })
        .eq('id', pinturaData.molde_id)

    if (updateError) {
        throw new Error(`Error al actualizar el molde: ${updateError.message}`)
    }

    // 8. Generar registrer: AAAAMMDDHHMMSS + Serial
    const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14)
    const registrer = `${timestamp}${molde.serial}`

    // 9. INSERT en trazabilidad_ms - SOLO columnas que existen en la tabla
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

export async function getCurrentUserProfile() {
    try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return null

        const { data: profile } = await supabase
            .from('usuarios')
            .select('nombre, correo')
            .eq('uuid', authUser.id)
            .maybeSingle()
        
        return profile || { nombre: authUser.email, correo: authUser.email }
    } catch (error) {
        console.error('Error fetching user profile:', error)
        return null
    }
}

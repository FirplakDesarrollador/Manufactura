import { supabase } from '@/lib/supabase'

/**
 * Busca el ID numérico del usuario en la tabla 'usuarios'.
 * Primero busca por 'correo', luego por 'uuid' del auth user.
 * Retorna el ID o null si no se encuentra.
 */
export async function getUserId(usuarioEmail: string): Promise<number | null> {
    // Intento 1: Buscar por correo
    const { data: userByCorreo } = await supabase
        .from('usuarios')
        .select('id')
        .eq('correo', usuarioEmail || '')
        .maybeSingle()
    
    if (userByCorreo) return userByCorreo.id

    // Intento 2: Buscar por UUID del auth user
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser?.id) {
        const { data: userByUuid } = await supabase
            .from('usuarios')
            .select('id')
            .eq('uuid', authUser.id)
            .maybeSingle()
        if (userByUuid) return userByUuid.id
    }

    return null
}

/**
 * Obtiene el user ID o lanza un error si no se encuentra.
 */
export async function requireUserId(usuarioEmail: string): Promise<number> {
    const userId = await getUserId(usuarioEmail)
    if (!userId) {
        throw new Error(`No se encontró el usuario. Correo: ${usuarioEmail}`)
    }
    return userId
}

/** Libera el molde al salir de vaciado. Conserva reparación o desmanche si ya estaban marcados. */
export async function liberarMolde(moldeId: number, usuarioEmail: string) {
    const { data: moldeActual } = await supabase
        .from('moldes')
        .select('estado')
        .eq('id', moldeId)
        .single()

    const estadoFinal = (moldeActual?.estado === 'En reparacion' || moldeActual?.estado === 'Por desmanchar')
        ? moldeActual.estado
        : 'Disponible'

    const { error } = await supabase
        .from('moldes')
        .update({
            estado: estadoFinal,
            modificado_por: usuarioEmail,
            modified_at: new Date().toISOString()
        })
        .eq('id', moldeId)

    if (error) {
        console.error('Error liberando molde:', error)
    }
}

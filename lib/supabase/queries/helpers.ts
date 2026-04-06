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

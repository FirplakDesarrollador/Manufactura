import { supabase } from '@/lib/supabase'

/**
 * Lista de emails autorizados para editar y eliminar HDTs.
 * Solo estos usuarios pueden acceder al módulo de edición y eliminación.
 */
export const AUTHORIZED_EDITORS: ReadonlySet<string> = new Set([
    'jakeline.chaverra@firplak.com',
    'hector.chinchilla@firplak.com',
    'juliana.ramirez@firplak.com',
    'dimer.vergara@firplak.com',
    'osnar.mejia@firplak.com',
    'supervisorcalidad@firplak.com',
    'david.ramirez@firplak.com',
    'sara.aguilar@firplak.com',
    'brian.sanchez@firplak.com',
    'estiven.londono@firplak.com',
    'jair.alvarez@firplak.com',
])

export function isAuthorizedEditor(email: string | null | undefined): boolean {
    if (!email) return false
    return AUTHORIZED_EDITORS.has(email.toLowerCase().trim())
}

/**
 * Verifica permisos de edición comprobando tanto la lista estática como los permisos dinámicos en Supabase
 */
export async function checkUserHdtEditPermission(email: string | null | undefined, uuid?: string | null): Promise<boolean> {
    if (!email && !uuid) return false
    if (email && isAuthorizedEditor(email)) return true

    try {
        let query = supabase.from('usuarios').select('permisos')
        if (uuid) {
            query = query.eq('uuid', uuid)
        } else if (email) {
            query = query.eq('correo', email)
        }
        const { data: userData } = await query.maybeSingle()
        if (userData?.permisos) {
            const permisos = userData.permisos as any
            if (permisos.hdt?.editar || permisos.hdt === true || permisos.hdt?.crear || permisos.hdt?.acceso_general) {
                return true
            }
        }
    } catch (e) {
        console.warn('Error al verificar permisos de HDT en base de datos:', e)
    }

    return false
}

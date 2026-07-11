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
])

export function isAuthorizedEditor(email: string | null | undefined): boolean {
    if (!email) return false
    return AUTHORIZED_EDITORS.has(email.toLowerCase().trim())
}

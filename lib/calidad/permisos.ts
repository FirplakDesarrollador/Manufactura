// Personas/roles con permiso de edición en módulos de Calidad (misma regla de /calidad/criterios)
const ADMIN_NAMES = ['jair alvarez', 'maria isabel escobar', 'carolina escobar', 'hector', 'calidad', 'admin'];

export interface UsuarioCalidad {
    nombre?: string | null;
    correo?: string | null;
    rol?: string | null;
}

export function puedeEditarCalidad(u: UsuarioCalidad | null | undefined): boolean {
    if (!u) return false;
    const nombre = (u.nombre || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const correo = (u.correo || '').toLowerCase();
    const rol = (u.rol || '').toLowerCase();
    return ADMIN_NAMES.some(a => nombre.includes(a) || correo.includes(a)) || rol.includes('admin') || rol.includes('calidad');
}

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

// ---------------------------------------------------------------------------
// Permisos de Calidad MS por botón (usuarios.permisos.calidad)
//   registro, reportes, historico, saldos, hora_a_hora, indicadores: true/false
//   configuracion, criterios: 'ver' | 'editar' (sin valor = sin acceso)
//   editar / eliminar: editar y eliminar registros (Reportes del día, Histórico y Saldos)
// Los usuarios con el esquema anterior (ms, configurar_defectos, …) se interpretan igual que antes.
// ---------------------------------------------------------------------------
export type NivelCalidadMs = 'ver' | 'editar' | null;

export interface PermisosCalidadMs {
    registro: boolean;
    reportes: boolean;
    historico: boolean;
    saldos: boolean;
    hora_a_hora: boolean;
    indicadores: boolean;
    configuracion: NivelCalidadMs;
    criterios: NivelCalidadMs;
    editarRegistros: boolean;
    eliminarRegistros: boolean;
}

export const BOTONES_CALIDAD_MS: { key: 'registro' | 'reportes' | 'historico' | 'saldos' | 'hora_a_hora' | 'indicadores'; label: string }[] = [
    { key: 'registro', label: 'Registro' },
    { key: 'reportes', label: 'Reportes del día' },
    { key: 'historico', label: 'Histórico' },
    { key: 'saldos', label: 'Saldos y destrucciones' },
    { key: 'hora_a_hora', label: 'Hora a hora' },
    { key: 'indicadores', label: 'Indicadores' }
];

const CLAVES_NUEVAS = ['registro', 'reportes', 'historico', 'saldos', 'hora_a_hora', 'indicadores', 'configuracion', 'criterios'];

const nivel = (v: unknown): NivelCalidadMs => (v === 'editar' || v === true ? 'editar' : v === 'ver' ? 'ver' : null);

export function permisosCalidadMs(u: (UsuarioCalidad & { permisos?: any }) | null | undefined): PermisosCalidadMs {
    const c = u?.permisos?.calidad;
    if (!c || typeof c !== 'object') {
        return { registro: false, reportes: false, historico: false, saldos: false, hora_a_hora: false, indicadores: false, configuracion: null, criterios: null, editarRegistros: false, eliminarRegistros: false };
    }
    if (CLAVES_NUEVAS.some(k => k in c)) {
        return {
            registro: !!c.registro,
            reportes: !!c.reportes,
            historico: !!c.historico,
            saldos: !!c.saldos,
            hora_a_hora: !!c.hora_a_hora,
            indicadores: !!c.indicadores,
            configuracion: nivel(c.configuracion),
            criterios: nivel(c.criterios),
            editarRegistros: !!c.editar,
            eliminarRegistros: !!c.eliminar
        };
    }
    // Esquema anterior: "ms" daba acceso a todo el módulo
    const ms = !!c.ms;
    return {
        registro: ms,
        reportes: ms,
        historico: ms,
        saldos: ms,
        hora_a_hora: ms,
        indicadores: ms,
        configuracion: c.configurar_defectos ? 'editar' : ms ? 'ver' : null,
        criterios: puedeEditarCalidad(u) || c.editar ? 'editar' : ms ? 'ver' : null,
        editarRegistros: !!c.editar,
        eliminarRegistros: !!c.eliminar
    };
}

// Objeto a guardar en usuarios.permisos.calidad. "ms" se mantiene como acceso general al módulo.
export function guardarPermisosCalidadMs(p: PermisosCalidadMs): Record<string, unknown> {
    const out: Record<string, unknown> = {
        registro: p.registro,
        reportes: p.reportes,
        historico: p.historico,
        saldos: p.saldos,
        hora_a_hora: p.hora_a_hora,
        indicadores: p.indicadores,
        configuracion: p.configuracion || false,
        criterios: p.criterios || false,
        editar: p.editarRegistros,
        eliminar: p.eliminarRegistros
    };
    out.ms = BOTONES_CALIDAD_MS.some(b => p[b.key]) || !!p.configuracion || !!p.criterios;
    return out;
}

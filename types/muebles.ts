export interface OrdenMueble {
    id: number;
    created_at: string;
    numero_pedido: string;
    orden_fabricacion: string;
    cantidad: number;
    cliente: string;
    ensayo: boolean;
    producto_sku: string;
    producto_descripcion: string;
    planta: string;
    por_cortar: number;
    piezas_pendientes: string | number;
    corte: number;
    enchape: number;
    inspeccion: number;
    empaque: number;
    digitado: number;
    transito: number;
    cedi: number;
    sum_cortados: number;
    sum_enchapado: number;
    sum_inspeccion: number;
    sum_empacado: number;
    sum_digitado: number;
    sum_transito: number;
    sum_cedi: number;
    piezas: number | string;
    canto: number | string;
    rh_metros: number | string;
    reposiciones: number;
    por_reponer: number;
    reponer_corte: number;
    reponer_enchape: number;
    reponer_inspeccion: number;
    fecha_entrega_estimada: string;
    pendiente: boolean;
    taladro?: string;
}

export interface MetricasMuebles {
    fecha: string;
    turno: string;
    planta: string;
    supervisor: string;
    cortados: number;
    corte_piezas: number | string;
    corte_m2: number | string;
    enchapados: number;
    enchape_piezas: number | string;
    enchape_ml: number | string;
    inspeccion: number;
    inspeccion_piezas: number | string;
    inspeccion_m2: number | string;
    empacados: number;
    empaque_piezas: number | string;
    empaque_m2: number | string;
    digitado: number;
    transito: number;
    cedi: number;
    reposiciones: number;
    reparaciones: number;
    p_calidad: number | string;
    p_rechazado: number | string;
}

export interface Defecto {
    id: number
    created_at: string
    nombre: string
    alerta_amarilla: number
    alerta_roja: number
    estado: boolean
}

export interface Parametro {
    id: number
    parametro: string
    valor: number
    unidad_medida: string
}

export interface ConteoDefecto {
    defecto_id: number
    defecto: string
    cantidad: number
    alerta_amarilla: number
    alerta_roja: number
    ids_reposiciones: number[]
    reparable: boolean
    fecha: string
    turno: string
    taladro: string
    planta: string
    supervisor: string
}

export interface ReposicionMueble {
    id: number
    created_at: string
    orden_fabricacion: string
    producto_descripcion: string
    componente: string
    sku: string
    supervisor: string
    foto: string
    created_by: string
    defecto_nombre: string
    defecto_id: number
    estado: string
    reparable: boolean
    taladro: string
    turno: string
    planta: string
    of_pendiente: boolean
}

export interface Turno {
    id: number
    created_at: string
    turno: string
    inicio: string
    fin: string
}

export interface Supervisor {
    id: number
    created_at: string
    supervisor: string
}

export interface SupervisorTurno {
    id: number
    created_at: string
    turno: string
    supervisor_id: number
    supervisor_nombre?: string
    planta: string
}

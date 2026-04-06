export interface OrdenFabricacion {
    id: number
    orden_fabricacion: string
    pedido: string
    producto_descripcion: string
    cliente_nombre: string
    cantidad_programada: number
    fecha_entrega_estimada: string
    estado: string
    sku?: string
    // Summary fields
    vaciado?: number
    pulido?: number
    saldo?: number
    empaque?: number
    acabado?: number
    digitado?: number
    transito?: number
    programado?: number
    cantidad?: number
    pintura?: number
    cliente?: string
    producto_sku?: string
    molde_sku?: string
    molde_descripcion?: string
    fecha_ideal_produccion?: string
}

export interface Molde {
    id: number
    serial: string
    molde_descripcion: string
    molde_sku: string
    estado: string
    vueltas_totales: number
    vueltas_actuales: number
    vueltas_acumuladas?: number
    vueltas_mto: number
    vueltas_mto_atipicas: number
    linea: string
}

export interface RegistroTrazabilidad {
    id: number
    pintura_fecha: string
    molde_serial: string
    molde_descripcion: string
    orden_fabricacion: string
    pedido: string
    producto_descripcion: string
    linea: string
    usuario_email: string
    contramolde: boolean
    vaciado_fecha?: string
    fecha_vaciado?: string
    acabado_fecha?: string
    desmolde_fecha?: string
    pulido_fecha?: string
    empaque_fecha?: string
    digitado_fecha?: string
    transito_fecha?: string
    cedi_fecha?: string
    estado?: string
    numero_pedido?: string
    producto_sku?: string
    kilos_vaciados?: number
    producto_tamano?: string
    molde_masa_teorica?: number
}

export interface KilosReferencia {
    producto_sku: string;
    producto_descripcion: string;
    masa: number;
    cantGelcoat: number;
}

export interface ProductoMS {
    id: number
    producto_sku: string
    producto_descripcion: string
    masa: number
    porcentaje_reduccion: number
    kilos_reduccion: number
    kilos: number // Calculated in view
    cantGelcoat: number
    color?: string
    color_codigo?: string
    modified_at?: string
    modified_by?: string
    created_at?: string
}

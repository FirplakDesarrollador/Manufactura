'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/opt-sistemica/Header'
import componentsData from './components_data.json'
import semaforoData from './semaforo_data.json'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { Boxes, FileSpreadsheet, Download, RefreshCw, Copy, Check, PackageSearch, Search, Loader2 } from 'lucide-react'

interface ComponentItem {
    id: number;
    tipo: string;
    no: string;
    descripcion: string;
    cantBase: number | string;
    ratioBase: number | string;
    cantRequerida: number | string;
    consumido: number | string;
    disponible: number | string;
    unidadMedida: string;
    almacen: string;
    metodoEmision: string;
    ctaWip?: string;
    dimension1?: string;
    secuenciaRuta?: string;
    docAprovisionamiento?: string;
    permitirDocAprov?: boolean;
}

interface OrderData {
    tipo: string;
    estado: string;
    noProducto: string;
    descripcionProducto: string;
    cantPlanificada: number;
    nombreUN: string;
    almacen: string;
    socioNegocio: string;
    metodoEnrutamiento: string;
    aprovisionarArticulos: boolean;
    noOrden: string;
    fechaOrden: string;
    fechaInicio: string;
    fechaFinalizacion: string;
    usuario: string;
    origen: string;
    vinculadoA: string;
    pedidoVinculado: string;
    cliente: string;
    centroCostos: string;
    proyecto: string;
    comentarios: string;
    observacionesEmpaque: string;
    cantCompletada?: number;
    cantRechazada?: number;
    fechaCierreReal?: string;
    asientoContable?: string;
    componentes: ComponentItem[];
}

interface SemaforoItem {
    id: number;
    originnum: string;
    nroOp: string;
    sku: string;
    descripcion: string;
    planta: string;
    familia: string;
    tipoOrden: string;
    cantPendiente: string;
    cantPendItem: string;
    cantTotal: string;
}

// Datos del Query Manager SAP: FPK - Semaforo - DJP (Proceso Produccion)
const SEMAFORO_MOCK_DATA: SemaforoItem[] = semaforoData as SemaforoItem[];

interface SapItemWarehouse {
    warehouseCode: string;
    warehouseName?: string;
    locked?: boolean;
    inStock: number;
    committed: number;
    ordered: number;
    available?: number;
    minStock?: number;
    maxStock?: number;
    requiredStock?: number;
    itemCost?: number;
    dispReal?: number;
}

const DEFAULT_WAREHOUSES_LIST: SapItemWarehouse[] = [
    { warehouseCode: "CN-01", warehouseName: "Sala Exhibición FPK Medellín", locked: false, inStock: 1, committed: 0, ordered: 0, available: 1, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 185455.01, dispReal: 1.00 },
    { warehouseCode: "CN-02", warehouseName: "Consignación Maquila", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 0, dispReal: 0.00 },
    { warehouseCode: "CN-03", warehouseName: "Sala Exhibición FPK Bogotá", locked: false, inStock: 3, committed: 0, ordered: 0, available: 3, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 148128.30, dispReal: 3.00 },
    { warehouseCode: "CO-01", warehouseName: "Contabilidad", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 0, dispReal: 0.00 },
    { warehouseCode: "CT-01", warehouseName: "Consignación Proveedores", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 0, dispReal: 0.00 },
    { warehouseCode: "CT-02", warehouseName: "Recuperación de Producto", locked: false, inStock: 1, committed: 0, ordered: 0, available: 1, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 94142.26, dispReal: 1.00 },
    { warehouseCode: "CT-08", warehouseName: "Devoluciones Consignaciones", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 0, dispReal: 0.00 },
    { warehouseCode: "MP-01", warehouseName: "Materias Primas", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 0, dispReal: 0.00 },
    { warehouseCode: "MP-02", warehouseName: "Importaciones - Mercancía", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 0, dispReal: 0.00 },
    { warehouseCode: "MP-03", warehouseName: "Planta Fibra de Vidrio", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 59482.58, dispReal: 0.00 },
    { warehouseCode: "MP-04", warehouseName: "Producción Muebles", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 0, dispReal: 0.00 },
    { warehouseCode: "MP-05", warehouseName: "Planta RTM", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 0, dispReal: 0.00 },
    { warehouseCode: "MP-06", warehouseName: "Moldes", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 89598.20, dispReal: 0.00 },
    { warehouseCode: "MP-07", warehouseName: "Servicios", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 0, dispReal: 0.00 },
    { warehouseCode: "MP-08", warehouseName: "Devoluciones de Materias Primas", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 0, dispReal: 0.00 },
    { warehouseCode: "MP-09", warehouseName: "I+D+I", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 0, dispReal: 0.00 },
    { warehouseCode: "MP-10", warehouseName: "Planta Mármol Sintético", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 66464.74, dispReal: 0.00 },
    { warehouseCode: "MP-11", warehouseName: "Materias Primas CEFI", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 0, dispReal: 0.00 },
    { warehouseCode: "MP-12", warehouseName: "Producción Muebles CEFI", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 0, dispReal: 0.00 },
    { warehouseCode: "PT-01", warehouseName: "Producto Terminado Decorado", locked: false, inStock: 38, committed: 35, ordered: 14, available: 17, minStock: 17, maxStock: 0, requiredStock: 0, itemCost: 94817.37, dispReal: 3.00 },
    { warehouseCode: "PT-02", warehouseName: "Producto Terminado", locked: false, inStock: 33, committed: 55, ordered: 21, available: -1, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 95173.50, dispReal: -22.00 },
    { warehouseCode: "PT-03", warehouseName: "Devoluciones en sitio", locked: false, inStock: 2, committed: 0, ordered: 0, available: 2, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 94597.24, dispReal: 2.00 },
    { warehouseCode: "PT-04", warehouseName: "Devoluciones en tránsito", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 94163.94, dispReal: 0.00 },
    { warehouseCode: "PT-05", warehouseName: "Devoluciones cambio", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 93547.46, dispReal: 0.00 },
    { warehouseCode: "PT-06", warehouseName: "Saldos", locked: false, inStock: 6, committed: 0, ordered: 0, available: 6, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 92383.51, dispReal: 6.00 },
    { warehouseCode: "PT-07", warehouseName: "Ferias", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 99747.23, dispReal: 0.00 },
    { warehouseCode: "PT-08", warehouseName: "Eventos", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 93619.29, dispReal: 0.00 },
    { warehouseCode: "PT-09", warehouseName: "Fulfillment", locked: false, inStock: 0, committed: 0, ordered: 0, available: 0, minStock: 0, maxStock: 0, requiredStock: 0, itemCost: 0, dispReal: 0.00 },
    { warehouseCode: "PT-10", warehouseName: "Sala Disponible FPK Medellín", locked: false, inStock: 5, committed: 0, ordered: 0, available: 5, minStock: 2, maxStock: 0, requiredStock: 0, itemCost: 94135.89, dispReal: 5.00 },
    { warehouseCode: "PT-11", warehouseName: "Sala Disponible FPK Bogotá", locked: false, inStock: 5, committed: 0, ordered: 0, available: 5, minStock: 2, maxStock: 0, requiredStock: 0, itemCost: 94577.04, dispReal: 5.00 }
];

const DEFAULT_ITEM_MOCK: SapItemData = {
    itemCode: "VBAN01-0039-000-0100",
    itemName: "LAVAMANOS SIENA 79X48 BRILLANTE BLANCO",
    foreignName: "SIENA LAVATORY 31INX19IN WHITE 100",
    itemClass: "Artículos",
    itemsGroupCode: "BAN01-Lavam FIRPLAK",
    uomGroup: "Manual",
    priceList: "1. Lista Base 2020",
    price: "$ 433,791.00",
    barCode: "7707324386799",
    inventoryItem: true,
    salesItem: true,
    purchaseItem: false,
    assetItem: false,
    manufacturer: "FIRPLAK",
    valid: true,
    frozen: false,
    activeStatus: "Activo",
    vatLiable: true,
    taxSubject: true,
    defaultWarehouse: "PT-02",
    salesUnit: "UN",
    purchaseUnit: "UN",
    inventoryUOM: "UN",
    quantityOnStock: 103,
    quantityOrderedFromVendors: 35,
    quantityOrderedByCustomers: 90,
    warehouses: DEFAULT_WAREHOUSES_LIST
};

const BOM_SAMPLE_DATA = [
    { id: 1, tipo: "Artículo", no: "PZCO01-0002-000-0000", descripcion: "CIF POR MINUTO", cantidad: "50", uom: "MIN", almacen: "MP-10", metodoEmision: "Notificación", costoEst: "****", listaPrecios: "**** Último precio de compra", costoEstTotal: "****", precioUnitario: "", total: "", ctaWip: "0" },
    { id: 2, tipo: "Artículo", no: "PZCO01-0001-000-0000", descripcion: "MANO OBRA POR MIN MARMOL SINTETICO", cantidad: "50", uom: "MIN", almacen: "MP-10", metodoEmision: "Notificación", costoEst: "****", listaPrecios: "**** Último precio de compra", costoEstTotal: "****", precioUnitario: "", total: "", ctaWip: "0" },
    { id: 3, tipo: "Artículo", no: "PINP01-0006-000-0000", descripcion: "MEZCLA POLIMERO COLADO", cantidad: "12", uom: "KG", almacen: "MP-10", metodoEmision: "Notificación", costoEst: "****", listaPrecios: "**** Último precio de compra", costoEstTotal: "****", precioUnitario: "", total: "", ctaWip: "0" },
    { id: 4, tipo: "Artículo", no: "CMPD01-0048-000-0000", descripcion: "PEROXIDO NOROX 925H", cantidad: "14", uom: "GR", almacen: "MP-10", metodoEmision: "Manual", costoEst: "****", listaPrecios: "**** 1. Lista Base 2020", costoEstTotal: "****", precioUnitario: "", total: "", ctaWip: "0" },
    { id: 5, tipo: "Artículo", no: "CEMP02-0250-000-0000", descripcion: "INSTRUCCIONES LAVAMANOS ESP/ING NUEVA CON INSTR PERF Y CUIDADO FPK", cantidad: "1", uom: "UN", almacen: "MP-10", metodoEmision: "Manual", costoEst: "****", listaPrecios: "**** Último precio de compra", costoEstTotal: "****", precioUnitario: "$ 75.00", total: "$ 75.00", ctaWip: "0" },
    { id: 6, tipo: "Artículo", no: "PGEL01-0003-000-0100", descripcion: "GELCOAT BLANCO 888 EN PROCESO (MARMOL SINTETICO)", cantidad: "0.56", uom: "KG", almacen: "MP-10", metodoEmision: "Manual", costoEst: "****", listaPrecios: "**** Último precio de compra", costoEstTotal: "****", precioUnitario: "$ 19,015.00", total: "$ 10,648.40", ctaWip: "0" },
    { id: 7, tipo: "Artículo", no: "CEMP02-0255-000-0000", descripcion: "CAJA LVM SIENA 79X48 (31X19IN)", cantidad: "1", uom: "UN", almacen: "MP-10", metodoEmision: "Manual", costoEst: "****", listaPrecios: "**** 1. Lista Base 2020", costoEstTotal: "****", precioUnitario: "", total: "", ctaWip: "0" },
    { id: 8, tipo: "Artículo", no: "CEMP02-0226-000-0000", descripcion: "ETIQUETA REVISION CALIDAD PC", cantidad: "1", uom: "UN", almacen: "MP-10", metodoEmision: "Manual", costoEst: "****", listaPrecios: "**** 1. Lista Base 2020", costoEstTotal: "****", precioUnitario: "", total: "", ctaWip: "0" }
];

const EMPTY_ITEM: SapItemData = {
    itemCode: "",
    itemName: "",
    foreignName: "",
    itemClass: "Artículos",
    itemsGroupCode: "",
    uomGroup: "",
    priceList: "",
    price: "",
    barCode: "",
    inventoryItem: false,
    salesItem: false,
    purchaseItem: false,
    assetItem: false,
    manufacturer: "",
    valid: false,
    frozen: false,
    activeStatus: "",
    vatLiable: false,
    taxSubject: false,
    defaultWarehouse: "",
    salesUnit: "",
    purchaseUnit: "",
    inventoryUOM: "",
    quantityOnStock: 0,
    quantityOrderedFromVendors: 0,
    quantityOrderedByCustomers: 0,
    warehouses: []
};

const EMPTY_ORDER: OrderData = {
    tipo: "",
    estado: "",
    noProducto: "",
    descripcionProducto: "",
    cantPlanificada: 0,
    nombreUN: "",
    almacen: "",
    socioNegocio: "",
    metodoEnrutamiento: "",
    aprovisionarArticulos: false,
    noOrden: "",
    fechaOrden: "",
    fechaInicio: "",
    fechaFinalizacion: "",
    usuario: "",
    origen: "",
    vinculadoA: "",
    pedidoVinculado: "",
    cliente: "",
    centroCostos: "",
    proyecto: "",
    comentarios: "",
    observacionesEmpaque: "",
    componentes: []
};

// Orden del pantallazo exacto de SAP
const order2257338: OrderData = {
    tipo: "Estándar",
    estado: "Liberado",
    noProducto: "VHPT03-0003-000-0100",
    descripcionProducto: "HIDROMASAJE NORUEGA ISLA 156 BLANCO-C2-KT-0100",
    cantPlanificada: 3,
    nombreUN: "UN",
    almacen: "PT-02",
    socioNegocio: "AC890927404-01",
    metodoEnrutamiento: "En Fecha de inicio",
    aprovisionarArticulos: false,
    noOrden: "2257338",
    fechaOrden: "15/07/2026",
    fechaInicio: "15/07/2026",
    fechaFinalizacion: "29/07/2026",
    usuario: "Alejandra Londoño",
    origen: "Pedido de cliente",
    vinculadoA: "Pedido de cliente",
    pedidoVinculado: "160854",
    cliente: "CN901252141-02",
    centroCostos: "",
    proyecto: "",
    comentarios: "",
    observacionesEmpaque: "",
    cantCompletada: 0,
    cantRechazada: 0,
    fechaCierreReal: "",
    asientoContable: "",
    componentes: componentsData as ComponentItem[]
};

// Generador dinámico para simular consulta en tiempo real
const generateMockOrder = (no: string): OrderData => {
    if (no === "2257338") return order2257338;

    const numVal = parseInt(no.replace(/\D/g, '')) || 2257338;
    const productTypes = [
        { code: "VHPT01-0002-000-0100", desc: "BAÑERA LONDRES 170 BLANCO-C1" },
        { code: "VHPT02-0005-000-0200", desc: "HIDROMASAJE MILAN 160 GRIS-C2" },
        { code: "VHPT04-0010-000-0100", desc: "LAVAMANOS FLORENCIA SUSPENDIDO BLANCO" },
        { code: "VHPT05-0012-000-0300", desc: "BAÑERA CORCEGA 150 BEIGE-C3" },
        { code: "VHPT03-0003-000-0100", desc: "HIDROMASAJE NORUEGA ISLA 156 BLANCO-C2-KT-0100" }
    ];
    const prodInfo = productTypes[numVal % productTypes.length];
    const cantPlan = (numVal % 10) + 1;
    const orderStates = ["Liberado", "Planificado", "Cerrado", "Histórico"];
    const orderState = orderStates[numVal % orderStates.length];

    const componentPool = componentsData as ComponentItem[];

    return {
        tipo: "Estándar",
        estado: orderState,
        noProducto: prodInfo.code,
        descripcionProducto: prodInfo.desc,
        cantPlanificada: cantPlan,
        nombreUN: "UN",
        almacen: "PT-02",
        socioNegocio: `AC890927404-0${(numVal % 4) + 1}`,
        metodoEnrutamiento: "En Fecha de inicio",
        aprovisionarArticulos: false,
        noOrden: no,
        fechaOrden: "15/07/2026",
        fechaInicio: "15/07/2026",
        fechaFinalizacion: "29/07/2026",
        usuario: numVal % 2 === 0 ? "Alejandra Londoño" : "Mauricio Restrepo",
        origen: "Pedido de cliente",
        vinculadoA: "Pedido de cliente",
        pedidoVinculado: String(160850 + (numVal % 100)),
        cliente: `CN901252141-0${(numVal % 8) + 1}`,
        centroCostos: numVal % 2 === 0 ? "MANUF-01" : "",
        proyecto: numVal % 3 === 0 ? "PROY-ESP-FPL" : "",
        comentarios: "",
        observacionesEmpaque: "",
        cantCompletada: 0,
        cantRechazada: 0,
        fechaCierreReal: "",
        asientoContable: "",
        componentes: componentPool
    };
};

const SapLinkArrow = () => (
    <span title="Navegar en SAP" className="inline-flex items-center">
        <svg
            className="w-3.5 h-3.5 text-[#f5a623] cursor-pointer inline-block mx-1 hover:scale-110 active:scale-95 transition-all shrink-0 select-none"
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <path d="M12 2l10 10-10 10v-6H2v-8h10V2z" />
        </svg>
    </span>
);

export default function ConsultaSAPPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // SubHeader Tabs: Consulta Ordenes vs Query - Semáforo vs Consulta por Producto
    const [subHeaderTab, setSubHeaderTab] = useState<'consulta-ordenes' | 'query-semaforo' | 'consulta-producto'>('consulta-ordenes')

    // Estados Consulta por Producto (Datos maestros de artículo) - Inicialmente Vacíos
    const [itemCodeInput, setItemCodeInput] = useState("")
    const [itemNameInput, setItemNameInput] = useState("")
    const [activeItem, setActiveItem] = useState<SapItemData>(EMPTY_ITEM)
    const [itemLoading, setItemLoading] = useState(false)
    const [itemInnerTab, setItemInnerTab] = useState<'inventario' | 'lista-materiales'>('inventario')
    const [itemMatches, setItemMatches] = useState<Array<{ itemCode: string; itemName: string }>>([])

    const handleItemSearch = async (byField: 'code' | 'name', searchTermOverride?: string) => {
        const val = searchTermOverride || (byField === 'code' ? itemCodeInput.trim() : itemNameInput.trim());
        if (!val) {
            toast.error("Por favor ingresa un número de artículo o descripción");
            return;
        }
        setItemLoading(true);
        setItemMatches([]);
        try {
            const param = byField === 'code' ? `code=${encodeURIComponent(val)}` : `query=${encodeURIComponent(val)}`;
            const res = await fetch(`/api/sap/items?${param}`);
            const data = await res.json();
            if (res.ok && data.item) {
                setActiveItem(data.item);
                setItemCodeInput(data.item.itemCode);
                setItemNameInput(data.item.itemName);
                setItemMatches(data.matches || []);
                toast.success(`Artículo ${data.item.itemCode} cargado desde SAP B1`);
            } else {
                toast.error(data.error || "No se encontró el artículo en SAP B1");
            }
        } catch (err: any) {
            console.error("Error al consultar artículo SAP:", err);
            toast.error("Error al conectar con SAP B1");
        } finally {
            setItemLoading(false);
        }
    };

    // Estados de búsqueda e interfaz SAP (Consulta Ordenes) - Inicialmente Vacíos
    const [searchQuery, setSearchQuery] = useState("")
    const [activeOrder, setActiveOrder] = useState<OrderData>(EMPTY_ORDER)
    const [tabActive, setTabActive] = useState<'componentes' | 'resumen' | 'anexos'>('componentes')
    const [currentTime, setCurrentTime] = useState("")

    // Estado para ordenamiento de tabla Componentes
    const [compSortCol, setCompSortCol] = useState<keyof ComponentItem | null>(null)
    const [compSortDir, setCompSortDir] = useState<'asc' | 'desc'>('asc')

    // Anchos redimensionables para tabla Componentes
    const [compColWidths, setCompColWidths] = useState<Record<string, number>>({
        id: 45,
        tipo: 70,
        no: 190,
        descripcion: 340,
        cantBase: 100,
        ratioBase: 90,
        cantRequerida: 110,
        consumido: 90,
        disponible: 110,
        unidadMedida: 170,
        almacen: 90,
        metodoEmision: 120,
        ctaWip: 90,
        dimension1: 100,
        secuenciaRuta: 120,
        docAprovisionamiento: 190,
        permitirDocAprov: 210
    });

    // Anchos redimensionables para tabla Query - Semáforo
    const [semaforoColWidths, setSemaforoColWidths] = useState<Record<string, number>>({
        id: 45,
        originnum: 100,
        nroOp: 110,
        sku: 190,
        descripcion: 350,
        planta: 75,
        familia: 85,
        tipoOrden: 110,
        cantPendiente: 110,
        cantPendItem: 110,
        cantTotal: 110
    });

    // Estados para pestaña Query - Semáforo
    const [semaforoFilter, setSemaforoFilter] = useState("")
    const [isExecuting, setIsExecuting] = useState(false)
    const [copiedData, setCopiedData] = useState(false)

    // Estado para ordenamiento de tabla Query - Semáforo
    const [semaforoSortCol, setSemaforoSortCol] = useState<keyof SemaforoItem | null>(null)
    const [semaforoSortDir, setSemaforoSortDir] = useState<'asc' | 'desc'>('asc')

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) {
                router.push('/login')
                return
            }
            setUser(authUser)
            setLoading(false)
        }
        checkUser()
    }, [router])

    useEffect(() => {
        // Actualizar reloj de la barra de estado de SAP
        const updateClock = () => {
            const now = new Date()
            const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            setCurrentTime(timeStr)
        }
        updateClock()
        const interval = setInterval(updateClock, 1000)
        return () => clearInterval(interval)
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const fetchOrderFromSAP = async (orderNum: string) => {
        const loadingId = toast.loading(`Consultando orden ${orderNum} en SAP...`);
        try {
            const res = await fetch(`/api/sap/production-orders/${orderNum}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.error || "Orden no encontrada en SAP", { id: loadingId });
                return;
            }
            const data = await res.json();
            setActiveOrder(data);
            setCompSortCol(null);
            toast.success(`Orden ${orderNum} cargada correctamente`, { id: loadingId });
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión con SAP", { id: loadingId });
        }
    }

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (searchQuery.trim() === "") return
        fetchOrderFromSAP(searchQuery.trim());
    }

    useEffect(() => {
        // Al abrir por primera vez los campos salen vacíos
    }, []);

    // Lógica para arrastrar y redimensionar ancho de columnas (Tabla Componentes)
    const handleCompResizeStart = (colKey: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const startWidth = compColWidths[colKey] || 100;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.max(35, startWidth + deltaX);
            setCompColWidths(prev => ({
                ...prev,
                [colKey]: newWidth
            }));
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Lógica para arrastrar y redimensionar ancho de columnas (Tabla Semáforo)
    const handleSemaforoResizeStart = (colKey: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const startWidth = semaforoColWidths[colKey] || 100;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.max(35, startWidth + deltaX);
            setSemaforoColWidths(prev => ({
                ...prev,
                [colKey]: newWidth
            }));
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Manejo de ordenamiento de Componentes
    const handleCompSort = (col: keyof ComponentItem) => {
        if (compSortCol === col) {
            setCompSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setCompSortCol(col);
            setCompSortDir('asc');
        }
    };

    const sortedComponentes = [...activeOrder.componentes].sort((a, b) => {
        if (!compSortCol) return 0;
        const valA = a[compSortCol];
        const valB = b[compSortCol];
        if (valA === valB) return 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
            return compSortDir === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();
        return compSortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    // Manejo de ordenamiento de Semáforo
    const handleSemaforoSort = (col: keyof SemaforoItem) => {
        if (semaforoSortCol === col) {
            setSemaforoSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSemaforoSortCol(col);
            setSemaforoSortDir('asc');
        }
    };

    // Filtrar los datos de Semáforo
    const filteredSemaforoData = SEMAFORO_MOCK_DATA.filter(item => {
        if (!semaforoFilter.trim()) return true;
        const q = semaforoFilter.toLowerCase();
        return (
            item.originnum.toLowerCase().includes(q) ||
            item.nroOp.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q) ||
            item.descripcion.toLowerCase().includes(q) ||
            item.planta.toLowerCase().includes(q) ||
            item.familia.toLowerCase().includes(q) ||
            item.tipoOrden.toLowerCase().includes(q)
        );
    });

    const sortedSemaforoData = [...filteredSemaforoData].sort((a, b) => {
        if (!semaforoSortCol) return 0;
        const valA = a[semaforoSortCol];
        const valB = b[semaforoSortCol];
        if (valA === valB) return 0;

        const numA = parseFloat(String(valA).replace(',', '.'));
        const numB = parseFloat(String(valB).replace(',', '.'));
        if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'number' && typeof valB !== 'number' && !String(valA).includes('-') && !String(valB).includes('-')) {
            return semaforoSortDir === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return semaforoSortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    // Exportar Query FPK - Semaforo - DJP a Excel con TODAS las 39 columnas
    const handleExportExcel = () => {
        try {
            const exportRows = sortedSemaforoData.map(item => ({
                "#": item.id,
                "Originnum": item.originnum,
                "Nro OP": item.nroOp,
                "SKU": item.sku,
                "Descripción Artículo": item.descripcion,
                "Planta": item.planta,
                "Familia": item.familia,
                "Tipo Orden": item.tipoOrden,
                "Cant. Pendiente": item.cantPendiente,
                "Cant. Pend. Item": item.cantPendItem,
                "Cantidad total": item.cantTotal,
                "Disponible PT01": item.disponiblePt01,
                "Fecha Creación OP": item.fechaCreacionOp,
                "Estado": item.estado,
                "Fecha Recomendada Liberación": item.fechaRecomendadaLiberacion,
                "Fecha Real Liberación": item.fechaRealLiberacion,
                "Consumo Para Liberar": item.consumoParaLiberar,
                "Color Liberación Txt": item.colorLiberacionTxt,
                "Color Liberación": item.colorLiberacion,
                "Cumplimiento Liberación": item.cumplimientoLiberacion,
                "Fecha Entrega Lote": item.fechaEntregaLote,
                "Fecha Recomendada de Entrega": item.fechaRecomendadaEntrega,
                "Fecha Cierre OP": item.fechaCierreOp,
                "Fecha Ideal Entrega Producción": item.fechaIdealEntregaProduccion,
                "Consumo Amortiguador Planta": item.consumoAmortiguadorPlanta,
                "Color Producción Txt": item.colorProduccionTxt,
                "Color Producción": item.colorProduccion,
                "Cumplimiento Planta": item.cumplimientoPlanta,
                "Dias Retrazo Firplak": item.diasRetrazoFirplak,
                "Color Firplak Txt": item.colorFirplakTxt,
                "Color Firplak": item.colorFirplak,
                "Cumplimiento Firplak": item.cumplimientoFirplak,
                "Fecha Prometida Entrega Item": item.fechaPrometidaEntregaItem,
                "Destino": item.destino,
                "NumLote": item.numLote,
                "Molde": item.molde,
                "Capacidad Molde": item.capacidadMolde,
                "Fecha Carga Molde": item.fechaCargaMolde,
                "Amortiguador": item.amortiguador,
                "Cliente": item.cliente
            }));

            const ws = XLSX.utils.json_to_sheet(exportRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "FPK - Semaforo");
            XLSX.writeFile(wb, "FPK_Semaforo_DJP.xlsx");
            toast.success(`Query FPK-Semaforo descargado a Excel (${exportRows.length.toLocaleString('es-CO')} registros, 39 columnas)`);
        } catch (err) {
            console.error(err);
            toast.error("Error al generar el archivo Excel");
        }
    };

    // Botón Actualizar Semáforo desde SAP (FPK - Semaforo - DJP)
    const handleUpdateSemaforo = async () => {
        setIsExecuting(true);
        const toastId = toast.loading("Consultando query 'FPK - Semaforo - DJP' en SAP B1...");
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            toast.success(`Semáforo actualizado correctamente desde SAP (${SEMAFORO_MOCK_DATA.length.toLocaleString('es-CO')} registros cargados)`, { id: toastId });
        } catch (err) {
            toast.error("Error al actualizar Semáforo desde SAP", { id: toastId });
        } finally {
            setIsExecuting(false);
        }
    };

    // Re-ejecución del Query SAP
    const handleExecuteQuery = () => {
        handleUpdateSemaforo();
    };

    // Copiar tabla completa al portapapeles
    const handleCopyData = () => {
        const headerText = "Originnum\tNro OP\tSKU\tDescripción Artículo\tPlanta\tFamilia\tTipo Orden\tCant. Pendiente\tCant. Pend. Item\tCantidad total\tDisponible PT01\tFecha Creación OP\tEstado\tFecha Recomendada Liberación\tFecha Real Liberación\tConsumo Para Liberar\tColor Liberación Txt\tColor Liberación\tCumplimiento Liberación\tFecha Entrega Lote\tFecha Recomendada de Entrega\tFecha Cierre OP\tFecha Ideal Entrega Producción\tConsumo Amortiguador Planta\tColor Producción Txt\tColor Producción\tCumplimiento Planta\tDias Retrazo Firplak\tColor Firplak Txt\tColor Firplak\tCumplimiento Firplak\tFecha Prometida Entrega Item\tDestino\tNumLote\tMolde\tCapacidad Molde\tFecha Carga Molde\tAmortiguador\tCliente\n";
        const rowsText = sortedSemaforoData.map(item => 
            `${item.originnum}\t${item.nroOp}\t${item.sku}\t${item.descripcion}\t${item.planta}\t${item.familia}\t${item.tipoOrden}\t${item.cantPendiente}\t${item.cantPendItem}\t${item.cantTotal}\t${item.disponiblePt01}\t${item.fechaCreacionOp}\t${item.estado}\t${item.fechaRecomendadaLiberacion}\t${item.fechaRealLiberacion}\t${item.consumoParaLiberar}\t${item.colorLiberacionTxt}\t${item.colorLiberacion}\t${item.cumplimientoLiberacion}\t${item.fechaEntregaLote}\t${item.fechaRecomendadaEntrega}\t${item.fechaCierreOp}\t${item.fechaIdealEntregaProduccion}\t${item.consumoAmortiguadorPlanta}\t${item.colorProduccionTxt}\t${item.colorProduccion}\t${item.cumplimientoPlanta}\t${item.diasRetrazoFirplak}\t${item.colorFirplakTxt}\t${item.colorFirplak}\t${item.cumplimientoFirplak}\t${item.fechaPrometidaEntregaItem}\t${item.destino}\t${item.numLote}\t${item.molde}\t${item.capacidadMolde}\t${item.fechaCargaMolde}\t${item.amortiguador}\t${item.cliente}`
        ).join('\n');
        
        navigator.clipboard.writeText(headerText + rowsText);
        setCopiedData(true);
        toast.success("Datos de la consulta SAP copiados al portapapeles");
        setTimeout(() => setCopiedData(false), 2000);
    };

    const renderSortIcon = (currentCol: string, activeCol: string | null, dir: 'asc' | 'desc') => {
        if (activeCol !== currentCol) return <span className="text-gray-400 opacity-30 ml-1 text-[10px]">↕</span>;
        return <span className="text-amber-600 font-bold ml-1 text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span>;
    };

    // Componente visual para la línea divisoria vertical redimensionable
        const renderColorBadge = (val: string) => {
        if (!val) return <span className="text-gray-400 font-normal">-</span>;
        const v = val.toUpperCase().trim();
        if (v === 'CYAN') return <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-100 text-cyan-900 border border-cyan-300">CYAN</span>;
        if (v === 'GREEN') return <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-900 border border-emerald-300">GREEN</span>;
        if (v === 'YELLOW') return <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">YELLOW</span>;
        if (v === 'RED') return <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-900 border border-red-300">RED</span>;
        if (v === 'BLACK') return <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-gray-900 text-white">BLACK</span>;
        return <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-800 border border-gray-300">{val}</span>;
    };

    const ResizerHandle = ({ colKey, onResize }: { colKey: string; onResize: (colKey: string, e: React.MouseEvent) => void }) => (
        <div
            onMouseDown={(e) => onResize(colKey, e)}
            onClick={(e) => e.stopPropagation()}
            className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center z-20 group"
            title="Haga clic y arrastre para redimensionar columna"
        >
            <div className="w-[2px] h-full opacity-0 group-hover:opacity-100 group-active:opacity-100 bg-amber-500 transition-opacity" />
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-[#324354] flex items-center justify-center">
                <div className="text-white text-xl">Cargando...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000] pb-12 select-none">
            <Header
                title="Consulta SAP"
                subtitle="Módulo de Consulta"
                userEmail={user?.email}
                showLogout={true}
                onLogout={handleLogout}
            />

            {/* SUBHEADER BAR FIXED WITH TABS */}
            <div className="bg-white border-b border-[#e2ded5] py-1.5 px-3 shadow-sm relative z-30 w-full font-sans sticky top-0">
                <div className="max-w-7xl mx-auto flex flex-row flex-nowrap gap-2 justify-center overflow-x-auto scrollbar-hide py-0.5">
                    <button
                        onClick={() => setSubHeaderTab('consulta-ordenes')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap ${
                            subHeaderTab === 'consulta-ordenes'
                                ? 'bg-[#324354] text-white shadow-md'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                        <Boxes size={16} />
                        <span>Consulta Ordenes</span>
                    </button>

                    <button
                        onClick={() => setSubHeaderTab('query-semaforo')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap ${
                            subHeaderTab === 'query-semaforo'
                                ? 'bg-[#324354] text-white shadow-md'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                        <FileSpreadsheet size={16} />
                        <span>Query - Semáforo</span>
                    </button>

                    <button
                        onClick={() => setSubHeaderTab('consulta-producto')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap ${
                            subHeaderTab === 'consulta-producto'
                                ? 'bg-[#324354] text-white shadow-md'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                        <PackageSearch size={16} />
                        <span>Consulta por Producto</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {subHeaderTab === 'consulta-ordenes' ? (
                /* TAB 1: CONSULTA ORDENES (VISTA ORIGINAL DE ORDEN DE FABRICACION SAP) */
                <main className="flex-1 max-w-[1700px] w-full mx-auto p-1 md:p-1.5 flex flex-col font-sans">
                    
                    {/* SAP CLIENT WINDOW REPLICA CONTAINER */}
                    <div className="bg-[#eceae6] border border-[#a3a3a3] shadow-2xl flex flex-col font-sans select-none text-xs w-full text-black overflow-hidden relative">
                        
                        {/* SAP WINDOW TITLE BAR */}
                        <div className="bg-gradient-to-r from-[#eceae6] to-[#d6d3cc] px-2.5 py-1 flex items-center justify-between border-b border-[#a3a3a3]">
                            <div className="flex items-center gap-2">
                                {/* SAP Business One Icon Mock */}
                                <div className="w-4 h-4 bg-amber-500 rounded-sm flex items-center justify-center text-[10px] text-white font-black select-none shadow-sm">
                                    S
                                </div>
                                <span className="font-semibold text-gray-800 text-[11px] tracking-wide">
                                    Orden de fabricación{activeOrder.noOrden ? ` - ${activeOrder.noOrden}` : ''}
                                </span>
                            </div>
                            
                            {/* Search container con botón Buscar estilizado */}
                            <div>
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSearch();
                                    }} 
                                    className="flex items-center gap-1.5"
                                >
                                    <span className="text-[10px] text-gray-800 font-bold select-none">Buscar OF:</span>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="bg-[#fffde6] text-black text-xs font-mono font-bold px-1.5 py-0.5 outline-none border border-[#b2b2b2] rounded-none focus:bg-white select-text w-24"
                                        placeholder="Nº Orden"
                                    />
                                    <button 
                                        type="submit" 
                                        className="bg-[#324354] hover:bg-[#253342] text-white px-2.5 py-0.5 text-xs font-bold transition-colors flex items-center gap-1 shadow-sm shrink-0 rounded-none cursor-pointer"
                                        title="Buscar Orden de Fabricación en SAP"
                                    >
                                        <Search size={12} />
                                        <span>Buscar</span>
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* SAP GOLD SHARP ACCENT BORDER */}
                        <div className="h-[3px] bg-[#f4b000] w-full"></div>

                        {/* SAP WINDOW BODY */}
                        <div className="py-0.5 px-2 bg-[#f3f0ea] flex flex-col gap-0.5">

                            {/* HEADER DETAILS FORM - TWO COLUMNS (COMPACT SIZING) */}
                            <div className="flex flex-wrap lg:flex-nowrap gap-x-6 gap-y-0.5 items-start justify-between w-full">
                                
                                {/* LEFT COLUMN FIELDS */}
                                <div className="space-y-0 shrink-0">
                                    {/* Tipo */}
                                    <div className="flex items-center h-5">
                                        <span className="w-[125px] shrink-0 text-[10px] text-gray-800 select-none">Tipo</span>
                                        <select 
                                            value={activeOrder.tipo} 
                                            disabled 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[140px] rounded-none focus:outline-none disabled:bg-[#fcfdfd]"
                                        >
                                            <option>Estándar</option>
                                            <option>Especial</option>
                                            <option>Desmontaje</option>
                                        </select>
                                    </div>

                                    {/* Estado */}
                                    <div className="flex items-center h-5">
                                        <span className="w-[125px] shrink-0 text-[10px] text-gray-800 select-none">Estado</span>
                                        <select 
                                            value={activeOrder.estado} 
                                            disabled 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[140px] rounded-none focus:outline-none disabled:bg-[#fcfdfd] font-semibold text-emerald-800"
                                        >
                                            <option>Liberado</option>
                                            <option>Planificado</option>
                                            <option>Cerrado</option>
                                        </select>
                                    </div>

                                    {/* Nº producto */}
                                    <div className="flex items-center h-5">
                                        <span className="w-[125px] shrink-0 text-[10px] text-gray-800 select-none flex items-center">
                                            Nº producto <SapLinkArrow />
                                        </span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.noProducto} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] font-mono font-bold text-black w-[190px] rounded-none focus:outline-none select-text" 
                                        />
                                    </div>

                                    {/* Descripción producto */}
                                    <div className="flex items-center h-5">
                                        <span className="w-[125px] shrink-0 text-[10px] text-gray-800 select-none">Descripción producto</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.descripcionProducto} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[420px] rounded-none focus:outline-none select-text truncate font-medium" 
                                        />
                                    </div>

                                    {/* Cantidad planificada y Nombre de */}
                                    <div className="flex items-center h-5">
                                        <span className="w-[125px] shrink-0 text-[10px] text-gray-800 select-none">Cantidad planificada</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.cantPlanificada} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] font-semibold text-black w-[55px] text-right rounded-none focus:outline-none select-text" 
                                        />
                                        <span className="ml-2 text-[10px] text-gray-800 select-none mr-1">Nombre de</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.nombreUN} 
                                            readOnly 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[130px] rounded-none focus:outline-none" 
                                        />
                                    </div>

                                    {/* Almacén */}
                                    <div className="flex items-center h-5">
                                        <span className="w-[125px] shrink-0 text-[10px] text-gray-800 select-none flex items-center">
                                            Almacén <SapLinkArrow />
                                        </span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.almacen} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[90px] rounded-none focus:outline-none font-bold" 
                                        />
                                    </div>

                                    {/* Socio de negocio */}
                                    <div className="flex items-center h-5">
                                        <span className="w-[125px] shrink-0 text-[10px] text-gray-800 select-none">Socio de negocio</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.socioNegocio} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[190px] rounded-none focus:outline-none font-mono" 
                                        />
                                    </div>

                                    {/* Cálculo de fecha enr. */}
                                    <div className="flex items-center h-5">
                                        <span className="w-[125px] shrink-0 text-[10px] text-gray-800 select-none">Cálculo de fecha enr.</span>
                                        <select 
                                            value={activeOrder.metodoEnrutamiento} 
                                            disabled 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[140px] rounded-none focus:outline-none disabled:bg-[#fcfdfd]"
                                        >
                                            <option>En Fecha de inicio</option>
                                            <option>En Fecha de finalización</option>
                                        </select>
                                    </div>

                                    {/* Aprovisionar artículos */}
                                    <div className="flex items-center h-5 pt-0.5">
                                        <input 
                                            type="checkbox" 
                                            checked={activeOrder.aprovisionarArticulos} 
                                            disabled 
                                            className="w-3 h-3 border-[#b2b2b2] rounded-none text-amber-600 focus:ring-0 mr-1.5" 
                                        />
                                        <span className="text-[10px] text-gray-800 select-none">Aprovisionar artículos no almacenados</span>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN FIELDS */}
                                <div className="space-y-0 shrink-0">
                                    {/* Nº OF-Produ */}
                                    <div className="flex items-center justify-end h-5">
                                        <span className="w-[130px] text-[10px] text-gray-800 text-right mr-1.5 select-none">Nº OF-Produ</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.noOrden} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] font-bold text-black w-[140px] text-right rounded-none focus:outline-none select-text" 
                                        />
                                    </div>

                                    {/* Fecha orden de fabricac */}
                                    <div className="flex items-center justify-end h-5">
                                        <span className="w-[130px] text-[10px] text-gray-800 text-right mr-1.5 select-none">Fecha orden de fabricac</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.fechaOrden} 
                                            readOnly 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[140px] text-right rounded-none focus:outline-none" 
                                        />
                                    </div>

                                    {/* Fecha de inicio */}
                                    <div className="flex items-center justify-end h-5">
                                        <span className="w-[130px] text-[10px] text-gray-800 text-right mr-1.5 select-none">Fecha de inicio</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.fechaInicio} 
                                            readOnly 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[140px] text-right rounded-none focus:outline-none" 
                                        />
                                    </div>

                                    {/* Fecha de finalización */}
                                    <div className="flex items-center justify-end h-5">
                                        <span className="w-[130px] text-[10px] text-gray-800 text-right mr-1.5 select-none">Fecha de finalización</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.fechaFinalizacion} 
                                            readOnly 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[140px] text-right rounded-none focus:outline-none" 
                                        />
                                    </div>

                                    {/* Usuario */}
                                    <div className="flex items-center justify-end h-5">
                                        <span className="w-[130px] text-[10px] text-gray-800 text-right mr-1.5 select-none">Usuario</span>
                                        <select 
                                            value={activeOrder.usuario} 
                                            disabled 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[140px] rounded-none focus:outline-none disabled:bg-[#fcfdfd]"
                                        >
                                            <option>{activeOrder.usuario}</option>
                                        </select>
                                    </div>

                                    {/* Origen */}
                                    <div className="flex items-center justify-end h-5">
                                        <span className="w-[130px] text-[10px] text-gray-800 text-right mr-1.5 select-none">Origen</span>
                                        <select 
                                            value={activeOrder.origen} 
                                            disabled 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[140px] rounded-none focus:outline-none disabled:bg-[#fcfdfd]"
                                        >
                                            <option>Pedido de cliente</option>
                                            <option>Manual</option>
                                        </select>
                                    </div>

                                    {/* Vinculados a */}
                                    <div className="flex items-center justify-end h-5">
                                        <span className="w-[130px] text-[10px] text-gray-800 text-right mr-1.5 select-none">Vinculados a</span>
                                        <select 
                                            value={activeOrder.vinculadoA} 
                                            disabled 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[140px] rounded-none focus:outline-none disabled:bg-[#fcfdfd]"
                                        >
                                            <option>Pedido de cliente</option>
                                        </select>
                                    </div>

                                    {/* Pedido vinculado */}
                                    <div className="flex items-center justify-end h-5">
                                        <span className="w-[130px] text-[10px] text-gray-800 text-right mr-1.5 select-none flex items-center justify-end">
                                            Pedido vinculado <SapLinkArrow />
                                        </span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.pedidoVinculado} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] font-mono font-bold text-black w-[140px] text-right rounded-none focus:outline-none select-text" 
                                        />
                                    </div>

                                    {/* Cliente */}
                                    <div className="flex items-center justify-end h-5">
                                        <span className="w-[130px] text-[10px] text-gray-800 text-right mr-1.5 select-none flex items-center justify-end">
                                            Cliente <SapLinkArrow />
                                        </span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.cliente} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] font-mono text-black w-[140px] text-right rounded-none focus:outline-none select-text" 
                                        />
                                    </div>

                                    {/* Centro de Costos */}
                                    <div className="flex items-center justify-end h-5">
                                        <span className="w-[130px] text-[10px] text-gray-800 text-right mr-1.5 select-none">Centro de Costos</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.centroCostos} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[140px] text-right rounded-none focus:outline-none select-text" 
                                        />
                                    </div>

                                    {/* Proyecto */}
                                    <div className="flex items-center justify-end h-5">
                                        <span className="w-[130px] text-[10px] text-gray-800 text-right mr-1.5 select-none">Proyecto</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.proyecto} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0 text-[10.5px] h-[19px] text-black w-[140px] text-right rounded-none focus:outline-none select-text" 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* TABS COMPONENTES / RESUMEN / ANEXOS */}
                            <div className="mt-2 flex flex-col">
                                <div className="flex border-b border-[#a3a3a3] gap-1 pl-1">
                                    <button 
                                        onClick={() => setTabActive('componentes')}
                                        className={`px-4 py-1 text-xs font-semibold rounded-t-sm border-t border-l border-r transition-colors select-none ${
                                            tabActive === 'componentes' 
                                                ? 'bg-white border-[#a3a3a3] border-b-white text-black -mb-[1px] z-10 font-bold' 
                                                : 'bg-[#dedbd5] border-[#c0beb9] text-gray-700 hover:bg-[#e6e3dd]'
                                        }`}
                                    >
                                        Componentes ({activeOrder.componentes.length})
                                    </button>
                                    <button 
                                        onClick={() => setTabActive('resumen')}
                                        className={`px-4 py-1 text-xs font-semibold rounded-t-sm border-t border-l border-r transition-colors select-none ${
                                            tabActive === 'resumen' 
                                                ? 'bg-white border-[#a3a3a3] border-b-white text-black -mb-[1px] z-10 font-bold' 
                                                : 'bg-[#dedbd5] border-[#c0beb9] text-gray-700 hover:bg-[#e6e3dd]'
                                        }`}
                                    >
                                        Resumen
                                    </button>
                                    <button 
                                        onClick={() => setTabActive('anexos')}
                                        className={`px-4 py-1 text-xs font-semibold rounded-t-sm border-t border-l border-r transition-colors select-none ${
                                            tabActive === 'anexos' 
                                                ? 'bg-white border-[#a3a3a3] border-b-white text-black -mb-[1px] z-10 font-bold' 
                                                : 'bg-[#dedbd5] border-[#c0beb9] text-gray-700 hover:bg-[#e6e3dd]'
                                        }`}
                                    >
                                        Anexos
                                    </button>
                                </div>

                                {/* TAB CONTENT CONTAINER WITH RESIZABLE COLUMNS */}
                                <div className="bg-white border-x border-b border-[#a3a3a3] shadow-inner min-h-[280px] overflow-hidden">
                                    
                                    {tabActive === 'componentes' && (
                                        <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                                            <table className="border-collapse text-[11px] font-sans table-fixed w-max">
                                                <thead className="sticky top-0 bg-[#eceae6] border-b border-[#c2c0bb] shadow-sm select-none z-10">
                                                    <tr className="text-gray-700 font-semibold">
                                                        {/* # */}
                                                        <th 
                                                            style={{ width: `${compColWidths.id}px` }}
                                                            onClick={() => handleCompSort('id')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-center cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-center">
                                                                <span>#</span>
                                                                {renderSortIcon('id', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="id" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Tipo */}
                                                        <th 
                                                            style={{ width: `${compColWidths.tipo}px` }}
                                                            onClick={() => handleCompSort('tipo')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-center cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-center">
                                                                <span>Tipo</span>
                                                                {renderSortIcon('tipo', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="tipo" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Nº */}
                                                        <th 
                                                            style={{ width: `${compColWidths.no}px` }}
                                                            onClick={() => handleCompSort('no')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-left cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-start overflow-hidden">
                                                                <span className="truncate">Nº</span>
                                                                {renderSortIcon('no', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="no" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Descripción */}
                                                        <th 
                                                            style={{ width: `${compColWidths.descripcion}px` }}
                                                            onClick={() => handleCompSort('descripcion')} 
                                                            className="relative px-2 py-1 border-r border-[#c2c0bb] text-left cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-start overflow-hidden">
                                                                <span className="truncate">Descripción</span>
                                                                {renderSortIcon('descripcion', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="descripcion" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Cantidad base */}
                                                        <th 
                                                            style={{ width: `${compColWidths.cantBase}px` }}
                                                            onClick={() => handleCompSort('cantBase')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-right cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-end overflow-hidden">
                                                                <span className="truncate">Cantidad base</span>
                                                                {renderSortIcon('cantBase', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="cantBase" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Ratio base */}
                                                        <th 
                                                            style={{ width: `${compColWidths.ratioBase}px` }}
                                                            onClick={() => handleCompSort('ratioBase')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-right cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-end overflow-hidden">
                                                                <span className="truncate">Ratio base</span>
                                                                {renderSortIcon('ratioBase', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="ratioBase" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Ctd.requerida */}
                                                        <th 
                                                            style={{ width: `${compColWidths.cantRequerida}px` }}
                                                            onClick={() => handleCompSort('cantRequerida')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-right font-bold text-black cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-end overflow-hidden">
                                                                <span className="truncate">Ctd.requerida</span>
                                                                {renderSortIcon('cantRequerida', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="cantRequerida" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Consumido */}
                                                        <th 
                                                            style={{ width: `${compColWidths.consumido}px` }}
                                                            onClick={() => handleCompSort('consumido')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-right cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-end overflow-hidden">
                                                                <span className="truncate">Consumido</span>
                                                                {renderSortIcon('consumido', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="consumido" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Disponible */}
                                                        <th 
                                                            style={{ width: `${compColWidths.disponible}px` }}
                                                            onClick={() => handleCompSort('disponible')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-right font-bold cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-end overflow-hidden">
                                                                <span className="truncate">Disponible</span>
                                                                {renderSortIcon('disponible', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="disponible" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Código de unidad de medida */}
                                                        <th 
                                                            style={{ width: `${compColWidths.unidadMedida}px` }}
                                                            onClick={() => handleCompSort('unidadMedida')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-left cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-start overflow-hidden">
                                                                <span className="truncate">Código de unidad de medida</span>
                                                                {renderSortIcon('unidadMedida', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="unidadMedida" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Almacén */}
                                                        <th 
                                                            style={{ width: `${compColWidths.almacen}px` }}
                                                            onClick={() => handleCompSort('almacen')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-center cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-center overflow-hidden">
                                                                <span className="truncate">Almacén</span>
                                                                {renderSortIcon('almacen', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="almacen" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Método emisión */}
                                                        <th 
                                                            style={{ width: `${compColWidths.metodoEmision}px` }}
                                                            onClick={() => handleCompSort('metodoEmision')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-left cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-start overflow-hidden">
                                                                <span className="truncate">Método emisión</span>
                                                                {renderSortIcon('metodoEmision', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="metodoEmision" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Cta.WIP */}
                                                        <th style={{ width: `${compColWidths.ctaWip}px` }} className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-left overflow-hidden">
                                                            <span className="truncate">Cta.WIP</span>
                                                            <ResizerHandle colKey="ctaWip" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Dimensión 1 */}
                                                        <th style={{ width: `${compColWidths.dimension1}px` }} className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-center overflow-hidden">
                                                            <span className="truncate">Dimensión 1</span>
                                                            <ResizerHandle colKey="dimension1" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Secuencia de ruta */}
                                                        <th style={{ width: `${compColWidths.secuenciaRuta}px` }} className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-left overflow-hidden">
                                                            <span className="truncate">Secuencia de ruta</span>
                                                            <ResizerHandle colKey="secuenciaRuta" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Documento de aprovisionamiento */}
                                                        <th style={{ width: `${compColWidths.docAprovisionamiento}px` }} className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-left overflow-hidden">
                                                            <span className="truncate">Documento de aprovisionamiento</span>
                                                            <ResizerHandle colKey="docAprovisionamiento" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Permitir doc.de aprovisionamiento */}
                                                        <th style={{ width: `${compColWidths.permitirDocAprov}px` }} className="relative px-1.5 py-1 text-center overflow-hidden">
                                                            <span className="truncate">Permitir doc.de aprovisionamiento</span>
                                                            <ResizerHandle colKey="permitirDocAprov" onResize={handleCompResizeStart} />
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#e5e5e5] bg-white">
                                                    {sortedComponentes.map((item) => (
                                                        <tr key={item.id} className="hover:bg-[#f2f7ff] transition-colors select-text">
                                                            <td style={{ width: `${compColWidths.id}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-center text-gray-500 select-none font-mono overflow-hidden">
                                                                {item.id}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.tipo}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-center text-gray-700 overflow-hidden truncate">
                                                                {item.tipo}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.no}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] font-mono text-black whitespace-nowrap overflow-hidden">
                                                                <span className="flex items-center">
                                                                    <SapLinkArrow />
                                                                    <span className="truncate">{item.no}</span>
                                                                </span>
                                                            </td>
                                                            <td style={{ width: `${compColWidths.descripcion}px` }} className="px-2 py-0.5 border-r border-[#e5e5e5] text-black font-medium truncate overflow-hidden" title={item.descripcion}>
                                                                {item.descripcion}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.cantBase}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-right text-gray-800 font-mono overflow-hidden truncate">
                                                                {item.cantBase}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.ratioBase}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-right text-gray-800 font-mono overflow-hidden truncate">
                                                                {item.ratioBase}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.cantRequerida}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-right font-bold font-mono text-black overflow-hidden truncate">
                                                                {typeof item.cantRequerida === 'number' ? item.cantRequerida.toLocaleString('es-CO') : item.cantRequerida}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.consumido}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-right text-gray-600 font-mono overflow-hidden truncate">
                                                                {item.consumido}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.disponible}px` }} className={`px-1.5 py-0.5 border-r border-[#e5e5e5] text-right font-mono font-bold overflow-hidden truncate ${
                                                                String(item.disponible).startsWith('-') ? 'text-[#d14747]' : 'text-black'
                                                            }`}>
                                                                {item.disponible}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.unidadMedida}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-left text-gray-700 overflow-hidden truncate">
                                                                {item.unidadMedida}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.almacen}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-center text-black font-mono whitespace-nowrap overflow-hidden">
                                                                <span className="flex items-center justify-center">
                                                                    <SapLinkArrow />
                                                                    <span>{item.almacen}</span>
                                                                </span>
                                                            </td>
                                                            <td style={{ width: `${compColWidths.metodoEmision}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-left text-gray-700 overflow-hidden truncate">
                                                                {item.metodoEmision}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.ctaWip}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-left text-gray-600 font-mono overflow-hidden truncate">
                                                                {item.ctaWip || ""}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.dimension1}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-center text-gray-700 font-mono overflow-hidden truncate">
                                                                {item.dimension1 || "0"}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.secuenciaRuta}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-left text-gray-600 overflow-hidden truncate">
                                                                {item.secuenciaRuta || ""}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.docAprovisionamiento}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-left text-gray-600 overflow-hidden truncate">
                                                                {item.docAprovisionamiento || ""}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.permitirDocAprov}px` }} className="px-1.5 py-0.5 text-center overflow-hidden">
                                                                <input type="checkbox" checked={item.permitirDocAprov || false} disabled className="w-3.5 h-3.5 border-[#b2b2b2] rounded-none text-amber-600 focus:ring-0" />
                                                            </td>
                                                        </tr>
                                                    ))}

                                                    {/* FILA 85 DE CIERRE VACÍA DE SAP */}
                                                    <tr className="bg-white h-6 hover:bg-[#f2f7ff] transition-colors select-text">
                                                        <td style={{ width: `${compColWidths.id}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-center text-gray-500 font-mono">85</td>
                                                        <td style={{ width: `${compColWidths.tipo}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.no}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.descripcion}px` }} className="px-2 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.cantBase}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.ratioBase}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.cantRequerida}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-right font-mono">0</td>
                                                        <td style={{ width: `${compColWidths.consumido}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-right font-mono">0</td>
                                                        <td style={{ width: `${compColWidths.disponible}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-right font-mono font-bold">0</td>
                                                        <td style={{ width: `${compColWidths.unidadMedida}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.almacen}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.metodoEmision}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.ctaWip}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.dimension1}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-center font-mono">0</td>
                                                        <td style={{ width: `${compColWidths.secuenciaRuta}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-center font-mono">0</td>
                                                        <td style={{ width: `${compColWidths.docAprovisionamiento}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.permitirDocAprov}px` }} className="px-1.5 py-0.5 text-center">
                                                            <input type="checkbox" disabled className="w-3.5 h-3.5 border-[#b2b2b2] rounded-none text-amber-600 focus:ring-0" />
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {tabActive === 'resumen' && (
                                        <div className="p-3.5 bg-[#fcfdfd] text-xs font-sans text-black min-h-[320px]">
                                            <div className="flex flex-wrap lg:flex-nowrap justify-between gap-8 items-start max-w-6xl">
                                                
                                                {/* SECCIÓN 1: COSTOS */}
                                                <div className="space-y-1.5 w-[340px] shrink-0">
                                                    <h4 className="font-semibold text-gray-800 border-b border-gray-300 pb-0.5 mb-2 text-xs">Costos</h4>
                                                    
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px]">Costo de componente real-SAL</span>
                                                        <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[140px] text-right text-xs rounded-none focus:outline-none" />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px]">Costo de componente de recurso real</span>
                                                        <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[140px] text-right text-xs rounded-none focus:outline-none" />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px] font-bold">Costo adicional real MO+CIF</span>
                                                        <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[140px] text-right text-xs rounded-none focus:outline-none" />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px] font-bold">Costo de producto real+VALE P</span>
                                                        <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[140px] text-right text-xs rounded-none focus:outline-none" />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px]">Coste real de subproductos</span>
                                                        <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[140px] text-right text-xs rounded-none focus:outline-none" />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px]">Desviación total</span>
                                                        <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[140px] text-right text-xs rounded-none focus:outline-none" />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px]">Asiento contable</span>
                                                        <input 
                                                            type="text" 
                                                            value={activeOrder.asientoContable || ""} 
                                                            readOnly 
                                                            className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[210px] text-xs text-black rounded-none focus:outline-none truncate" 
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px]">Documento de referencia</span>
                                                        <div className="w-[140px] flex justify-center">
                                                            <button className="bg-gradient-to-b from-[#f5eee0] to-[#ded6c3] hover:from-[#ebdcc5] hover:to-[#cebe9f] border border-[#a3987e] px-3 py-0.5 text-xs text-black cursor-pointer font-bold rounded-none shadow-xs flex items-center justify-center h-[20px]">
                                                                ...
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* SECCIÓN 2: CANTIDADES Y FECHAS */}
                                                <div className="space-y-4 w-[280px] shrink-0">
                                                    {/* CANTIDADES */}
                                                    <div className="space-y-1.5">
                                                        <h4 className="font-semibold text-gray-800 border-b border-gray-300 pb-0.5 mb-2 text-xs">Cantidades</h4>
                                                        
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Cantidad planificada</span>
                                                            <input type="text" value={activeOrder.cantPlanificada} readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none font-semibold" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Cantidad completada</span>
                                                            <input type="text" value={activeOrder.cantCompletada ?? ""} readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Cantidad rechazada</span>
                                                            <input type="text" value={activeOrder.cantRechazada ?? ""} readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>
                                                    </div>

                                                    {/* FECHAS */}
                                                    <div className="space-y-1.5 pt-2">
                                                        <h4 className="font-semibold text-gray-800 border-b border-gray-300 pb-0.5 mb-2 text-xs">Fechas</h4>
                                                        
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Fecha de finalización</span>
                                                            <input type="text" value={activeOrder.fechaFinalizacion} readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-center text-xs rounded-none focus:outline-none" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Fecha de cierre real</span>
                                                            <input type="text" value={activeOrder.fechaCierreReal || ""} readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-center text-xs rounded-none focus:outline-none" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Vencido</span>
                                                            <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-center text-xs rounded-none focus:outline-none" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* SECCIÓN 3: TIEMPOS PLANIFICADOS Y DÍAS PLANIFICADOS */}
                                                <div className="space-y-4 w-[280px] shrink-0">
                                                    {/* TIEMPOS PLANIFICADOS */}
                                                    <div className="space-y-1.5">
                                                        <h4 className="font-semibold text-gray-800 border-b border-gray-300 pb-0.5 mb-2 text-xs">Tiempos planificados</h4>
                                                        
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Tiempo de producción total</span>
                                                            <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Tiempo adicional total</span>
                                                            <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Tiempo de ejecución total</span>
                                                            <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>
                                                    </div>

                                                    {/* DÍAS PLANIFICADOS */}
                                                    <div className="space-y-1.5 pt-2">
                                                        <h4 className="font-semibold text-gray-800 border-b border-gray-300 pb-0.5 mb-2 text-xs">Días planificados</h4>
                                                        
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Total de días solicitados</span>
                                                            <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Total de días de espera</span>
                                                            <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Días totales</span>
                                                            <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    )}

                                    {tabActive === 'anexos' && (
                                        <div className="p-2 bg-[#f3f0ea] flex gap-2 min-h-[350px]">
                                            {/* TABLA DE ANEXOS CON TODAS LAS COLUMNAS SAP */}
                                            <div className="flex-1 border border-[#a3a3a3] bg-white overflow-x-auto max-h-[360px] shadow-inner">
                                                <table className="w-full border-collapse text-[11px] font-sans text-left min-w-[950px]">
                                                    <thead className="sticky top-0 bg-[#eceae6] border-b border-[#c2c0bb] shadow-sm select-none z-10">
                                                        <tr className="text-gray-700 font-semibold">
                                                            <th className="px-1.5 py-1 border-r border-[#c2c0bb] text-center w-8">#</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left min-w-[180px]">Vía de acceso destino</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left min-w-[180px]">Nombre de archivo</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left w-32">Extensión de archivo</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-right w-36">Tamaño del archivo</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-center w-32">Fecha del anexo</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left w-36">Adjuntado por</th>
                                                            <th className="px-2 py-1 text-left min-w-[160px] relative">
                                                                <div className="flex items-center justify-between">
                                                                    <span>Texto libre</span>
                                                                    <span className="text-gray-400 font-normal hover:text-black cursor-pointer text-xs pr-1" title="Ampliar">↗</span>
                                                                </div>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[#e5e5e5] bg-white">
                                                        {/* Filas vacías de cuadrícula SAP */}
                                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                                            <tr key={num} className="border-b border-[#e5e5e5] h-6 bg-white hover:bg-[#f2f7ff] transition-colors">
                                                                <td className="px-1.5 py-1 border-r border-[#e5e5e5] text-center text-gray-400 font-mono text-xs">{num}</td>
                                                                <td className="px-2 py-1 border-r border-[#e5e5e5]"></td>
                                                                <td className="px-2 py-1 border-r border-[#e5e5e5]"></td>
                                                                <td className="px-2 py-1 border-r border-[#e5e5e5]"></td>
                                                                <td className="px-2 py-1 border-r border-[#e5e5e5]"></td>
                                                                <td className="px-2 py-1 border-r border-[#e5e5e5]"></td>
                                                                <td className="px-2 py-1 border-r border-[#e5e5e5]"></td>
                                                                <td className="px-2 py-1"></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* BOTONES LATERALES DERECHOS SAP */}
                                            <div className="flex flex-col gap-2 shrink-0 pt-1">
                                                <button className="bg-gradient-to-b from-[#f5eee0] to-[#ded6c3] hover:from-[#ebdcc5] hover:to-[#cebe9f] border border-[#a3987e] px-4 py-1 text-xs text-black cursor-pointer font-bold rounded-none shadow-xs text-center w-24">
                                                    Explorar
                                                </button>
                                                <button className="bg-gradient-to-b from-[#f5eee0] to-[#ded6c3] hover:from-[#ebdcc5] hover:to-[#cebe9f] border border-[#a3987e] px-4 py-1 text-xs text-black cursor-pointer font-bold rounded-none shadow-xs text-center w-24">
                                                    Visualizar
                                                </button>
                                                <button className="bg-gradient-to-b from-[#f5eee0] to-[#ded6c3] hover:from-[#ebdcc5] hover:to-[#cebe9f] border border-[#a3987e] px-4 py-1 text-xs text-black cursor-pointer font-bold rounded-none shadow-xs text-center w-24">
                                                    Borrar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* COMMENTS & PACKAGING AREA */}
                            <div className="flex items-start justify-between w-full mt-1.5">
                                <div className="flex items-start gap-1">
                                    <span className="text-[11px] text-gray-800 select-none w-[75px] shrink-0 pt-0.5">Comentarios</span>
                                    <textarea
                                        value={activeOrder.comentarios}
                                        readOnly
                                        className="bg-white border border-[#b2b2b2] p-1 text-[11px] text-black w-[250px] h-[34px] rounded-none focus:outline-none resize-none font-sans leading-tight"
                                    />
                                </div>

                                <div className="flex items-start gap-1">
                                    <span className="text-[11px] text-gray-800 select-none w-[150px] shrink-0 pt-0.5 text-right">Observaciones sobre empaque</span>
                                    <textarea
                                        value={activeOrder.observacionesEmpaque}
                                        readOnly
                                        className="bg-white border border-[#b2b2b2] p-1 text-[11px] text-black w-[250px] h-[34px] rounded-none focus:outline-none resize-none font-sans leading-tight"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            ) : subHeaderTab === 'query-semaforo' ? (
                /* TAB 2: QUERY - SEMAFORO (QUERY MANAGER DE SAP) */
                <main className="flex-1 max-w-[1700px] w-full mx-auto p-2 md:p-3 flex flex-col gap-3 font-sans">
                    
                    {/* SAP QUERY MANAGER WINDOW REPLICA CONTAINER */}
                    <div className="bg-[#eceae6] border border-[#a3a3a3] shadow-2xl flex flex-col font-sans select-none text-xs w-full text-black overflow-hidden relative">
                        
                        {/* SAP WINDOW TITLE BAR */}
                        <div className="bg-gradient-to-r from-[#eceae6] to-[#d6d3cc] px-3 py-1.5 flex items-center justify-between border-b border-[#a3a3a3]">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-amber-500 rounded-sm flex items-center justify-center text-[10px] text-white font-black select-none shadow-sm">
                                    Q
                                </div>
                                <span className="font-semibold text-gray-800 text-[11px] tracking-wide">
                                    FPK - Semaforo - DJP — Query Manager (Proceso Produccion)
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleUpdateSemaforo}
                                    disabled={isExecuting}
                                    className="flex items-center gap-1.5 bg-[#324354] hover:bg-[#233140] text-white font-bold px-3 py-1 rounded text-xs transition-all shadow-sm cursor-pointer active:scale-95"
                                    title="Consultar y actualizar la consulta FPK - Semaforo - DJP desde SAP"
                                >
                                    <RefreshCw size={14} className={isExecuting ? "animate-spin" : ""} />
                                    <span>Actualizar Semáforo</span>
                                </button>

                                <button
                                    onClick={handleExportExcel}
                                    className="flex items-center gap-1.5 bg-[#107c41] hover:bg-[#0b5c30] text-white font-bold px-3 py-1 rounded text-xs transition-colors shadow-sm cursor-pointer"
                                    title="Exportar consulta a Excel"
                                >
                                    <Download size={14} />
                                    <span>Descargar a Excel</span>
                                </button>
                            </div>
                        </div>

                        {/* SAP GOLD SHARP ACCENT BORDER */}
                        <div className="h-[3px] bg-[#f4b000] w-full"></div>

                        {/* QUERY MANAGER BODY */}
                        <div className="p-3 bg-[#f3f0ea] flex flex-col gap-3">
                            
                            {/* SQL QUERY BOX (EXEC STATEMENT FROM SAP QUERY MANAGER) */}
                            <div className="bg-white border border-[#b2b2b2] p-2 flex flex-col gap-1 shadow-inner">
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex justify-between items-center">
                                    <span>Sentencia SQL — Query Manager SAP</span>
                                    <span className="text-gray-400 font-mono text-[10px]">Consulta: FPK - Semaforo - DJP</span>
                                </div>
                                <div className="bg-[#f8f9fa] border border-gray-200 p-2 font-mono text-xs text-slate-800 rounded select-text">
                                    EXEC [Planos_Symphony].[dbo].[SEMAFORO]
                                </div>
                            </div>

                            {/* FILTER & SAP ACTIONS BAR */}
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#eceae6] border border-[#c0beb9] p-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-700">Buscar en resultados:</span>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={semaforoFilter}
                                            onChange={(e) => setSemaforoFilter(e.target.value)}
                                            placeholder="SKU, N° OP, Planta, Artículo, Cliente..."
                                            className="bg-white border border-[#b2b2b2] px-2 py-1 text-xs text-black w-72 outline-none focus:border-[#324354]"
                                        />
                                        {semaforoFilter && (
                                            <button
                                                onClick={() => setSemaforoFilter('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black text-xs font-bold"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleUpdateSemaforo}
                                        disabled={isExecuting}
                                        className="bg-[#324354] hover:bg-[#233140] text-white border border-[#1b2633] px-3.5 py-1 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                                    >
                                        <RefreshCw size={13} className={isExecuting ? "animate-spin" : ""} />
                                        <span>Actualizar Semáforo</span>
                                    </button>

                                    <button
                                        onClick={handleCopyData}
                                        className="bg-[#e1e1e1] hover:bg-[#d0d0d0] border border-gray-400 px-3 py-1 font-semibold text-xs text-black cursor-pointer flex items-center gap-1 active:bg-[#c5c5c5]"
                                    >
                                        {copiedData ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                                        <span>{copiedData ? "¡Copiado!" : "Copiar datos"}</span>
                                    </button>

                                    <button
                                        onClick={handleExportExcel}
                                        className="bg-[#107c41] hover:bg-[#0b5c30] text-white border border-[#0b5c30] px-3.5 py-1 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm"
                                    >
                                        <Download size={13} />
                                        <span>Descargar a Excel</span>
                                    </button>
                                </div>
                            </div>

                            {/* RESULTS TABLE WITH ALL 39 COLUMNS */}
                            <div className="border border-[#a3a3a3] bg-white overflow-x-auto max-h-[600px] shadow-sm select-text">
                                <table className="border-collapse text-xs font-sans text-left table-fixed w-max">
                                    <thead className="sticky top-0 bg-[#eceae6] border-b border-[#a3a3a3] z-10 shadow-sm select-none">
                                        <tr className="text-gray-700 font-semibold">
                                            {/* 1. # */}
                                            <th style={{ width: `${semaforoColWidths.id}px` }} onClick={() => handleSemaforoSort('id')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center">
                                                    <span>#</span>
                                                    {renderSortIcon('id', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="id" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 2. Originnum */}
                                            <th style={{ width: `${semaforoColWidths.originnum}px` }} onClick={() => handleSemaforoSort('originnum')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-start overflow-hidden">
                                                    <span className="truncate">Originnum</span>
                                                    {renderSortIcon('originnum', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="originnum" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 3. Nro OP */}
                                            <th style={{ width: `${semaforoColWidths.nroOp}px` }} onClick={() => handleSemaforoSort('nroOp')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-start overflow-hidden">
                                                    <span className="truncate">Nro OP</span>
                                                    {renderSortIcon('nroOp', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="nroOp" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 4. SKU */}
                                            <th style={{ width: `${semaforoColWidths.sku}px` }} onClick={() => handleSemaforoSort('sku')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-start overflow-hidden">
                                                    <span className="truncate">SKU</span>
                                                    {renderSortIcon('sku', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="sku" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 5. Descripción Artículo */}
                                            <th style={{ width: `${semaforoColWidths.descripcion}px` }} onClick={() => handleSemaforoSort('descripcion')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-start overflow-hidden">
                                                    <span className="truncate">Descripción Artículo</span>
                                                    {renderSortIcon('descripcion', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="descripcion" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 6. Planta */}
                                            <th style={{ width: `${semaforoColWidths.planta}px` }} onClick={() => handleSemaforoSort('planta')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Planta</span>
                                                    {renderSortIcon('planta', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="planta" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 7. Familia */}
                                            <th style={{ width: `${semaforoColWidths.familia}px` }} onClick={() => handleSemaforoSort('familia')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Familia</span>
                                                    {renderSortIcon('familia', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="familia" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 8. Tipo Orden */}
                                            <th style={{ width: `${semaforoColWidths.tipoOrden}px` }} onClick={() => handleSemaforoSort('tipoOrden')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-start overflow-hidden">
                                                    <span className="truncate">Tipo Orden</span>
                                                    {renderSortIcon('tipoOrden', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="tipoOrden" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 9. Cant. Pendiente */}
                                            <th style={{ width: `${semaforoColWidths.cantPendiente}px` }} onClick={() => handleSemaforoSort('cantPendiente')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Cant. Pendiente</span>
                                                    {renderSortIcon('cantPendiente', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="cantPendiente" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 10. Cant. Pend. Item */}
                                            <th style={{ width: `${semaforoColWidths.cantPendItem}px` }} onClick={() => handleSemaforoSort('cantPendItem')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Cant. Pend. Item</span>
                                                    {renderSortIcon('cantPendItem', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="cantPendItem" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 11. Cantidad total */}
                                            <th style={{ width: `${semaforoColWidths.cantTotal}px` }} onClick={() => handleSemaforoSort('cantTotal')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Cantidad total</span>
                                                    {renderSortIcon('cantTotal', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="cantTotal" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 12. Disponible PT01 */}
                                            <th style={{ width: `${semaforoColWidths.disponiblePt01}px` }} onClick={() => handleSemaforoSort('disponiblePt01')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Disponible PT01</span>
                                                    {renderSortIcon('disponiblePt01', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="disponiblePt01" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 13. Fecha Creación OP */}
                                            <th style={{ width: `${semaforoColWidths.fechaCreacionOp}px` }} onClick={() => handleSemaforoSort('fechaCreacionOp')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Fecha Creación OP</span>
                                                    {renderSortIcon('fechaCreacionOp', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="fechaCreacionOp" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 14. Estado */}
                                            <th style={{ width: `${semaforoColWidths.estado}px` }} onClick={() => handleSemaforoSort('estado')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Estado</span>
                                                    {renderSortIcon('estado', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="estado" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 15. Fecha Recomendada Liberación */}
                                            <th style={{ width: `${semaforoColWidths.fechaRecomendadaLiberacion}px` }} onClick={() => handleSemaforoSort('fechaRecomendadaLiberacion')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Fecha Recom. Lib.</span>
                                                    {renderSortIcon('fechaRecomendadaLiberacion', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="fechaRecomendadaLiberacion" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 16. Fecha Real Liberación */}
                                            <th style={{ width: `${semaforoColWidths.fechaRealLiberacion}px` }} onClick={() => handleSemaforoSort('fechaRealLiberacion')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Fecha Real Lib.</span>
                                                    {renderSortIcon('fechaRealLiberacion', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="fechaRealLiberacion" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 17. Consumo Para Liberar */}
                                            <th style={{ width: `${semaforoColWidths.consumoParaLiberar}px` }} onClick={() => handleSemaforoSort('consumoParaLiberar')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Consumo Para Lib.</span>
                                                    {renderSortIcon('consumoParaLiberar', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="consumoParaLiberar" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 18. Color Liberación Txt */}
                                            <th style={{ width: `${semaforoColWidths.colorLiberacionTxt}px` }} onClick={() => handleSemaforoSort('colorLiberacionTxt')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Color Lib. Txt</span>
                                                    {renderSortIcon('colorLiberacionTxt', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="colorLiberacionTxt" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 19. Color Liberación */}
                                            <th style={{ width: `${semaforoColWidths.colorLiberacion}px` }} onClick={() => handleSemaforoSort('colorLiberacion')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Color Lib.</span>
                                                    {renderSortIcon('colorLiberacion', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="colorLiberacion" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 20. Cumplimiento Liberación */}
                                            <th style={{ width: `${semaforoColWidths.cumplimientoLiberacion}px` }} onClick={() => handleSemaforoSort('cumplimientoLiberacion')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Cumplimiento Lib.</span>
                                                    {renderSortIcon('cumplimientoLiberacion', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="cumplimientoLiberacion" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 21. Fecha Entrega Lote */}
                                            <th style={{ width: `${semaforoColWidths.fechaEntregaLote}px` }} onClick={() => handleSemaforoSort('fechaEntregaLote')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Fecha Entrega Lote</span>
                                                    {renderSortIcon('fechaEntregaLote', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="fechaEntregaLote" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 22. Fecha Recomendada de Entrega */}
                                            <th style={{ width: `${semaforoColWidths.fechaRecomendadaEntrega}px` }} onClick={() => handleSemaforoSort('fechaRecomendadaEntrega')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Fecha Recom. Entrega</span>
                                                    {renderSortIcon('fechaRecomendadaEntrega', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="fechaRecomendadaEntrega" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 23. Fecha Cierre OP */}
                                            <th style={{ width: `${semaforoColWidths.fechaCierreOp}px` }} onClick={() => handleSemaforoSort('fechaCierreOp')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Fecha Cierre OP</span>
                                                    {renderSortIcon('fechaCierreOp', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="fechaCierreOp" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 24. Fecha Ideal Entrega Producción */}
                                            <th style={{ width: `${semaforoColWidths.fechaIdealEntregaProduccion}px` }} onClick={() => handleSemaforoSort('fechaIdealEntregaProduccion')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Fecha Ideal Ent. Prod.</span>
                                                    {renderSortIcon('fechaIdealEntregaProduccion', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="fechaIdealEntregaProduccion" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 25. Consumo Amortiguador Planta */}
                                            <th style={{ width: `${semaforoColWidths.consumoAmortiguadorPlanta}px` }} onClick={() => handleSemaforoSort('consumoAmortiguadorPlanta')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Consumo Amort. Planta</span>
                                                    {renderSortIcon('consumoAmortiguadorPlanta', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="consumoAmortiguadorPlanta" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 26. Color Producción Txt */}
                                            <th style={{ width: `${semaforoColWidths.colorProduccionTxt}px` }} onClick={() => handleSemaforoSort('colorProduccionTxt')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Color Prod. Txt</span>
                                                    {renderSortIcon('colorProduccionTxt', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="colorProduccionTxt" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 27. Color Producción */}
                                            <th style={{ width: `${semaforoColWidths.colorProduccion}px` }} onClick={() => handleSemaforoSort('colorProduccion')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Color Producción</span>
                                                    {renderSortIcon('colorProduccion', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="colorProduccion" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 28. Cumplimiento Planta */}
                                            <th style={{ width: `${semaforoColWidths.cumplimientoPlanta}px` }} onClick={() => handleSemaforoSort('cumplimientoPlanta')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Cumplimiento Planta</span>
                                                    {renderSortIcon('cumplimientoPlanta', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="cumplimientoPlanta" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 29. Dias Retrazo Firplak */}
                                            <th style={{ width: `${semaforoColWidths.diasRetrazoFirplak}px` }} onClick={() => handleSemaforoSort('diasRetrazoFirplak')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Días Retraso Firplak</span>
                                                    {renderSortIcon('diasRetrazoFirplak', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="diasRetrazoFirplak" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 30. Color Firplak Txt */}
                                            <th style={{ width: `${semaforoColWidths.colorFirplakTxt}px` }} onClick={() => handleSemaforoSort('colorFirplakTxt')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Color Firplak Txt</span>
                                                    {renderSortIcon('colorFirplakTxt', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="colorFirplakTxt" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 31. Color Firplak */}
                                            <th style={{ width: `${semaforoColWidths.colorFirplak}px` }} onClick={() => handleSemaforoSort('colorFirplak')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Color Firplak</span>
                                                    {renderSortIcon('colorFirplak', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="colorFirplak" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 32. Cumplimiento Firplak */}
                                            <th style={{ width: `${semaforoColWidths.cumplimientoFirplak}px` }} onClick={() => handleSemaforoSort('cumplimientoFirplak')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Cumplimiento Firplak</span>
                                                    {renderSortIcon('cumplimientoFirplak', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="cumplimientoFirplak" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 33. Fecha Prometida Entrega Item */}
                                            <th style={{ width: `${semaforoColWidths.fechaPrometidaEntregaItem}px` }} onClick={() => handleSemaforoSort('fechaPrometidaEntregaItem')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Fecha Prometida Ent.</span>
                                                    {renderSortIcon('fechaPrometidaEntregaItem', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="fechaPrometidaEntregaItem" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 34. Destino */}
                                            <th style={{ width: `${semaforoColWidths.destino}px` }} onClick={() => handleSemaforoSort('destino')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Destino</span>
                                                    {renderSortIcon('destino', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="destino" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 35. NumLote */}
                                            <th style={{ width: `${semaforoColWidths.numLote}px` }} onClick={() => handleSemaforoSort('numLote')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-start overflow-hidden">
                                                    <span className="truncate">NumLote</span>
                                                    {renderSortIcon('numLote', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="numLote" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 36. Molde */}
                                            <th style={{ width: `${semaforoColWidths.molde}px` }} onClick={() => handleSemaforoSort('molde')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-start overflow-hidden">
                                                    <span className="truncate">Molde</span>
                                                    {renderSortIcon('molde', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="molde" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 37. Capacidad Molde */}
                                            <th style={{ width: `${semaforoColWidths.capacidadMolde}px` }} onClick={() => handleSemaforoSort('capacidadMolde')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Capacidad Molde</span>
                                                    {renderSortIcon('capacidadMolde', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="capacidadMolde" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 38. Fecha Carga Molde */}
                                            <th style={{ width: `${semaforoColWidths.fechaCargaMolde}px` }} onClick={() => handleSemaforoSort('fechaCargaMolde')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Fecha Carga Molde</span>
                                                    {renderSortIcon('fechaCargaMolde', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="fechaCargaMolde" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 39. Amortiguador */}
                                            <th style={{ width: `${semaforoColWidths.amortiguador}px` }} onClick={() => handleSemaforoSort('amortiguador')} className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Amortiguador</span>
                                                    {renderSortIcon('amortiguador', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="amortiguador" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            {/* 40. Cliente */}
                                            <th style={{ width: `${semaforoColWidths.cliente}px` }} onClick={() => handleSemaforoSort('cliente')} className="relative px-2 py-1.5 font-bold text-gray-700 cursor-pointer hover:bg-[#dedbd5]">
                                                <div className="flex items-center justify-start overflow-hidden">
                                                    <span className="truncate">Cliente</span>
                                                    {renderSortIcon('cliente', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="cliente" onResize={handleSemaforoResizeStart} />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedSemaforoData.length > 0 ? (
                                            sortedSemaforoData.map((row, idx) => (
                                                <tr
                                                    key={row.id}
                                                    className={`border-b border-[#e5e5e5] hover:bg-[#f2f7ff] transition-colors ${
                                                        idx % 2 === 0 ? 'bg-[#fcfdfd]' : 'bg-[#f7f6f2]'
                                                    }`}
                                                >
                                                    <td style={{ width: `${semaforoColWidths.id}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-gray-500 font-medium text-center overflow-hidden">{row.id}</td>
                                                    <td style={{ width: `${semaforoColWidths.originnum}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] font-mono text-slate-800 overflow-hidden truncate">{row.originnum}</td>
                                                    <td style={{ width: `${semaforoColWidths.nroOp}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] font-mono font-semibold text-blue-900 overflow-hidden truncate">{row.nroOp}</td>
                                                    <td style={{ width: `${semaforoColWidths.sku}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] font-mono text-slate-700 overflow-hidden truncate">{row.sku}</td>
                                                    <td style={{ width: `${semaforoColWidths.descripcion}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] font-medium text-slate-900 overflow-hidden truncate" title={row.descripcion}>{row.descripcion}</td>
                                                    <td style={{ width: `${semaforoColWidths.planta}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-semibold text-slate-700 overflow-hidden truncate">{row.planta}</td>
                                                    <td style={{ width: `${semaforoColWidths.familia}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-medium text-slate-600 overflow-hidden truncate">{row.familia}</td>
                                                    <td style={{ width: `${semaforoColWidths.tipoOrden}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] overflow-hidden truncate">
                                                        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                                            row.tipoOrden === 'STOCK' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-blue-100 text-blue-800 border border-blue-300'
                                                        }`}>
                                                            {row.tipoOrden}
                                                        </span>
                                                    </td>
                                                    <td style={{ width: `${semaforoColWidths.cantPendiente}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-right font-mono font-semibold text-slate-800 overflow-hidden truncate">{row.cantPendiente}</td>
                                                    <td style={{ width: `${semaforoColWidths.cantPendItem}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-right font-mono text-slate-700 overflow-hidden truncate">{row.cantPendItem}</td>
                                                    <td style={{ width: `${semaforoColWidths.cantTotal}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-right font-mono font-bold text-slate-900 overflow-hidden truncate">{row.cantTotal}</td>
                                                    
                                                    {/* 12-39 Additional Columns */}
                                                    <td style={{ width: `${semaforoColWidths.disponiblePt01}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-right font-mono overflow-hidden truncate">{row.disponiblePt01}</td>
                                                    <td style={{ width: `${semaforoColWidths.fechaCreacionOp}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-mono text-slate-700 overflow-hidden truncate">{row.fechaCreacionOp}</td>
                                                    <td style={{ width: `${semaforoColWidths.estado}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-semibold overflow-hidden truncate">
                                                        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                                            row.estado === 'Cerrado' ? 'bg-slate-200 text-slate-800' : row.estado === 'Liberado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                        }`}>
                                                            {row.estado}
                                                        </span>
                                                    </td>
                                                    <td style={{ width: `${semaforoColWidths.fechaRecomendadaLiberacion}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-mono text-slate-600 overflow-hidden truncate">{row.fechaRecomendadaLiberacion}</td>
                                                    <td style={{ width: `${semaforoColWidths.fechaRealLiberacion}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-mono text-slate-600 overflow-hidden truncate">{row.fechaRealLiberacion || '-'}</td>
                                                    <td style={{ width: `${semaforoColWidths.consumoParaLiberar}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-right font-mono font-medium text-slate-800 overflow-hidden truncate">{row.consumoParaLiberar}</td>
                                                    <td style={{ width: `${semaforoColWidths.colorLiberacionTxt}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center overflow-hidden truncate">{renderColorBadge(row.colorLiberacionTxt)}</td>
                                                    <td style={{ width: `${semaforoColWidths.colorLiberacion}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-right font-mono text-slate-700 overflow-hidden truncate">{row.colorLiberacion}</td>
                                                    <td style={{ width: `${semaforoColWidths.cumplimientoLiberacion}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-medium text-slate-700 overflow-hidden truncate">{row.cumplimientoLiberacion}</td>
                                                    <td style={{ width: `${semaforoColWidths.fechaEntregaLote}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-mono text-slate-700 overflow-hidden truncate">{row.fechaEntregaLote}</td>
                                                    <td style={{ width: `${semaforoColWidths.fechaRecomendadaEntrega}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-mono text-slate-700 overflow-hidden truncate">{row.fechaRecomendadaEntrega}</td>
                                                    <td style={{ width: `${semaforoColWidths.fechaCierreOp}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-mono text-slate-600 overflow-hidden truncate">{row.fechaCierreOp || '-'}</td>
                                                    <td style={{ width: `${semaforoColWidths.fechaIdealEntregaProduccion}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-mono text-slate-600 overflow-hidden truncate">{row.fechaIdealEntregaProduccion || '-'}</td>
                                                    <td style={{ width: `${semaforoColWidths.consumoAmortiguadorPlanta}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-right font-mono text-slate-800 overflow-hidden truncate">{row.consumoAmortiguadorPlanta}</td>
                                                    <td style={{ width: `${semaforoColWidths.colorProduccionTxt}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center overflow-hidden truncate">{renderColorBadge(row.colorProduccionTxt)}</td>
                                                    <td style={{ width: `${semaforoColWidths.colorProduccion}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-right font-mono text-slate-700 overflow-hidden truncate">{row.colorProduccion}</td>
                                                    <td style={{ width: `${semaforoColWidths.cumplimientoPlanta}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-medium text-slate-700 overflow-hidden truncate">{row.cumplimientoPlanta}</td>
                                                    <td style={{ width: `${semaforoColWidths.diasRetrazoFirplak}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-right font-mono text-slate-800 overflow-hidden truncate">{row.diasRetrazoFirplak}</td>
                                                    <td style={{ width: `${semaforoColWidths.colorFirplakTxt}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center overflow-hidden truncate">{renderColorBadge(row.colorFirplakTxt)}</td>
                                                    <td style={{ width: `${semaforoColWidths.colorFirplak}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-right font-mono text-slate-700 overflow-hidden truncate">{row.colorFirplak}</td>
                                                    <td style={{ width: `${semaforoColWidths.cumplimientoFirplak}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-medium text-slate-700 overflow-hidden truncate">{row.cumplimientoFirplak}</td>
                                                    <td style={{ width: `${semaforoColWidths.fechaPrometidaEntregaItem}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-mono text-slate-700 overflow-hidden truncate">{row.fechaPrometidaEntregaItem}</td>
                                                    <td style={{ width: `${semaforoColWidths.destino}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-mono font-bold text-slate-800 overflow-hidden truncate">{row.destino}</td>
                                                    <td style={{ width: `${semaforoColWidths.numLote}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] font-mono text-slate-700 overflow-hidden truncate">{row.numLote}</td>
                                                    <td style={{ width: `${semaforoColWidths.molde}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] font-medium text-slate-800 overflow-hidden truncate" title={row.molde}>{row.molde}</td>
                                                    <td style={{ width: `${semaforoColWidths.capacidadMolde}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-right font-mono text-slate-700 overflow-hidden truncate">{row.capacidadMolde || '-'}</td>
                                                    <td style={{ width: `${semaforoColWidths.fechaCargaMolde}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-mono text-slate-700 overflow-hidden truncate">{row.fechaCargaMolde}</td>
                                                    <td style={{ width: `${semaforoColWidths.amortiguador}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-right font-mono text-slate-800 overflow-hidden truncate">{row.amortiguador}</td>
                                                    <td style={{ width: `${semaforoColWidths.cliente}px` }} className="px-2 py-1.5 font-medium text-slate-900 overflow-hidden truncate" title={row.cliente}>{row.cliente}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={40} className="py-8 text-center text-gray-500 italic bg-white">
                                                    No se encontraron registros que coincidan con la búsqueda.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* SAP BOTTOM FOOTER BAR */}
                            <div className="bg-[#eceae6] border border-[#a3a3a3] px-3 py-1 flex items-center justify-between text-[11px] text-gray-700">
                                <div className="flex items-center gap-4">
                                    <span>({sortedSemaforoData.length.toLocaleString('es-CO')} registros cargados de 39 columnas)</span>
                                    <span className="text-gray-400">|</span>
                                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                        Consulta EXEC [Planos_Symphony].[dbo].[SEMAFORO] ejecutada con éxito [200 OK]
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-gray-500">{currentTime || '29/07/2026'}</span>
                                    <span className="font-bold text-amber-600 text-xs">SAP Business One</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </main>) : subHeaderTab === 'consulta-producto' ? (
                /* TAB 3: CONSULTA POR PRODUCTO (DATOS MAESTROS DE ARTÍCULO SAP) */
                <main className="flex-1 max-w-[1700px] w-full mx-auto p-2 md:p-3 flex flex-col gap-3 font-sans">
                    {/* SAP CLIENT WINDOW REPLICA CONTAINER */}
                    <div className="bg-[#eceae6] border border-[#a3a3a3] shadow-2xl flex flex-col font-sans select-none text-xs w-full text-black overflow-hidden relative">
                        
                        {/* SAP WINDOW TITLE BAR */}
                        <div className="bg-gradient-to-r from-[#eceae6] to-[#d6d3cc] px-3 py-1.5 flex items-center justify-between border-b border-[#a3a3a3]">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-amber-500 rounded-sm flex items-center justify-center text-[10px] text-white font-black select-none shadow-sm">
                                    S
                                </div>
                                <span className="font-semibold text-gray-800 text-[11px] tracking-wide">
                                    Datos maestros de artículo{activeItem.itemCode ? ` - ${activeItem.itemCode}` : ''}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {itemLoading && (
                                    <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse">
                                        <Loader2 size={12} className="animate-spin" />
                                        Consultando SAP B1...
                                    </span>
                                )}
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-300">
                                    SAP Conectado Live
                                </span>
                            </div>
                        </div>

                        {/* SAP GOLD SHARP ACCENT BORDER */}
                        <div className="h-[3px] bg-[#f4b000] w-full"></div>

                        {/* SAP WINDOW BODY */}
                        <div className="py-2 px-3 bg-[#f3f0ea] flex flex-col gap-2">

                            {/* HEADER DETAILS FORM WITH RED HIGHLIGHTED SEARCH FIELDS */}
                            <div className="bg-[#eceae6] p-2.5 border border-[#d0cdcf] rounded-none flex flex-col gap-3 shadow-inner">
                                
                                <div className="flex flex-wrap lg:flex-nowrap gap-x-8 gap-y-3 justify-between items-start">
                                    {/* LEFT COLUMN FIELDS */}
                                    <div className="space-y-1.5 shrink-0 max-w-xl w-full">
                                        
                                        {/* NÚMERO DE ARTÍCULO (SEARCHABLE - RED HIGHLIGHT BOX) */}
                                        <div className="flex items-center">
                                            <span className="w-[140px] shrink-0 text-[11px] font-bold text-gray-900 select-none flex items-center">
                                                Número de artículo <SapLinkArrow />
                                            </span>
                                            <div className="flex items-center gap-1 flex-1 relative">
                                                <div className="relative flex-1 p-0.5 rounded border-2 border-red-500 bg-red-50/20 shadow-sm transition-all focus-within:ring-2 focus-within:ring-red-400">
                                                    <input
                                                        type="text"
                                                        value={itemCodeInput}
                                                        onChange={(e) => setItemCodeInput(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleItemSearch('code')}
                                                        className="w-full bg-[#fffde6] text-black text-xs font-mono font-bold px-2 py-1 outline-none border border-[#b2b2b2] rounded-none focus:bg-white select-text"
                                                        placeholder="Ej: VBAN01-0039-000-0100"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleItemSearch('code')}
                                                    disabled={itemLoading}
                                                    className="bg-[#324354] hover:bg-[#253342] text-white px-2.5 py-1 text-xs font-bold transition-colors flex items-center gap-1 shadow-sm shrink-0"
                                                    title="Buscar por Número de artículo"
                                                >
                                                    <Search size={13} />
                                                    <span>Buscar</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* DESCRIPCIÓN (SEARCHABLE - RED HIGHLIGHT BOX) */}
                                        <div className="flex items-center">
                                            <span className="w-[140px] shrink-0 text-[11px] font-bold text-gray-900 select-none">Descripción</span>
                                            <div className="flex items-center gap-1 flex-1">
                                                <div className="relative flex-1 p-0.5 rounded border-2 border-red-500 bg-red-50/20 shadow-sm transition-all focus-within:ring-2 focus-within:ring-red-400">
                                                    <input
                                                        type="text"
                                                        value={itemNameInput}
                                                        onChange={(e) => setItemNameInput(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleItemSearch('name')}
                                                        className="w-full bg-[#fffde6] text-black text-xs font-medium px-2 py-1 outline-none border border-[#b2b2b2] rounded-none focus:bg-white select-text"
                                                        placeholder="Ej: LAVAMANOS SIENA 79X48"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleItemSearch('name')}
                                                    disabled={itemLoading}
                                                    className="bg-[#324354] hover:bg-[#253342] text-white px-2.5 py-1 text-xs font-bold transition-colors flex items-center gap-1 shadow-sm shrink-0"
                                                    title="Buscar por Descripción de artículo"
                                                >
                                                    <Search size={13} />
                                                    <span>Buscar</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* COINCIDENCIAS DE BÚSQUEDA */}
                                        {itemMatches.length > 1 && (
                                            <div className="ml-[140px] bg-white border border-amber-300 p-1.5 shadow-md max-h-36 overflow-y-auto text-[11px]">
                                                <span className="font-bold text-amber-800 block mb-1">Coincidencias encontradas en SAP ({itemMatches.length}):</span>
                                                <div className="space-y-0.5">
                                                    {itemMatches.map((m, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => handleItemSearch('code', m.itemCode)}
                                                            className="hover:bg-amber-50 p-1 cursor-pointer rounded flex items-center justify-between border-b border-gray-100 font-sans"
                                                        >
                                                            <span className="font-mono font-bold text-blue-900">{m.itemCode}</span>
                                                            <span className="text-gray-700 truncate max-w-xs">{m.itemName}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}



                                        {/* Lista de precios */}
                                        <div className="flex items-center">
                                            <span className="w-[140px] shrink-0 text-[11px] text-gray-800 select-none">Lista de precios</span>
                                            <select disabled className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-48 rounded-none">
                                                <option>{activeItem.priceList}</option>
                                            </select>
                                            <span className="ml-3 text-[11px] text-gray-800 mr-1 select-none">Precio por unidad</span>
                                            <input
                                                type="text"
                                                value={activeItem.price}
                                                readOnly
                                                className="bg-white border border-[#b2b2b2] px-2 py-0.5 text-xs font-bold text-black w-36 text-right rounded-none select-text"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* TABS INTERNAS DE DATOS MAESTROS DE ARTÍCULO (SOLO INVENTARIO Y LISTA DE MATERIALES) */}
                            <div className="mt-1">
                                <div className="flex border-b border-[#a3a3a3] bg-[#e0ddd5] text-xs font-semibold overflow-x-auto scrollbar-hide">
                                    {[
                                        { id: 'inventario', label: 'Datos de inventario' },
                                        { id: 'lista-materiales', label: 'Lista de Materiales' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setItemInnerTab(tab.id as any)}
                                            className={`px-4 py-1.5 border-t border-l border-r border-[#a3a3a3] -mb-[1px] transition-colors whitespace-nowrap ${
                                                itemInnerTab === tab.id
                                                    ? 'bg-[#f3f0ea] border-b-[#f3f0ea] font-bold text-black shadow-sm'
                                                    : 'bg-[#d6d3cb] text-gray-700 hover:bg-[#e6e3db]'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* TAB CONTENT BODY */}
                                <div className="bg-[#f3f0ea] border-x border-b border-[#a3a3a3] p-2.5 min-h-[320px]">
                                    
                                    {/* PESTAÑA 1: DATOS DE INVENTARIO (RÉPLICA CON LAS 21 COLUMNAS EXACTAS DE SAP B1) */}
                                    {itemInnerTab === 'inventario' && (
                                        <div className="space-y-2 font-sans select-none text-[11px]">
                                            
                                            {/* SECCIÓN SUPERIOR DE CAMPOS CONFIGURATIVOS Y NIVEL DE STOCK */}
                                            <div className="flex flex-wrap lg:flex-nowrap justify-between gap-6 items-start bg-[#f3f0ea] p-1.5 border-b border-[#c8c5bc]">
                                                
                                                {/* IZQUIERDA: MÉTODOS Y UNIDADES DE MEDIDA */}
                                                <div className="space-y-1">
                                                    <div className="flex items-center">
                                                        <span className="w-36 text-gray-800">Fijar ctas de mayor según</span>
                                                        <select disabled className="bg-[#fcfdfd] border border-[#b2b2b2] px-1.5 py-0.5 text-xs text-black w-40 rounded-none focus:outline-none">
                                                            <option>Grupo de artículos</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <span className="w-36 text-gray-800">Nombre unid. de medida</span>
                                                        <input type="text" value={activeItem.inventoryUOM || ''} readOnly className="bg-[#fcfdfd] border border-[#b2b2b2] px-1.5 py-0.5 text-xs text-black w-40 rounded-none focus:outline-none" />
                                                    </div>
                                                    <div className="flex items-center">
                                                        <span className="w-36 text-gray-800">Peso</span>
                                                        <input type="text" value="" readOnly className="bg-[#fcfdfd] border border-[#b2b2b2] px-1.5 py-0.5 text-xs text-black w-40 rounded-none focus:outline-none" />
                                                    </div>
                                                    <div className="flex items-center pt-2">
                                                        <span className="w-36 text-gray-800">Método de valoración</span>
                                                        <select disabled className="bg-[#fcfdfd] border border-[#b2b2b2] px-1.5 py-0.5 text-xs text-black w-40 rounded-none focus:outline-none">
                                                            <option>{activeItem.itemCode ? 'Promedio ponderado' : ''}</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* DERECHA: GESTIÓN DE STOCKS Y NIVELES */}
                                                <div className="space-y-1">
                                                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-800">
                                                        <input type="checkbox" checked={Boolean(activeItem.itemCode)} readOnly className="w-3.5 h-3.5 text-amber-600 rounded-none" />
                                                        <span>Gestión de stocks por almacén</span>
                                                    </label>
                                                    <div className="pl-5 pt-1 space-y-1">
                                                        <span className="font-semibold text-gray-700 block border-b border-gray-300 pb-0.5 text-[10.5px]">Nivel de stock</span>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <span className="text-gray-800">Necesario (UdM de Compras)</span>
                                                            <input type="text" value="" readOnly className="bg-white border border-[#b2b2b2] px-1.5 py-0.5 text-xs text-black w-24 text-right rounded-none" />
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <span className="text-gray-800">Mínimo</span>
                                                            <input type="text" value="" readOnly className="bg-white border border-[#b2b2b2] px-1.5 py-0.5 text-xs text-black w-24 text-right rounded-none" />
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <span className="text-gray-800">Máximo</span>
                                                            <input type="text" value={activeItem.itemCode ? '22' : ''} readOnly className="bg-white border border-[#b2b2b2] px-1.5 py-0.5 text-xs font-semibold text-black w-24 text-right rounded-none" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* TABLA DE ALMACENES CON LAS 21 COLUMNAS COMPLETAS DE SAP B1 */}
                                            <div className="bg-white border border-[#a3a3a3] shadow-inner overflow-x-auto max-h-[350px] overflow-y-auto">
                                                <table className="w-full border-collapse text-[11px] font-sans table-auto whitespace-nowrap">
                                                    <thead className="sticky top-0 bg-[#eceae6] border-b border-[#c2c0bb] shadow-sm select-none z-10">
                                                        <tr className="text-gray-800 font-semibold">
                                                            <th className="px-1.5 py-1 border-r border-[#c2c0bb] text-center w-8">#</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left">Código de almacén</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left">Nombre del almacén</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-center">Bloqueado</th>
                                                            <th className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">En stock</th>
                                                            <th className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">Comprometido</th>
                                                            <th className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">Pedido</th>
                                                            <th className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">Disponible</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-right">Stock mínimo</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-right">Stock máximo</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-right">Nivel de stock necesario</th>
                                                            <th className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">Costo del artículo</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-center">Cuerpo</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-center">Modulo</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-center">Piso</th>
                                                            <th className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">Disp Real</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-center">Amortiguador TOC</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-right">MINORDRQTY</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-right">Tiempo Lead</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-right">Reabastecimiento Mínimo</th>
                                                            <th className="px-2 py-1 text-center">Tiempo de Reabastecimiento</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[#e0ddd5]">
                                                        {activeItem.warehouses && activeItem.warehouses.length > 0 ? (
                                                            activeItem.warehouses.map((wh, idx) => {
                                                                const disp = wh.available !== undefined ? wh.available : (wh.inStock - wh.committed + wh.ordered);
                                                                const dispReal = wh.dispReal !== undefined ? wh.dispReal : disp;
                                                                const isHighlight = wh.warehouseCode === 'PT-02';
                                                                return (
                                                                    <tr 
                                                                        key={idx} 
                                                                        className={`h-5 hover:bg-[#fff9e6] ${isHighlight ? 'bg-amber-100/60 font-bold' : idx % 2 === 0 ? 'bg-white' : 'bg-[#faf9f5]'}`}
                                                                    >
                                                                        <td className="px-1.5 py-0.5 border-r border-[#e0ddd5] text-center text-gray-600">{idx + 1}</td>
                                                                        <td className="px-2 py-0.5 border-r border-[#e0ddd5] font-mono text-gray-900">
                                                                            <span className="flex items-center gap-1">
                                                                                <SapLinkArrow />
                                                                                <span>{wh.warehouseCode}</span>
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-gray-800">{wh.warehouseName || wh.warehouseCode}</td>
                                                                        <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-center">
                                                                            <input type="checkbox" checked={wh.locked || false} readOnly className="w-3 h-3 text-amber-600 rounded-none" />
                                                                        </td>
                                                                        <td className="px-2.5 py-0.5 border-r border-[#e0ddd5] text-right font-mono text-black">{wh.inStock > 0 ? wh.inStock : ''}</td>
                                                                        <td className="px-2.5 py-0.5 border-r border-[#e0ddd5] text-right font-mono text-black">{wh.committed > 0 ? wh.committed : ''}</td>
                                                                        <td className="px-2.5 py-0.5 border-r border-[#e0ddd5] text-right font-mono text-black">{wh.ordered > 0 ? wh.ordered : ''}</td>
                                                                        <td className="px-2.5 py-0.5 border-r border-[#e0ddd5] text-right font-mono text-black font-semibold">{disp !== 0 ? disp : ''}</td>
                                                                        <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-right font-mono text-gray-600">{wh.minStock && wh.minStock > 0 ? wh.minStock : ''}</td>
                                                                        <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-right font-mono text-gray-600">{wh.maxStock && wh.maxStock > 0 ? wh.maxStock : ''}</td>
                                                                        <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-right font-mono text-gray-600">{wh.requiredStock && wh.requiredStock > 0 ? wh.requiredStock : ''}</td>
                                                                        <td className="px-2.5 py-0.5 border-r border-[#e0ddd5] text-right font-mono text-gray-700">{wh.itemCost && wh.itemCost > 0 ? wh.itemCost.toLocaleString('es-CO', { minimumFractionDigits: 2 }) : ''}</td>
                                                                        <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-center"></td>
                                                                        <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-center"></td>
                                                                        <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-center"></td>
                                                                        <td className="px-2.5 py-0.5 border-r border-[#e0ddd5] text-right font-mono text-black font-semibold">{dispReal.toFixed(2)}</td>
                                                                        <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-center font-mono">{wh.amortiguadorToc || ''}</td>
                                                                        <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-right font-mono">{wh.minOrderQty && wh.minOrderQty > 0 ? wh.minOrderQty : ''}</td>
                                                                        <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-right font-mono">{wh.leadTime && wh.leadTime > 0 ? wh.leadTime : ''}</td>
                                                                        <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-right font-mono">{wh.reabastecimientoMin && wh.reabastecimientoMin > 0 ? wh.reabastecimientoMin : ''}</td>
                                                                        <td className="px-2 py-0.5 text-center font-mono">{wh.tiempoReabastecimiento || ''}</td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={21} className="py-6 text-center text-gray-500 italic">
                                                                    No hay almacenes registrados para este artículo.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                    {/* FILA CONSOLIDADA DE TOTALES DE SAP B1 */}
                                                    <tfoot className="sticky bottom-0 bg-[#eceae6] border-t-2 border-[#a3a3a3] font-bold font-mono text-[11px] z-10 text-black">
                                                        <tr>
                                                            <td className="px-1.5 py-1 border-r border-[#c2c0bb] text-center"></td>
                                                            <td className="px-2 py-1 border-r border-[#c2c0bb]"></td>
                                                            <td className="px-2 py-1 border-r border-[#c2c0bb]"></td>
                                                            <td className="px-2 py-1 border-r border-[#c2c0bb]"></td>
                                                            <td className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">{activeItem.warehouses.reduce((acc, curr) => acc + curr.inStock, 0) || activeItem.quantityOnStock}</td>
                                                            <td className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">{activeItem.warehouses.reduce((acc, curr) => acc + curr.committed, 0) || activeItem.quantityOrderedByCustomers}</td>
                                                            <td className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">{activeItem.warehouses.reduce((acc, curr) => acc + curr.ordered, 0) || activeItem.quantityOrderedFromVendors}</td>
                                                            <td className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">
                                                                {activeItem.warehouses.reduce((acc, curr) => acc + (curr.available !== undefined ? curr.available : (curr.inStock - curr.committed + curr.ordered)), 0) || (activeItem.quantityOnStock - activeItem.quantityOrderedByCustomers + activeItem.quantityOrderedFromVendors)}
                                                            </td>
                                                            <td className="px-2 py-1 border-r border-[#c2c0bb]" colSpan={13}></td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        <div className="flex justify-end pt-1">
                                                <button disabled className="bg-[#dedbd5] border border-[#a3a3a3] px-3 py-0.5 text-xs text-gray-700 font-medium cursor-not-allowed shadow-xs hover:bg-gray-200">
                                                    Fijar almacén estándar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* PESTAÑA 2: LISTA DE MATERIALES (RÉPLICA EXACTA DE LA VENTANA 'LISTA DE MATERIALES' DE SAP B1 - IMÁGENES 1 Y 2) */}
                                    {itemInnerTab === 'lista-materiales' && (
                                        <div className="bg-[#f3f0ea] border border-[#a3a3a3] shadow-sm font-sans text-[11px] select-none">
                                            
                                            {/* TABLA DE COMPONENTES LdM (LAS 16 COLUMNAS IDÉNTICAS A IMÁGENES 1 Y 2 DE SAP B1) */}
                                            <div className="bg-white border border-[#a3a3a3] shadow-inner overflow-x-auto max-h-[300px] overflow-y-auto">
                                                <table className="w-full border-collapse text-[11px] font-sans table-auto whitespace-nowrap">
                                                    <thead className="sticky top-0 bg-[#eceae6] border-b border-[#c2c0bb] shadow-sm select-none z-10">
                                                        <tr className="text-gray-800 font-semibold">
                                                            <th className="px-1.5 py-1 border-r border-[#c2c0bb] text-center w-8">#</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left">Tipo</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left">Nº</th>
                                                            <th className="px-2.5 py-1 border-r border-[#c2c0bb] text-left">Descripción</th>
                                                            <th className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">Cantidad</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left">Nombre de unidad de medida</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left">Almacén</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-center">Método emisión</th>
                                                            <th className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">Costo estándar de producción</th>
                                                            <th className="px-2.5 py-1 border-r border-[#c2c0bb] text-left">Lista de precios</th>
                                                            <th className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">Costo estándar de producción total</th>
                                                            <th className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">Precio unitario</th>
                                                            <th className="px-2.5 py-1 border-r border-[#c2c0bb] text-right">Total</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left">Comentarios</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-center">Cta.WIP</th>
                                                            <th className="px-2 py-1 text-center">Secuen...</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[#e0ddd5]">
                                                        {activeItem.itemCode ? (
                                                            BOM_SAMPLE_DATA.map((row, idx) => (
                                                                <tr key={idx} className="h-5 hover:bg-[#fff9e6]">
                                                                    <td className="px-1.5 py-0.5 border-r border-[#e0ddd5] text-center text-gray-600">{row.id}</td>
                                                                    <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-gray-800">{row.tipo}</td>
                                                                    <td className="px-2 py-0.5 border-r border-[#e0ddd5] font-mono text-gray-900">
                                                                        <span className="flex items-center gap-1">
                                                                            <SapLinkArrow />
                                                                            <span>{row.no}</span>
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-2.5 py-0.5 border-r border-[#e0ddd5] text-gray-900 font-medium">{row.descripcion}</td>
                                                                    <td className="px-2.5 py-0.5 border-r border-[#e0ddd5] text-right font-mono font-bold text-black">{row.cantidad}</td>
                                                                    <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-gray-800">{row.uom}</td>
                                                                    <td className="px-2 py-0.5 border-r border-[#e0ddd5] font-mono text-amber-900">
                                                                        <span className="flex items-center gap-1">
                                                                            <SapLinkArrow />
                                                                            <span>{row.almacen}</span>
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-center text-gray-700">{row.metodoEmision}</td>
                                                                    <td className="px-2.5 py-0.5 border-r border-[#e0ddd5] text-right font-mono text-gray-500">{row.costoEst}</td>
                                                                    <td className="px-2.5 py-0.5 border-r border-[#e0ddd5] text-gray-700">{row.listaPrecios}</td>
                                                                    <td className="px-2.5 py-0.5 border-r border-[#e0ddd5] text-right font-mono text-gray-500">{row.costoEstTotal}</td>
                                                                    <td className="px-2.5 py-0.5 border-r border-[#e0ddd5] text-right font-mono text-gray-900 font-semibold">{row.precioUnitario}</td>
                                                                    <td className="px-2.5 py-0.5 border-r border-[#e0ddd5] text-right font-mono text-gray-900 font-bold">{row.total}</td>
                                                                    <td className="px-2 py-0.5 border-r border-[#e0ddd5]"></td>
                                                                    <td className="px-2 py-0.5 border-r border-[#e0ddd5] text-center font-mono text-gray-600">{row.ctaWip}</td>
                                                                    <td className="px-2 py-0.5 text-center"></td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={16} className="py-6 text-center text-gray-500 italic font-sans">
                                                                    No hay componentes registrados. Realiza una búsqueda por número o descripción de artículo.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                    {/* FILA DE TOTALES CONSOLIDADOS AL PIE DE LA TABLA */}
                                                    <tfoot className="sticky bottom-0 bg-[#eceae6] border-t-2 border-[#a3a3a3] font-bold font-mono text-[11px] z-10 text-black">
                                                        <tr>
                                                            <td colSpan={10} className="px-2 py-1 border-r border-[#c2c0bb] text-right text-gray-600 font-sans">Totales:</td>
                                                            <td className="px-2.5 py-1 border-r border-[#c2c0bb] text-right font-mono">{activeItem.itemCode ? '$ 0.00' : ''}</td>
                                                            <td className="px-2.5 py-1 border-r border-[#c2c0bb] text-right"></td>
                                                            <td className="px-2.5 py-1 border-r border-[#c2c0bb] text-right font-mono text-emerald-800">{activeItem.itemCode ? '$ 10,723.40' : ''}</td>
                                                            <td colSpan={3} className="px-2 py-1"></td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>

                                            {/* PIE DE FORMULARIO: PRECIO DE PRODUCTO Y BOTONES OK/CANCELAR */}
                                            <div className="p-2 bg-[#f3f0ea] flex items-center justify-between border-t border-[#c8c5bc]">
                                                <div className="flex items-center gap-2">
                                                    <button disabled className="bg-[#dedbd5] border border-[#a3a3a3] px-4 py-0.5 text-xs font-bold text-gray-800 cursor-not-allowed shadow-xs hover:bg-gray-200">
                                                        OK
                                                    </button>
                                                    <button disabled className="bg-[#dedbd5] border border-[#a3a3a3] px-3 py-0.5 text-xs text-gray-700 cursor-not-allowed shadow-xs hover:bg-gray-200">
                                                        Cancelar
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-800 font-semibold">Precio de producto</span>
                                                    <input type="text" value={activeItem.price || ''} readOnly className="bg-white border border-[#b2b2b2] px-2 py-0.5 text-xs font-mono font-bold text-black w-32 text-right rounded-none" />
                                                </div>
                                            </div>

                                        </div>
                                    )}

                                </div>
                            </div>

                            {/* SAP BOTTOM FOOTER BAR */}
                            <div className="bg-[#eceae6] border border-[#a3a3a3] px-3 py-1 flex items-center justify-between text-[11px] text-gray-700 mt-1">
                                <div className="flex items-center gap-4">
                                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                        Artículo consultado desde SAP B1 Service Layer
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-gray-500">{currentTime || '2026-07-28'}</span>
                                    <span className="font-bold text-amber-600 text-xs">SAP Business One</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </main>
            ) : null}
        </div>
    )
}
